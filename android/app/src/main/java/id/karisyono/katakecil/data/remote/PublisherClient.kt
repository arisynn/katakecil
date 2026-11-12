package id.karisyono.katakecil.data.remote

import id.karisyono.katakecil.data.epub.EpubParser
import id.karisyono.katakecil.domain.reader.TextAnchorEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.io.BufferedReader
import java.io.ByteArrayOutputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.Normalizer
import java.time.Instant
import java.util.UUID

/**
 * Native Kotlin implementation of dist/publisher-client.js, dist/publisher-import.js, and dist/publisher.js.
 * Connects to Supabase Auth and the katakecil-publisher Edge Function for book & episode publishing.
 */
class PublisherClient {

    companion object {
        const val PROJECT_URL = "https://hrbcwymdqigtfmpmsdsi.supabase.co"
        const val PUBLIC_KEY = "sb_publishable_lttlEUXKFSzkOk9Jizy8TQ_dXdS1ex-"
        const val PUBLISHER_URL = "$PROJECT_URL/functions/v1/katakecil-publisher"
        const val MAX_IMPORT_BYTES = 18 * 1024 * 1024 // 18 MB
    }

    @Serializable
    data class PublisherSection(
        val id: String,
        val title: String,
        val content_html: String,
        val is_enabled: Boolean = true,
        val release_at: String? = null,
        val position: Int = 0,
        val kind: String = "episode"
    )

    @Serializable
    data class PublisherBookSummary(
        val id: String,
        val title: String,
        val author: String = "",
        val language: String = "id",
        val status: String = "ongoing", // "ongoing" or "completed"
        val cover_url: String = "",
        val published_revision: String = "",
        val updated_at: String = "",
        val section_count: Int = 0
    )

    data class PublisherBookDetail(
        val book: PublisherBookSummary,
        val sections: List<PublisherSection>
    )

    data class ImportedChapterPart(
        val title: String,
        val contentHtml: String,
        val kind: String, // "episode" or "page"
        val label: String,
        val target: String = "new" // "new", "skip", "?", or existing section UUID
    )

    data class PlannedChange(
        val id: String,
        val title: String,
        val action: String // "add" or "replace"
    )

    data class PublicationPlan(
        val book: PublisherBookSummary,
        val sections: List<PublisherSection>,
        val changes: List<PlannedChange>
    )

    private var accessToken: String = ""
    private var publisherKey: String = ""
    var currentUserEmail: String = ""
        private set

    val isAuthenticated: Boolean
        get() = accessToken.isNotBlank() || publisherKey.isNotBlank()

    private fun currentBearer(): String {
        return publisherKey.ifBlank { accessToken }
    }

    suspend fun loginWithPassword(email: String, password: String) = withContext(Dispatchers.IO) {
        publisherKey = ""
        val url = "$PROJECT_URL/auth/v1/token?grant_type=password"
        val payload = buildJsonObject {
            put("email", email.trim())
            put("password", password)
        }.toString()
        val (status, body) = rawHttp("POST", url, mapOf("apikey" to PUBLIC_KEY), payload.toByteArray())
        if (status !in 200..299) {
            val err = extractError(body) ?: "Gagal masuk ($status)."
            throw IllegalStateException(err)
        }
        val root = Json.parseToJsonElement(body).jsonObject
        val token = root["access_token"]?.jsonPrimitive?.contentOrNull ?: ""
        if (token.isBlank()) throw IllegalStateException("Token sesi tidak ditemukan.")
        accessToken = token
        currentUserEmail = email.trim()
        requestJson("status")
    }

    suspend fun loginWithKey(key: String) = withContext(Dispatchers.IO) {
        val trimmed = key.trim()
        if (trimmed.isEmpty()) throw IllegalArgumentException("Masukkan Kunci Publisher terlebih dahulu.")
        publisherKey = trimmed
        try {
            requestJson("status")
            currentUserEmail = "Publisher Key"
        } catch (e: Exception) {
            publisherKey = ""
            throw e
        }
    }

    suspend fun signUp(email: String, password: String): Boolean = withContext(Dispatchers.IO) {
        val url = "$PROJECT_URL/auth/v1/signup"
        val payload = buildJsonObject {
            put("email", email.trim())
            put("password", password)
        }.toString()
        val (status, body) = rawHttp("POST", url, mapOf("apikey" to PUBLIC_KEY), payload.toByteArray())
        if (status !in 200..299) {
            throw IllegalStateException(extractError(body) ?: "Pendaftaran gagal ($status).")
        }
        val root = Json.parseToJsonElement(body).jsonObject
        val sessionObj = root["session"] as? JsonObject
        val token = sessionObj?.get("access_token")?.jsonPrimitive?.contentOrNull
            ?: root["access_token"]?.jsonPrimitive?.contentOrNull
            ?: ""
        if (token.isNotBlank()) {
            accessToken = token
            currentUserEmail = email.trim()
            true
        } else {
            false
        }
    }

    suspend fun recoverPassword(email: String) = withContext(Dispatchers.IO) {
        val url = "$PROJECT_URL/auth/v1/recover"
        val payload = buildJsonObject {
            put("email", email.trim())
        }.toString()
        val (status, body) = rawHttp("POST", url, mapOf("apikey" to PUBLIC_KEY), payload.toByteArray())
        if (status !in 200..299) {
            throw IllegalStateException(extractError(body) ?: "Gagal mengirim email pemulihan ($status).")
        }
    }

    suspend fun logout() = withContext(Dispatchers.IO) {
        val token = accessToken
        accessToken = ""
        publisherKey = ""
        currentUserEmail = ""
        if (token.isNotBlank()) {
            runCatching {
                rawHttp(
                    "POST",
                    "$PROJECT_URL/auth/v1/logout",
                    mapOf("apikey" to PUBLIC_KEY, "Authorization" to "Bearer $token")
                )
            }
        }
    }

    suspend fun fetchBooks(): List<PublisherBookSummary> = withContext(Dispatchers.IO) {
        val root = requestJson("books")
        val arr = (root["books"] as? JsonArray) ?: JsonArray(emptyList())
        arr.mapNotNull { el ->
            val obj = el as? JsonObject ?: return@mapNotNull null
            parseBookSummary(obj)
        }
    }

    suspend fun fetchBookDetail(bookId: String): PublisherBookDetail = withContext(Dispatchers.IO) {
        val root = requestJson("book", id = bookId)
        val bookObj = root["book"] as? JsonObject
            ?: throw IllegalStateException("Data buku tidak ditemukan.")
        val summary = parseBookSummary(bookObj)
            ?: throw IllegalStateException("Format buku tidak valid.")
        val sectionsArr = (root["sections"] as? JsonArray) ?: JsonArray(emptyList())
        val sections = sectionsArr.mapIndexedNotNull { idx, el ->
            val sObj = el as? JsonObject ?: return@mapIndexedNotNull null
            val id = sObj["id"]?.jsonPrimitive?.contentOrNull ?: UUID.randomUUID().toString()
            val title = sObj["title"]?.jsonPrimitive?.contentOrNull ?: "Episode ${idx + 1}"
            val html = sObj["content_html"]?.jsonPrimitive?.contentOrNull ?: ""
            val enabled = sObj["is_enabled"]?.jsonPrimitive?.booleanOrNull ?: true
            val releaseAt = sObj["release_at"]?.jsonPrimitive?.contentOrNull
            val pos = sObj["position"]?.jsonPrimitive?.intOrNull ?: idx
            val sec = PublisherSection(
                id = id,
                title = title,
                content_html = html,
                is_enabled = enabled,
                release_at = releaseAt,
                position = pos
            )
            sec.copy(kind = detectSectionKind(sec, summary.title))
        }
        PublisherBookDetail(book = summary, sections = sections)
    }

    suspend fun downloadPublisherEpub(bookId: String): ByteArray = withContext(Dispatchers.IO) {
        val bearer = currentBearer()
        if (bearer.isBlank()) throw IllegalStateException("Silakan masuk ke Publisher terlebih dahulu.")
        val encId = URLEncoder.encode(bookId, "UTF-8")
        val url = "$PUBLISHER_URL?action=download&id=$encId"
        val conn = (URL(url).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 20_000
            readTimeout = 45_000
            setRequestProperty("Authorization", "Bearer $bearer")
        }
        val status = conn.responseCode
        if (status !in 200..299) {
            val err = conn.errorStream?.let {
                BufferedReader(InputStreamReader(it, Charsets.UTF_8)).use { r -> r.readText() }
            } ?: ""
            throw IllegalStateException(extractError(err) ?: "Gagal mengunduh EPUB ($status).")
        }
        val out = ByteArrayOutputStream()
        conn.inputStream.use { it.copyTo(out) }
        out.toByteArray()
    }

    suspend fun publishBook(plan: PublicationPlan): PublisherBookSummary = withContext(Dispatchers.IO) {
        val payloadObj = buildJsonObject {
            put("request_id", UUID.randomUUID().toString())
            put("book", buildJsonObject {
                put("id", plan.book.id)
                put("title", plan.book.title)
                put("author", plan.book.author)
                put("language", plan.book.language)
                put("status", plan.book.status)
                if (plan.book.cover_url.isNotBlank()) {
                    put("cover_url", plan.book.cover_url)
                }
                if (plan.book.published_revision.isNotBlank()) {
                    put("published_revision", plan.book.published_revision)
                }
            })
            put("sections", buildJsonArray {
                plan.sections.forEachIndexed { idx, s ->
                    add(buildJsonObject {
                        put("id", s.id)
                        put("title", s.title)
                        put("content_html", s.content_html)
                        put("is_enabled", s.is_enabled)
                        put("release_at", s.release_at ?: Instant.now().toString())
                        put("position", idx)
                    })
                }
            })
        }
        val response = requestJson("publish", id = plan.book.id, bodyJson = payloadObj.toString())
        val updatedBookObj = (response["book"] as? JsonObject) ?: response
        parseBookSummary(updatedBookObj) ?: plan.book
    }

    // Importer & Matcher (port of dist/publisher-import.js)
    fun importChapterBytes(fileName: String, bytes: ByteArray): List<ImportedChapterPart> {
        if (bytes.size > MAX_IMPORT_BYTES) {
            throw IllegalArgumentException("Ukuran file pembaruan melebihi batas 18 MB.")
        }
        val ext = fileName.substringAfterLast('.', "").lowercase()
        val fallbackTitle = fileName.substringBeforeLast('.').ifBlank { "Episode Baru" }

        if (ext == "epub") {
            val parsed = EpubParser.parseLocalEpub(bytes, fileName)
            val result = mutableListOf<ImportedChapterPart>()
            var prevArc = ""
            for (ch in parsed.chapters) {
                if (ch.arc.isNotBlank() && ch.arc != prevArc) {
                    prevArc = ch.arc
                    result.add(
                        ImportedChapterPart(
                            title = ch.arc,
                            contentHtml = "<h1>${escapeHtml(ch.arc)}</h1>",
                            kind = "page",
                            label = ""
                        )
                    )
                }
                val heading = listOf(ch.chapterLabel, ch.title).filter { it.isNotBlank() }.distinct().joinToString(" — ")
                val bodyHtml = ch.paragraphs.joinToString("") { "<p>${escapeHtml(it)}</p>" }
                result.add(
                    ImportedChapterPart(
                        title = ch.title.ifBlank { ch.chapterLabel },
                        contentHtml = "<h1>${escapeHtml(heading)}</h1>$bodyHtml",
                        kind = "episode",
                        label = ch.chapterLabel
                    )
                )
            }
            return result
        }

        val rawText = String(bytes, Charsets.UTF_8).removePrefix("\uFEFF").replace("\r\n", "\n").replace('\r', '\n')
        if (rawText.isBlank()) throw IllegalArgumentException("File pembaruan kosong.")

        if (ext in setOf("html", "htm", "xhtml")) {
            val paragraphs = EpubParser.extractParagraphsFromHtml(rawText)
            val body = paragraphs.joinToString("") { "<p>${escapeHtml(it)}</p>" }
            return listOf(
                ImportedChapterPart(
                    title = fallbackTitle,
                    contentHtml = "<h1>${escapeHtml(fallbackTitle)}</h1>$body",
                    kind = if (isArcTitle(fallbackTitle)) "page" else "episode",
                    label = extractChapterLabel(fallbackTitle)
                )
            )
        }

        // TXT or Markdown: split on headings (#, ##, ###, or Bab/Chapter/Episode/Arc lines)
        val lines = rawText.lines()
        val parts = mutableListOf<ImportedChapterPart>()
        var currentTitle = fallbackTitle
        val currentBody = mutableListOf<String>()

        fun flush() {
            val joined = currentBody.joinToString("\n").trim()
            if (joined.isNotEmpty() || isArcTitle(currentTitle)) {
                val paragraphs = joined.split(Regex("\n\\s*\n+")).map { it.trim() }.filter { it.isNotEmpty() }
                val htmlBody = paragraphs.joinToString("") { p ->
                    "<p>${escapeHtml(p).replace("\n", "<br/>")}</p>"
                }
                parts.add(
                    ImportedChapterPart(
                        title = currentTitle.trim(),
                        contentHtml = "<h1>${escapeHtml(currentTitle.trim())}</h1>$htmlBody",
                        kind = if (isArcTitle(currentTitle)) "page" else "episode",
                        label = extractChapterLabel(currentTitle)
                    )
                )
            }
        }

        for (line in lines) {
            val mdHead = Regex("^#{1,3}\\s+(.+)$").find(line)?.groupValues?.get(1)?.trim()
            val explicitHead = if (mdHead == null &&
                Regex("^(?:bab|chapter|episode|arc|ark|part)\\s+(?:\\d+|[ivxlcdm]+)(?=\\s|[.:—–-]|$)", RegexOption.IGNORE_CASE)
                    .containsMatchIn(line.trim())
            ) {
                line.trim()
            } else null

            val nextHeading = mdHead ?: explicitHead
            if (nextHeading != null) {
                flush()
                currentTitle = nextHeading
                currentBody.clear()
            } else {
                currentBody.add(line)
            }
        }
        flush()
        return parts
    }

    fun matchUpdates(
        parts: List<ImportedChapterPart>,
        existingSections: List<PublisherSection>
    ): List<ImportedChapterPart> {
        data class IndexedSection(
            val section: PublisherSection,
            val normTitle: String,
            val canonicalLabel: String,
            val plainText: String
        )

        val indexed = existingSections.map { sec ->
            IndexedSection(
                section = sec,
                normTitle = normalizedTitle(sec.title),
                canonicalLabel = canonicalLabel(extractChapterLabel(sec.title)),
                plainText = plainTextOfHtml(sec.content_html)
            )
        }

        return parts.map { part ->
            val title = normalizedTitle(part.title)
            val label = canonicalLabel(part.label)
            val candidates = indexed.filter { s ->
                (s.normTitle.isNotEmpty() && s.normTitle == title) ||
                    (label.isNotEmpty() && s.canonicalLabel == label)
            }
            val target = when {
                candidates.size > 1 -> "?"
                candidates.size == 1 -> {
                    if (candidates[0].plainText == plainTextOfHtml(part.contentHtml)) {
                        "skip"
                    } else {
                        candidates[0].section.id
                    }
                }
                else -> "new"
            }
            part.copy(target = target)
        }
    }

    fun planPublication(
        book: PublisherBookSummary,
        existingSections: List<PublisherSection>,
        parts: List<ImportedChapterPart>,
        firstImmediateCount: Int = 1,
        intervalDays: Int = 1,
        startEpochMillis: Long = System.currentTimeMillis() + 86_400_000L,
        nowEpochMillis: Long = System.currentTimeMillis()
    ): PublicationPlan {
        val result = existingSections.toMutableList()
        val changes = mutableListOf<PlannedChange>()
        val usedTargets = mutableSetOf<String>()

        for (item in parts) {
            if (item.target == "skip") continue
            if (item.title.isBlank() || item.title.length > 300) {
                throw IllegalArgumentException("Setiap bab harus memiliki judul 1–300 karakter.")
            }
            if (item.target == "?") {
                throw IllegalArgumentException("Pilih target untuk bab yang masih ambigu (?): ${item.title}")
            }
            if (item.target == "new") {
                val newId = UUID.randomUUID().toString()
                val added = PublisherSection(
                    id = newId,
                    title = item.title.trim(),
                    content_html = item.contentHtml,
                    is_enabled = true,
                    release_at = null,
                    position = result.size,
                    kind = item.kind
                )
                result.add(added)
                changes.add(PlannedChange(id = newId, title = added.title, action = "add"))
            } else {
                if (!usedTargets.add(item.target)) {
                    throw IllegalArgumentException("Dua pembaruan menargetkan bab yang sama.")
                }
                val idx = result.indexOfFirst { it.id == item.target }
                if (idx < 0) throw IllegalArgumentException("Bab target tidak lagi ditemukan.")
                val existing = result[idx]
                val finalTitle = if (normalizedTitle(item.title).isNotEmpty()) item.title.trim() else existing.title
                result[idx] = existing.copy(
                    title = finalTitle,
                    content_html = item.contentHtml
                )
                changes.add(PlannedChange(id = existing.id, title = finalTitle, action = "replace"))
            }
        }

        val effectiveFirst = if (book.status == "completed") 0 else firstImmediateCount.coerceIn(0, 600)
        val effectiveInterval = intervalDays.coerceIn(1, 365)
        var addedStories = 0

        for (i in result.indices) {
            val sec = result[i]
            if (sec.release_at == null && sec.kind == "episode") {
                val releaseIso = if (book.status == "completed" || addedStories < effectiveFirst) {
                    Instant.ofEpochMilli(nowEpochMillis).toString()
                } else {
                    val scheduledMs = startEpochMillis + (addedStories - effectiveFirst).toLong() * effectiveInterval * 86_400_000L
                    Instant.ofEpochMilli(scheduledMs).toString()
                }
                result[i] = sec.copy(release_at = releaseIso)
                addedStories++
            }
        }

        val nowIso = Instant.ofEpochMilli(nowEpochMillis).toString()
        val positioned = result.mapIndexed { idx, s ->
            s.copy(
                position = idx,
                release_at = if (book.status == "completed") nowIso else (s.release_at ?: nowIso),
                is_enabled = if (book.status == "completed") true else s.is_enabled
            )
        }

        return PublicationPlan(
            book = book,
            sections = positioned,
            changes = changes
        )
    }

    private fun normalizedTitle(value: String): String {
        val stripped = value.replace(
            Regex("^(?:bab|chapter|episode)\\s*(?:\\d+|[ivxlcdm]+)[\\s.:—–-]*", RegexOption.IGNORE_CASE),
            ""
        )
        return Normalizer.normalize(stripped, Normalizer.Form.NFKC)
            .replace(Regex("\\s+"), " ")
            .trim()
            .lowercase()
    }

    private fun isArcTitle(value: String): Boolean {
        return Regex("^(?:arc|ark|part)\\s+(?:\\d+|[ivxlcdm]+)(?=\\s|[.:—–-]|$)", RegexOption.IGNORE_CASE)
            .containsMatchIn(value.trim())
    }

    private fun extractChapterLabel(title: String): String {
        val m = Regex("^(bab|chapter|episode|bagian)\\s+(\\d+|[ivxlcdm]+)", RegexOption.IGNORE_CASE)
            .find(title.trim()) ?: return ""
        return "${m.groupValues[1].uppercase()} ${m.groupValues[2].uppercase()}"
    }

    private fun canonicalLabel(label: String): String {
        val m = Regex("^(BAB|CHAPTER|EPISODE|BAGIAN)\\s+([IVXLCDM]+|\\d+)$", RegexOption.IGNORE_CASE)
            .matchEntire(label.trim()) ?: return label.trim()
        val numToken = m.groupValues[2].uppercase()
        val num = numToken.toIntOrNull() ?: romanToInt(numToken)
        return "BAB $num"
    }

    private fun romanToInt(roman: String): Int {
        val map = mapOf('I' to 1, 'V' to 5, 'X' to 10, 'L' to 50, 'C' to 100, 'D' to 500, 'M' to 1000)
        var sum = 0
        for (i in roman.indices) {
            val curr = map[roman[i]] ?: 0
            val next = if (i + 1 < roman.length) (map[roman[i + 1]] ?: 0) else 0
            if (curr < next) sum -= curr else sum += curr
        }
        return sum
    }

    private fun detectSectionKind(section: PublisherSection, bookTitle: String): String {
        if (isArcTitle(section.title)) return "page"
        if (Regex("^(?:halaman judul|sinopsis|synopsis|tentang buku|informasi buku|sampul|cover|tamat)$", RegexOption.IGNORE_CASE)
                .matches(section.title.trim())
        ) {
            return "page"
        }
        val plain = plainTextOfHtml(section.content_html)
        if (normalizedTitle(section.title) == normalizedTitle(bookTitle) && plain.length < 1800) {
            return "page"
        }
        return "episode"
    }

    private fun plainTextOfHtml(html: String): String {
        return EpubParser.decodeHtmlEntities(html.replace(Regex("<[^>]+>"), " "))
            .replace(Regex("\\s+"), " ")
            .trim()
    }

    private fun escapeHtml(text: String): String {
        return text
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;")
            .replace("\"", "&quot;")
            .replace("'", "&#39;")
    }

    private fun parseBookSummary(obj: JsonObject): PublisherBookSummary? {
        val id = obj["id"]?.jsonPrimitive?.contentOrNull ?: return null
        val title = obj["title"]?.jsonPrimitive?.contentOrNull ?: return null
        return PublisherBookSummary(
            id = id,
            title = title,
            author = obj["author"]?.jsonPrimitive?.contentOrNull ?: "",
            language = obj["language"]?.jsonPrimitive?.contentOrNull ?: "id",
            status = obj["status"]?.jsonPrimitive?.contentOrNull ?: "ongoing",
            cover_url = obj["cover_url"]?.jsonPrimitive?.contentOrNull ?: "",
            published_revision = obj["published_revision"]?.jsonPrimitive?.contentOrNull ?: "",
            updated_at = obj["updated_at"]?.jsonPrimitive?.contentOrNull ?: "",
            section_count = obj["section_count"]?.jsonPrimitive?.intOrNull ?: 0
        )
    }

    private fun requestJson(
        action: String,
        id: String? = null,
        bodyJson: String? = null
    ): JsonObject {
        val bearer = currentBearer()
        if (bearer.isBlank()) {
            throw IllegalStateException("Silakan masuk ke Publisher terlebih dahulu.")
        }
        val sb = StringBuilder("$PUBLISHER_URL?action=${URLEncoder.encode(action, "UTF-8")}")
        if (!id.isNullOrBlank()) {
            sb.append("&id=").append(URLEncoder.encode(id, "UTF-8"))
        }
        val headers = mutableMapOf("Authorization" to "Bearer $bearer")
        val method = if (bodyJson != null) "POST" else "GET"
        val (status, respBody) = rawHttp(
            method = method,
            urlString = sb.toString(),
            headers = headers,
            bodyBytes = bodyJson?.toByteArray(Charsets.UTF_8)
        )
        if (status !in 200..299) {
            if (status == 409) {
                throw IllegalStateException("Buku ini telah berubah di server. Muat ulang sebelum menerbitkan.")
            }
            throw IllegalStateException(extractError(respBody) ?: "Permintaan Publisher gagal ($status).")
        }
        return runCatching { Json.parseToJsonElement(respBody).jsonObject }
            .getOrElse { JsonObject(emptyMap()) }
    }

    private fun extractError(body: String): String? {
        return runCatching {
            val obj = Json.parseToJsonElement(body).jsonObject
            obj["error"]?.jsonPrimitive?.contentOrNull
                ?: obj["msg"]?.jsonPrimitive?.contentOrNull
                ?: obj["error_description"]?.jsonPrimitive?.contentOrNull
        }.getOrNull()
    }

    private fun rawHttp(
        method: String,
        urlString: String,
        headers: Map<String, String> = emptyMap(),
        bodyBytes: ByteArray? = null
    ): Pair<Int, String> {
        val conn = (URL(urlString).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 20_000
            readTimeout = 45_000
            setRequestProperty("Accept", "application/json")
            for ((k, v) in headers) {
                setRequestProperty(k, v)
            }
            if (bodyBytes != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                outputStream.use { it.write(bodyBytes) }
            }
        }
        val status = conn.responseCode
        val stream = if (status in 200..299) conn.inputStream else conn.errorStream
        val text = stream?.let {
            BufferedReader(InputStreamReader(it, Charsets.UTF_8)).use { r -> r.readText() }
        } ?: ""
        return status to text
    }
}
