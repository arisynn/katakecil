package id.karisyono.katakecil.data.epub

import id.karisyono.katakecil.core.model.BookMeta
import id.karisyono.katakecil.core.model.Chapter
import id.karisyono.katakecil.core.model.LocalBookRecord
import id.karisyono.katakecil.domain.reader.TextAnchorEngine
import org.w3c.dom.Document
import org.w3c.dom.Element
import org.w3c.dom.Node
import org.xml.sax.InputSource
import java.io.ByteArrayInputStream
import java.io.ByteArrayOutputStream
import java.io.StringReader
import java.net.URLDecoder
import java.time.Instant
import java.util.Base64
import java.util.zip.ZipInputStream
import javax.xml.parsers.DocumentBuilderFactory

/**
 * Complete Kotlin Native port of dist/epub.js (PARSER_REVISION = 8) & dist/local-books.js.
 * Parses DRM-free EPUB 2 & EPUB 3 archives with strict ZIP safety bounds, TOC/NCX/Nav resolution,
 * Arc & Episode label normalization, front-matter filtering, cover extraction, and SHA-256 hashing.
 */
object EpubParser {
    const val PARSER_REVISION = 8
    const val MAX_EPUB_BYTES = 30 * 1024 * 1024 // 30 MB
    const val MAX_ZIP_ENTRIES = 5_000
    const val MAX_UNCOMPRESSED_BYTES = 100 * 1024 * 1024 // 100 MB
    const val MAX_SINGLE_ENTRY_BYTES = 16 * 1024 * 1024 // 16 MB
    const val MAX_COVER_BYTES = 5 * 1024 * 1024 // 5 MB

    private val ALLOWED_COVER_MIMES = setOf(
        "image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"
    )

    private val ARC_HEADING_REGEX = Regex(
        "^(?:ARC|BAGIAN|PART|BOOK|BUKU|VOLUME|ACT)\\s+([0-9IVXLCDM]+)(?:\\s*[:\\-–—.]\\s*(.+))?$",
        RegexOption.IGNORE_CASE
    )

    private val CHAPTER_HEADING_REGEX = Regex(
        "^(?:(EPISODE|BAB|CHAPTER|BAGIAN)\\s+(\\d+)|(?:(PROLOG|PROLOGUE|EPILOG|EPILOGUE|INTERLUDE|SELINGAN)))(?:\\s*[:\\-–—.]\\s*(.*))?$",
        RegexOption.IGNORE_CASE
    )

    private val FRONT_MATTER_TITLE_REGEX = Regex(
        "^(?:cover|sampul|title\\s*page|halaman\\s*judul|copyright|hak\\s*cipta|colophon|table\\s*of\\s*contents|contents|daftar\\s*isi|toc|about\\s*the\\s*author|tentang\\s*penulis|acknowledg?ments?|ucapan\\s*terima\\s*kasih|dedication|persembahan|imprint|frontmatter|halftitle)$",
        RegexOption.IGNORE_CASE
    )

    data class ManifestItem(
        val id: String,
        val href: String,
        val resolvedPath: String,
        val mediaType: String,
        val properties: String = ""
    )

    data class TocEntry(
        val title: String,
        val path: String,
        val fragment: String,
        val arc: String = ""
    )

    fun parseLocalEpub(
        bytes: ByteArray,
        fallbackFileName: String = "book.epub"
    ): LocalBookRecord {
        if (bytes.isEmpty()) {
            throw IllegalArgumentException("File EPUB kosong.")
        }
        if (bytes.size > MAX_EPUB_BYTES) {
            throw IllegalArgumentException("Ukuran EPUB melebihi batas maksimal 30 MB.")
        }

        val sha256 = TextAnchorEngine.sha256Hex(bytes)
        val bookId = "import-${sha256.take(24)}"
        val entries = readSafeZipEntries(bytes)

        // Check DRM
        val encryptionXml = entries["META-INF/encryption.xml"]?.let { String(it, Charsets.UTF_8) }
        if (encryptionXml != null && encryptionXml.contains("EncryptedData", ignoreCase = true)) {
            if (!encryptionXml.contains("idpf.org/2008/embedding", ignoreCase = true)) {
                throw IllegalArgumentException("EPUB ini dilindungi DRM dan tidak dapat dibuka.")
            }
        }

        val containerBytes = entries["META-INF/container.xml"]
            ?: entries.entries.firstOrNull { it.key.equals("META-INF/container.xml", ignoreCase = true) }?.value
            ?: throw IllegalArgumentException("Bukan file EPUB yang valid (META-INF/container.xml tidak ditemukan).")

        val containerDoc = parseXmlSafely(String(containerBytes, Charsets.UTF_8))
        val rootfiles = containerDoc.getElementsByTagName("rootfile")
        var opfPath = ""
        for (i in 0 until rootfiles.length) {
            val el = rootfiles.item(i) as? Element ?: continue
            val fullPath = el.getAttribute("full-path").trim()
            if (fullPath.isNotEmpty()) {
                opfPath = normalizeArchivePath(fullPath)
                break
            }
        }
        if (opfPath.isEmpty()) {
            opfPath = entries.keys.firstOrNull { it.endsWith(".opf", ignoreCase = true) }
                ?: throw IllegalArgumentException("File OPF tidak ditemukan di dalam EPUB.")
        }

        val opfBytes = entries[opfPath]
            ?: entries.entries.firstOrNull { it.key.equals(opfPath, ignoreCase = true) }?.value
            ?: throw IllegalArgumentException("File paket OPF ($opfPath) tidak dapat dibaca.")

        val opfDir = opfPath.substringBeforeLast('/', "")
        val opfDoc = parseXmlSafely(String(opfBytes, Charsets.UTF_8))

        val rawTitle = firstTagText(opfDoc, listOf("dc:title", "title"))
            .ifBlank { fallbackFileName.removeSuffix(".epub").removeSuffix(".EPUB").replace('_', ' ') }
            .trim()
        val rawAuthor = firstTagText(opfDoc, listOf("dc:creator", "creator"))
            .ifBlank { "Penulis Tidak Diketahui" }
            .trim()
        val rawLanguage = firstTagText(opfDoc, listOf("dc:language", "language"))
            .ifBlank { "id" }
            .trim()
            .lowercase()

        // Parse manifest
        val manifestById = LinkedHashMap<String, ManifestItem>()
        val manifestByPath = LinkedHashMap<String, ManifestItem>()
        val itemNodes = opfDoc.getElementsByTagName("item")
        for (i in 0 until itemNodes.length) {
            val el = itemNodes.item(i) as? Element ?: continue
            val id = el.getAttribute("id").trim()
            val hrefRaw = decodeUrlComponent(el.getAttribute("href").trim())
            if (hrefRaw.isEmpty()) continue
            val resolved = resolveRelativePath(opfDir, hrefRaw.substringBefore('#'))
            val mediaType = el.getAttribute("media-type").trim().lowercase()
            val props = el.getAttribute("properties").trim()
            val item = ManifestItem(
                id = id.ifEmpty { "item_$i" },
                href = hrefRaw,
                resolvedPath = resolved,
                mediaType = mediaType,
                properties = props
            )
            manifestById[item.id] = item
            manifestByPath[resolved] = item
        }

        // Parse spine
        val spineItems = mutableListOf<ManifestItem>()
        var tocIdAttr = ""
        val spineNodes = opfDoc.getElementsByTagName("spine")
        if (spineNodes.length > 0) {
            val spineEl = spineNodes.item(0) as? Element
            tocIdAttr = spineEl?.getAttribute("toc")?.trim() ?: ""
        }
        val itemrefNodes = opfDoc.getElementsByTagName("itemref")
        for (i in 0 until itemrefNodes.length) {
            val el = itemrefNodes.item(i) as? Element ?: continue
            val idref = el.getAttribute("idref").trim()
            val linear = el.getAttribute("linear").trim().lowercase()
            if (linear == "no") continue
            manifestById[idref]?.let { spineItems.add(it) }
        }
        if (spineItems.isEmpty()) {
            spineItems.addAll(
                manifestById.values.filter {
                    it.mediaType.contains("html") || it.resolvedPath.endsWith(".xhtml", true) || it.resolvedPath.endsWith(".html", true)
                }
            )
        }

        // Parse TOC (EPUB 3 nav first, then NCX)
        val tocEntries = mutableListOf<TocEntry>()
        val navItem = manifestById.values.firstOrNull {
            it.properties.split(Regex("\\s+")).contains("nav")
        }
        if (navItem != null) {
            entries[navItem.resolvedPath]?.let { navBytes ->
                val navDir = navItem.resolvedPath.substringBeforeLast('/', "")
                tocEntries.addAll(parseEpub3Nav(String(navBytes, Charsets.UTF_8), navDir))
            }
        }
        if (tocEntries.isEmpty()) {
            val ncxItem = (if (tocIdAttr.isNotEmpty()) manifestById[tocIdAttr] else null)
                ?: manifestById.values.firstOrNull {
                    it.mediaType.contains("ncx") || it.resolvedPath.endsWith(".ncx", ignoreCase = true)
                }
            if (ncxItem != null) {
                entries[ncxItem.resolvedPath]?.let { ncxBytes ->
                    val ncxDir = ncxItem.resolvedPath.substringBeforeLast('/', "")
                    tocEntries.addAll(parseNcxToc(String(ncxBytes, Charsets.UTF_8), ncxDir))
                }
            }
        }

        // Extract cover
        val coverDataUrl = extractCoverDataUrl(opfDoc, opfDir, manifestById, spineItems, entries)

        // Extract chapters from spine items
        val extractedChapters = mutableListOf<Chapter>()
        var currentArc = ""

        for ((spineIdx, spineItem) in spineItems.withIndex()) {
            val rawHtmlBytes = entries[spineItem.resolvedPath]
                ?: entries.entries.firstOrNull { it.key.equals(spineItem.resolvedPath, ignoreCase = true) }?.value
                ?: continue
            val rawHtml = String(rawHtmlBytes, Charsets.UTF_8)
            val matchingTocs = tocEntries.filter { it.path.equals(spineItem.resolvedPath, ignoreCase = true) }

            val sections = extractSectionsFromHtml(
                rawHtml = rawHtml,
                spineItem = spineItem,
                matchingTocs = matchingTocs,
                spineIdx = spineIdx
            )

            for (sec in sections) {
                if (sec.arc.isNotBlank()) {
                    currentArc = sec.arc
                }
                val detectedArc = detectArcTitle(sec.title)
                if (detectedArc != null && sec.paragraphs.size <= 2 && sec.text.length < 180) {
                    currentArc = detectedArc
                    continue
                }
                if (isFrontMatterSection(sec.title, sec.text, spineIdx, extractedChapters.size)) {
                    continue
                }
                val normalized = normalizeChapterMetadata(
                    rawTitle = sec.title,
                    paragraphs = sec.paragraphs,
                    arc = sec.arc.ifBlank { currentArc },
                    chapterNumber = extractedChapters.size + 1,
                    href = spineItem.href
                )
                if (normalized.text.isNotBlank()) {
                    extractedChapters.add(normalized)
                }
            }
        }

        // Fallback if front-matter filter was too aggressive on a 1-chapter short EPUB
        if (extractedChapters.isEmpty()) {
            for ((spineIdx, spineItem) in spineItems.withIndex()) {
                val rawHtmlBytes = entries[spineItem.resolvedPath] ?: continue
                val paragraphs = extractParagraphsFromHtml(String(rawHtmlBytes, Charsets.UTF_8))
                val joined = paragraphs.joinToString("\n\n").trim()
                if (joined.isNotBlank()) {
                    val idx = extractedChapters.size
                    val title = paragraphs.firstOrNull()?.takeIf { it.length <= 90 } ?: "Bagian ${idx + 1}"
                    val hash = TextAnchorEngine.sha256Hex(joined)
                    extractedChapters.add(
                        Chapter(
                            index = idx,
                            id = "local-ch-${idx + 1}",
                            title = title,
                            navigationTitle = title,
                            chapterLabel = "Episode ${idx + 1}",
                            arc = "",
                            href = spineItem.href,
                            text = joined,
                            paragraphs = paragraphs,
                            contentHash = hash,
                            length = joined.length
                        )
                    )
                }
            }
        }

        if (extractedChapters.isEmpty()) {
            throw IllegalArgumentException("EPUB tidak memiliki bab teks yang dapat dibaca.")
        }

        val finalChapters = extractedChapters.mapIndexed { idx, ch ->
            ch.copy(
                index = idx,
                id = ch.id.ifBlank { "section-${idx + 1}" }
            )
        }

        val now = Instant.now().toString()
        val meta = BookMeta(
            id = bookId,
            title = rawTitle,
            author = rawAuthor,
            language = if (rawLanguage.startsWith("en")) "en" else "id",
            coverUrl = coverDataUrl,
            originalCoverDataUrl = coverDataUrl,
            revision = sha256,
            sectionIds = finalChapters.map { it.id },
            source = "local",
            chapterCount = finalChapters.size,
            sizeBytes = bytes.size.toLong(),
            parserRevision = PARSER_REVISION,
            sha256 = sha256,
            importedAt = now,
            updatedAt = now
        )

        return LocalBookRecord(meta = meta, chapters = finalChapters)
    }

    private data class RawSection(
        val title: String,
        val paragraphs: List<String>,
        val text: String,
        val arc: String
    )

    private fun extractSectionsFromHtml(
        rawHtml: String,
        spineItem: ManifestItem,
        matchingTocs: List<TocEntry>,
        spineIdx: Int
    ): List<RawSection> {
        val fragmentTocs = matchingTocs.filter { it.fragment.isNotBlank() }
        if (fragmentTocs.size > 1) {
            val splitByFrag = splitHtmlByFragments(rawHtml, fragmentTocs)
            if (splitByFrag.isNotEmpty()) return splitByFrag
        }

        val tocTitle = matchingTocs.firstOrNull()?.title ?: ""
        val tocArc = matchingTocs.firstOrNull()?.arc ?: ""
        val headingTitle = extractFirstHeading(rawHtml)
        val paragraphs = extractParagraphsFromHtml(rawHtml)
        val cleanParagraphs = stripDuplicateLeadingHeading(paragraphs, tocTitle.ifBlank { headingTitle })
        val fullText = cleanParagraphs.joinToString("\n\n").trim()

        val effectiveTitle = when {
            tocTitle.isNotBlank() && !Regex("^Section\\s+\\d+$", RegexOption.IGNORE_CASE).matches(tocTitle) -> tocTitle
            headingTitle.isNotBlank() -> headingTitle
            tocTitle.isNotBlank() -> tocTitle
            else -> "Episode ${spineIdx + 1}"
        }

        return listOf(
            RawSection(
                title = effectiveTitle,
                paragraphs = cleanParagraphs,
                text = fullText,
                arc = tocArc
            )
        )
    }

    private fun splitHtmlByFragments(rawHtml: String, fragmentTocs: List<TocEntry>): List<RawSection> {
        data class FragPos(val toc: TocEntry, val charIndex: Int)
        val positions = fragmentTocs.mapNotNull { toc ->
            val idPattern = Regex("""\bid\s*=\s*["']${Regex.escape(toc.fragment)}["']""", RegexOption.IGNORE_CASE)
            val m = idPattern.find(rawHtml) ?: return@mapNotNull null
            val tagStart = rawHtml.lastIndexOf('<', m.range.first).coerceAtLeast(0)
            FragPos(toc, tagStart)
        }.sortedBy { it.charIndex }

        if (positions.isEmpty()) return emptyList()

        val result = mutableListOf<RawSection>()
        for (i in positions.indices) {
            val start = positions[i].charIndex
            val end = if (i + 1 < positions.size) positions[i + 1].charIndex else rawHtml.length
            val slice = rawHtml.substring(start, end)
            val paragraphs = stripDuplicateLeadingHeading(extractParagraphsFromHtml(slice), positions[i].toc.title)
            val text = paragraphs.joinToString("\n\n").trim()
            if (text.isNotBlank()) {
                result.add(
                    RawSection(
                        title = positions[i].toc.title,
                        paragraphs = paragraphs,
                        text = text,
                        arc = positions[i].toc.arc
                    )
                )
            }
        }
        return result
    }

    private fun normalizeChapterMetadata(
        rawTitle: String,
        paragraphs: List<String>,
        arc: String,
        chapterNumber: Int,
        href: String
    ): Chapter {
        var workingTitle = rawTitle.trim().replace(Regex("\\s+"), " ")
        var workingArc = arc.trim()
        var chapterLabel = "Episode $chapterNumber"

        // Check if title includes an ARC prefix e.g. "ARC 1:Awal — Episode 1: Judul"
        val match = CHAPTER_HEADING_REGEX.matchEntire(workingTitle)
        if (match != null) {
            val prefixWord = match.groupValues[1]
            val numberStr = match.groupValues[2]
            val specialWord = match.groupValues[3]
            val remainder = match.groupValues[4].trim()

            if (specialWord.isNotEmpty()) {
                chapterLabel = specialWord.replaceFirstChar { it.uppercase() }
                workingTitle = remainder.ifBlank { chapterLabel }
            } else if (prefixWord.isNotEmpty() && numberStr.isNotEmpty()) {
                chapterLabel = "Episode $numberStr"
                workingTitle = remainder.ifBlank { "Episode $numberStr" }
            }
        } else if (Regex("^Section\\s+\\d+$", RegexOption.IGNORE_CASE).matches(workingTitle)) {
            val firstLine = paragraphs.firstOrNull()?.trim() ?: ""
            if (firstLine.length in 3..80 && !firstLine.endsWith('.')) {
                workingTitle = firstLine
            } else {
                workingTitle = "Episode $chapterNumber"
            }
        }

        val cleanedParagraphs = stripDuplicateLeadingHeading(paragraphs, workingTitle)
            .let { stripDuplicateLeadingHeading(it, "$chapterLabel: $workingTitle") }
        val finalText = cleanedParagraphs.joinToString("\n\n").trim()
        val hash = TextAnchorEngine.sha256Hex(finalText)
        val navTitle = if (workingTitle.equals(chapterLabel, ignoreCase = true)) {
            chapterLabel
        } else {
            workingTitle
        }

        return Chapter(
            index = chapterNumber - 1,
            id = "section-$chapterNumber",
            title = workingTitle,
            navigationTitle = navTitle,
            chapterLabel = chapterLabel,
            arc = workingArc,
            href = href,
            text = finalText,
            paragraphs = cleanedParagraphs,
            contentHash = hash,
            length = finalText.length
        )
    }

    private fun detectArcTitle(title: String): String? {
        val trimmed = title.trim()
        val m = ARC_HEADING_REGEX.matchEntire(trimmed) ?: return null
        val num = m.groupValues[1]
        val sub = m.groupValues[2].trim()
        return if (sub.isNotEmpty()) "ARC $num — $sub" else "ARC $num"
    }

    private fun isFrontMatterSection(
        title: String,
        text: String,
        spineIdx: Int,
        acceptedSoFar: Int
    ): Boolean {
        if (text.isBlank()) return true
        val cleanTitle = title.trim()
        if (CHAPTER_HEADING_REGEX.matches(cleanTitle)) return false
        if (FRONT_MATTER_TITLE_REGEX.matches(cleanTitle) && text.length < 2500) {
            return true
        }
        if (spineIdx < 4 && acceptedSoFar == 0 && text.length < 420) {
            val lower = text.lowercase()
            if (lower.contains("hak cipta") ||
                lower.contains("all rights reserved") ||
                lower.contains("isbn") ||
                lower.contains("daftar isi") ||
                lower.contains("table of contents") ||
                lower.contains("diterbitkan oleh")
            ) {
                return true
            }
        }
        return false
    }

    private fun stripDuplicateLeadingHeading(paragraphs: List<String>, title: String): List<String> {
        if (paragraphs.size <= 1 || title.isBlank()) return paragraphs
        val first = paragraphs.first().trim()
        val normFirst = first.lowercase().replace(Regex("[^\\p{L}\\p{N}]+"), "")
        val normTitle = title.trim().lowercase().replace(Regex("[^\\p{L}\\p{N}]+"), "")
        if (normFirst.isNotEmpty() && (normFirst == normTitle || ARC_HEADING_REGEX.matches(first))) {
            return paragraphs.drop(1)
        }
        return paragraphs
    }

    private fun extractFirstHeading(html: String): String {
        val m = Regex("<h[1-3][^>]*>([\\s\\S]*?)</h[1-3]>", RegexOption.IGNORE_CASE).find(html)
            ?: return ""
        return decodeHtmlEntities(m.groupValues[1].replace(Regex("<[^>]+>"), " "))
            .replace(Regex("\\s+"), " ")
            .trim()
    }

    fun extractParagraphsFromHtml(html: String): List<String> {
        val withoutScripts = html
            .replace(Regex("<head[\\s\\S]*?</head>", RegexOption.IGNORE_CASE), "")
            .replace(Regex("<script[\\s\\S]*?</script>", RegexOption.IGNORE_CASE), "")
            .replace(Regex("<style[\\s\\S]*?</style>", RegexOption.IGNORE_CASE), "")
            .replace(Regex("<!--[\\s\\S]*?-->"), "")

        val withBreaks = withoutScripts
            .replace(Regex("<br\\s*/?>", RegexOption.IGNORE_CASE), "\n")
            .replace(
                Regex("</(?:p|div|h[1-6]|li|blockquote|section|article|tr|header)>", RegexOption.IGNORE_CASE),
                "\n\n"
            )

        val stripped = decodeHtmlEntities(withBreaks.replace(Regex("<[^>]+>"), ""))
            .replace("\r\n", "\n")
            .replace('\r', '\n')

        return stripped
            .split(Regex("\n\\s*\n+"))
            .map { block ->
                block.lines()
                    .map { it.replace(Regex("[ \\t]+"), " ").trim() }
                    .filter { it.isNotEmpty() }
                    .joinToString("\n")
            }
            .filter { it.isNotBlank() }
    }

    private fun parseEpub3Nav(navHtml: String, navDir: String): List<TocEntry> {
        val result = mutableListOf<TocEntry>()
        val navBlock = Regex(
            """<nav\b[^>]*(?:epub:type|role)\s*=\s*["'][^"']*(?:toc|doc-toc)[^"']*["'][^>]*>([\s\S]*?)</nav>""",
            RegexOption.IGNORE_CASE
        ).find(navHtml)?.groupValues?.get(1) ?: navHtml

        val linkRegex = Regex("""<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)</a>""", RegexOption.IGNORE_CASE)
        var currentArc = ""
        for (match in linkRegex.findAll(navBlock)) {
            val rawHref = decodeUrlComponent(match.groupValues[1].trim())
            val label = decodeHtmlEntities(match.groupValues[2].replace(Regex("<[^>]+>"), " "))
                .replace(Regex("\\s+"), " ")
                .trim()
            if (label.isEmpty()) continue
            val detectedArc = detectArcTitle(label)
            if (detectedArc != null) {
                currentArc = detectedArc
            }
            val pathPart = rawHref.substringBefore('#')
            val fragPart = rawHref.substringAfter('#', "")
            if (pathPart.isNotEmpty()) {
                result.add(
                    TocEntry(
                        title = label,
                        path = resolveRelativePath(navDir, pathPart),
                        fragment = fragPart,
                        arc = currentArc
                    )
                )
            }
        }
        return result
    }

    private fun parseNcxToc(ncxXml: String, ncxDir: String): List<TocEntry> {
        val result = mutableListOf<TocEntry>()
        return try {
            val doc = parseXmlSafely(ncxXml)
            val navMapList = doc.getElementsByTagName("navMap")
            if (navMapList.length == 0) return emptyList()
            val navMap = navMapList.item(0)
            fun walk(node: Node, activeArc: String) {
                val children = node.childNodes
                var currentArc = activeArc
                for (i in 0 until children.length) {
                    val child = children.item(i) as? Element ?: continue
                    if (child.tagName.endsWith("navPoint", ignoreCase = true)) {
                        val label = extractDirectNavLabel(child)
                        val src = extractDirectContentSrc(child)
                        val arcFromLabel = detectArcTitle(label)
                        val nextArc = arcFromLabel ?: currentArc
                        if (arcFromLabel != null) {
                            currentArc = arcFromLabel
                        }
                        if (src.isNotEmpty() && label.isNotEmpty()) {
                            val decodedSrc = decodeUrlComponent(src)
                            val pathPart = decodedSrc.substringBefore('#')
                            val fragPart = decodedSrc.substringAfter('#', "")
                            result.add(
                                TocEntry(
                                    title = label,
                                    path = resolveRelativePath(ncxDir, pathPart),
                                    fragment = fragPart,
                                    arc = nextArc
                                )
                            )
                        }
                        walk(child, nextArc)
                    }
                }
            }
            walk(navMap, "")
            result
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun extractDirectNavLabel(navPoint: Element): String {
        val nodes = navPoint.childNodes
        for (i in 0 until nodes.length) {
            val el = nodes.item(i) as? Element ?: continue
            if (el.tagName.endsWith("navLabel", ignoreCase = true)) {
                return el.textContent.replace(Regex("\\s+"), " ").trim()
            }
        }
        return ""
    }

    private fun extractDirectContentSrc(navPoint: Element): String {
        val nodes = navPoint.childNodes
        for (i in 0 until nodes.length) {
            val el = nodes.item(i) as? Element ?: continue
            if (el.tagName.endsWith("content", ignoreCase = true)) {
                return el.getAttribute("src").trim()
            }
        }
        return ""
    }

    private fun extractCoverDataUrl(
        opfDoc: Document,
        opfDir: String,
        manifestById: Map<String, ManifestItem>,
        spineItems: List<ManifestItem>,
        entries: Map<String, ByteArray>
    ): String {
        val candidatePaths = mutableListOf<Pair<String, String>>()

        // 1. manifest item with properties="cover-image"
        manifestById.values.firstOrNull {
            it.properties.split(Regex("\\s+")).contains("cover-image")
        }?.let { candidatePaths.add(it.resolvedPath to it.mediaType) }

        // 2. <meta name="cover" content="item-id" />
        val metaNodes = opfDoc.getElementsByTagName("meta")
        for (i in 0 until metaNodes.length) {
            val el = metaNodes.item(i) as? Element ?: continue
            if (el.getAttribute("name").equals("cover", ignoreCase = true)) {
                val contentId = el.getAttribute("content").trim()
                manifestById[contentId]?.let { candidatePaths.add(it.resolvedPath to it.mediaType) }
                if (contentId.contains('/') || contentId.endsWith(".jpg", true) || contentId.endsWith(".png", true)) {
                    candidatePaths.add(resolveRelativePath(opfDir, contentId) to guessImageMime(contentId))
                }
            }
        }

        // 3. <guide><reference type="cover" href="..." /></guide>
        val refNodes = opfDoc.getElementsByTagName("reference")
        for (i in 0 until refNodes.length) {
            val el = refNodes.item(i) as? Element ?: continue
            if (el.getAttribute("type").equals("cover", ignoreCase = true)) {
                val href = decodeUrlComponent(el.getAttribute("href").trim()).substringBefore('#')
                if (href.isNotEmpty()) {
                    val resolved = resolveRelativePath(opfDir, href)
                    candidatePaths.add(resolved to guessImageMime(resolved))
                }
            }
        }

        // 4. Manifest item whose id or href mentions "cover" and is an image
        manifestById.values.filter {
            (it.id.contains("cover", ignoreCase = true) || it.href.contains("cover", ignoreCase = true)) &&
                it.mediaType in ALLOWED_COVER_MIMES
        }.forEach { candidatePaths.add(it.resolvedPath to it.mediaType) }

        // 5. First spine XHTML if it wraps a cover image
        spineItems.firstOrNull()?.let { firstSpine ->
            candidatePaths.add(firstSpine.resolvedPath to firstSpine.mediaType)
        }

        for ((path, declaredMime) in candidatePaths) {
            val rawBytes = entries[path]
                ?: entries.entries.firstOrNull { it.key.equals(path, ignoreCase = true) }?.value
                ?: continue

            val mime = if (declaredMime in ALLOWED_COVER_MIMES) declaredMime else guessImageMime(path)
            if (mime in ALLOWED_COVER_MIMES) {
                if (rawBytes.size in 1..MAX_COVER_BYTES) {
                    val b64 = Base64.getEncoder().encodeToString(rawBytes)
                    return "data:$mime;base64,$b64"
                }
            } else if (path.endsWith(".xhtml", true) || path.endsWith(".html", true) || declaredMime.contains("html")) {
                val html = String(rawBytes, Charsets.UTF_8)
                val imgRef = Regex("""(?:<img\b[^>]*src|<image\b[^>]*(?:xlink:)?href)\s*=\s*["']([^"']+)["']""", RegexOption.IGNORE_CASE)
                    .find(html)?.groupValues?.get(1)
                if (!imgRef.isNullOrBlank()) {
                    val pageDir = path.substringBeforeLast('/', "")
                    val imgPath = resolveRelativePath(pageDir, decodeUrlComponent(imgRef).substringBefore('#'))
                    val imgBytes = entries[imgPath]
                        ?: entries.entries.firstOrNull { it.key.equals(imgPath, ignoreCase = true) }?.value
                    val imgMime = guessImageMime(imgPath)
                    if (imgBytes != null && imgBytes.size in 1..MAX_COVER_BYTES && imgMime in ALLOWED_COVER_MIMES) {
                        val b64 = Base64.getEncoder().encodeToString(imgBytes)
                        return "data:$imgMime;base64,$b64"
                    }
                }
            }
        }
        return ""
    }

    private fun guessImageMime(path: String): String {
        val lower = path.lowercase()
        return when {
            lower.endsWith(".png") -> "image/png"
            lower.endsWith(".webp") -> "image/webp"
            lower.endsWith(".gif") -> "image/gif"
            lower.endsWith(".jpg") || lower.endsWith(".jpeg") -> "image/jpeg"
            else -> ""
        }
    }

    private fun readSafeZipEntries(bytes: ByteArray): Map<String, ByteArray> {
        val result = LinkedHashMap<String, ByteArray>()
        var totalUncompressed = 0L
        var entryCount = 0

        ZipInputStream(ByteArrayInputStream(bytes)).use { zis ->
            val buffer = ByteArray(8192)
            while (true) {
                val entry = zis.nextEntry ?: break
                entryCount++
                if (entryCount > MAX_ZIP_ENTRIES) {
                    throw IllegalArgumentException("EPUB memiliki terlalu banyak entri ZIP (> $MAX_ZIP_ENTRIES).")
                }
                val rawName = entry.name ?: continue
                if (!isSafeArchivePath(rawName)) {
                    throw IllegalArgumentException("EPUB mengandung path entri tidak aman: $rawName")
                }
                if (entry.isDirectory) {
                    zis.closeEntry()
                    continue
                }
                val normName = normalizeArchivePath(rawName)
                val out = ByteArrayOutputStream()
                var entrySize = 0
                while (true) {
                    val read = zis.read(buffer)
                    if (read <= 0) break
                    entrySize += read
                    totalUncompressed += read
                    if (entrySize > MAX_SINGLE_ENTRY_BYTES) {
                        throw IllegalArgumentException("Entri di dalam EPUB melebihi batas 16 MB: $normName")
                    }
                    if (totalUncompressed > MAX_UNCOMPRESSED_BYTES) {
                        throw IllegalArgumentException("Ukuran total konten EPUB melebihi batas aman 100 MB.")
                    }
                    out.write(buffer, 0, read)
                }
                result[normName] = out.toByteArray()
                zis.closeEntry()
            }
        }
        return result
    }

    fun isSafeArchivePath(rawPath: String): Boolean {
        if (rawPath.isBlank()) return false
        if (rawPath.startsWith("/") || rawPath.startsWith("\\")) return false
        if (rawPath.contains('\\')) return false
        if (Regex("^[a-zA-Z]:").containsMatchIn(rawPath)) return false
        val segments = rawPath.split('/')
        return segments.none { it == ".." || it.contains('\u0000') }
    }

    fun normalizeArchivePath(path: String): String {
        val parts = mutableListOf<String>()
        for (seg in path.replace('\\', '/').split('/')) {
            if (seg.isEmpty() || seg == ".") continue
            if (seg == "..") {
                if (parts.isNotEmpty()) parts.removeAt(parts.lastIndex)
            } else {
                parts.add(seg)
            }
        }
        return parts.joinToString("/")
    }

    private fun resolveRelativePath(baseDir: String, relativeHref: String): String {
        return if (baseDir.isEmpty()) {
            normalizeArchivePath(relativeHref)
        } else {
            normalizeArchivePath("$baseDir/$relativeHref")
        }
    }

    private fun decodeUrlComponent(s: String): String {
        return try {
            URLDecoder.decode(s, "UTF-8")
        } catch (_: Exception) {
            s
        }
    }

    private fun parseXmlSafely(xml: String): Document {
        val factory = DocumentBuilderFactory.newInstance().apply {
            isNamespaceAware = false
            isValidating = false
            runCatching { setFeature("http://apache.org/xml/features/disallow-doctype-decl", false) }
            runCatching { setFeature("http://xml.org/sax/features/external-general-entities", false) }
            runCatching { setFeature("http://xml.org/sax/features/external-parameter-entities", false) }
            runCatching { setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false) }
        }
        val builder = factory.newDocumentBuilder()
        builder.setEntityResolver { _, _ -> InputSource(StringReader("")) }
        val sanitized = xml.trimStart('\uFEFF', ' ', '\t', '\r', '\n')
        return builder.parse(InputSource(StringReader(sanitized)))
    }

    private fun firstTagText(doc: Document, tagNames: List<String>): String {
        for (name in tagNames) {
            val list = doc.getElementsByTagName(name)
            for (i in 0 until list.length) {
                val text = list.item(i)?.textContent?.trim() ?: ""
                if (text.isNotEmpty()) return text
            }
        }
        return ""
    }

    fun decodeHtmlEntities(input: String): String {
        if (!input.contains('&')) return input
        return input
            .replace("&nbsp;", " ")
            .replace("&amp;", "&")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&quot;", "\"")
            .replace("&apos;", "'")
            .replace("&#39;", "'")
            .replace("&mdash;", "—")
            .replace("&ndash;", "–")
            .replace("&hellip;", "…")
            .replace("&ldquo;", "“")
            .replace("&rdquo;", "”")
            .replace("&lsquo;", "‘")
            .replace("&rsquo;", "’")
            .replace(Regex("&#(\\d+);")) { m ->
                val code = m.groupValues[1].toIntOrNull()
                if (code != null && code in 1..0x10FFFF) String(Character.toChars(code)) else m.value
            }
            .replace(Regex("&#x([0-9a-fA-F]+);")) { m ->
                val code = m.groupValues[1].toIntOrNull(16)
                if (code != null && code in 1..0x10FFFF) String(Character.toChars(code)) else m.value
            }
    }
}
