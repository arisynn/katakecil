package id.karisyono.katakecil.domain.reader

import id.karisyono.katakecil.core.model.AnnotationItem
import id.karisyono.katakecil.core.model.Chapter
import id.karisyono.katakecil.core.model.ReadingProgress
import id.karisyono.katakecil.core.model.TextQuoteAnchor
import java.security.MessageDigest
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min

/**
 * Port of src/reader/anchors.ts & dist/anchors.js.
 * Implements W3C Web Annotation TextQuoteSelector-compatible anchoring with prefix/suffix scoring,
 * SHA-256 sourceHash verification, and automatic relocation when book revisions update.
 */
object TextAnchorEngine {
    const val CONTEXT_LENGTH = 32

    data class AnchorResolution(
        val start: Int,
        val end: Int,
        val moved: Boolean,
        val needsReview: Boolean
    )

    fun sha256Hex(bytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(bytes)
        val sb = StringBuilder(digest.size * 2)
        for (b in digest) {
            sb.append(String.format("%02x", b))
        }
        return sb.toString()
    }

    fun sha256Hex(text: String): String = sha256Hex(text.toByteArray(Charsets.UTF_8))

    fun makeAnchor(
        episodeId: String,
        text: String,
        start: Int,
        end: Int,
        sourceHash: String? = null
    ): TextQuoteAnchor? {
        if (episodeId.isBlank() || text.isEmpty()) return null
        val safeStart = start.coerceIn(0, text.length)
        val safeEnd = end.coerceIn(safeStart, text.length)
        if (safeEnd <= safeStart) return null
        val exact = text.substring(safeStart, safeEnd)
        if (exact.isEmpty()) return null
        val prefix = text.substring(max(0, safeStart - CONTEXT_LENGTH), safeStart)
        val suffix = text.substring(safeEnd, min(text.length, safeEnd + CONTEXT_LENGTH))
        val hash = sourceHash?.ifBlank { null } ?: sha256Hex(text)
        return TextQuoteAnchor(
            episodeId = episodeId,
            exact = exact,
            prefix = prefix,
            suffix = suffix,
            start = safeStart,
            end = safeEnd,
            sourceHash = hash
        )
    }

    fun resolveAnchor(
        text: String,
        anchor: TextQuoteAnchor,
        currentHash: String? = null
    ): AnchorResolution {
        val exact = anchor.exact
        if (exact.isEmpty() || text.isEmpty()) {
            return AnchorResolution(
                start = anchor.start.coerceAtLeast(0),
                end = anchor.end.coerceAtLeast(anchor.start.coerceAtLeast(0)),
                moved = false,
                needsReview = true
            )
        }

        // Fast path: exact match at original coordinates
        if (anchor.start >= 0 && anchor.end <= text.length && anchor.end - anchor.start == exact.length) {
            if (text.regionMatches(anchor.start, exact, 0, exact.length)) {
                return AnchorResolution(
                    start = anchor.start,
                    end = anchor.end,
                    moved = false,
                    needsReview = false
                )
            }
        }

        // Search all occurrences of exact in text
        val candidates = mutableListOf<Int>()
        var searchFrom = 0
        while (searchFrom <= text.length - exact.length) {
            val found = text.indexOf(exact, searchFrom)
            if (found < 0) break
            candidates.add(found)
            searchFrom = found + 1
        }

        if (candidates.isEmpty()) {
            val clampedStart = anchor.start.coerceIn(0, text.length)
            val clampedEnd = anchor.end.coerceIn(clampedStart, text.length)
            return AnchorResolution(
                start = clampedStart,
                end = clampedEnd,
                moved = false,
                needsReview = true
            )
        }

        if (candidates.size == 1) {
            val pos = candidates[0]
            return AnchorResolution(
                start = pos,
                end = pos + exact.length,
                moved = pos != anchor.start,
                needsReview = false
            )
        }

        // Multiple occurrences: score by prefix suffix overlap and suffix prefix overlap
        var bestPos = candidates[0]
        var bestScore = -1
        var bestDistance = Int.MAX_VALUE
        var ambiguousTopScore = false

        for (pos in candidates) {
            val candPrefix = text.substring(max(0, pos - CONTEXT_LENGTH), pos)
            val candSuffix = text.substring(pos + exact.length, min(text.length, pos + exact.length + CONTEXT_LENGTH))
            val prefixMatch = commonSuffixLength(anchor.prefix, candPrefix)
            val suffixMatch = commonPrefixLength(anchor.suffix, candSuffix)
            val score = prefixMatch * 2 + suffixMatch * 2 + (if (prefixMatch > 0 && suffixMatch > 0) 4 else 0)
            val dist = abs(pos - anchor.start)

            if (score > bestScore) {
                bestScore = score
                bestPos = pos
                bestDistance = dist
                ambiguousTopScore = false
            } else if (score == bestScore) {
                if (dist < bestDistance) {
                    bestPos = pos
                    bestDistance = dist
                }
                if (score == 0) {
                    ambiguousTopScore = true
                }
            }
        }

        val hashChanged = !anchor.sourceHash.isNullOrBlank() &&
            !currentHash.isNullOrBlank() &&
            !anchor.sourceHash.equals(currentHash, ignoreCase = true)

        return AnchorResolution(
            start = bestPos,
            end = bestPos + exact.length,
            moved = bestPos != anchor.start,
            needsReview = ambiguousTopScore && hashChanged
        )
    }

    fun relocateAnnotation(item: AnnotationItem, chapter: Chapter): AnnotationItem {
        val text = chapter.text
        if (text.isEmpty()) return item
        val hash = chapter.contentHash.ifBlank { sha256Hex(text) }
        val episodeId = chapter.id.ifBlank { "chapter-${chapter.index}" }

        val existingAnchor = item.anchor ?: run {
            val s = item.startOffset ?: item.charOffset ?: 0
            val e = item.endOffset ?: (s + (item.selectedText?.length ?: min(48, text.length - s.coerceIn(0, text.length))))
            if (!item.selectedText.isNullOrEmpty()) {
                TextQuoteAnchor(
                    episodeId = episodeId,
                    exact = item.selectedText,
                    prefix = "",
                    suffix = "",
                    start = s.coerceAtLeast(0),
                    end = max(s + 1, e),
                    sourceHash = null
                )
            } else {
                makeAnchor(episodeId, text, s, max(s + 1, min(text.length, s + 48)), hash)
            }
        } ?: return item

        val resolved = resolveAnchor(text, existingAnchor, hash)
        val newAnchor = if (!resolved.needsReview && resolved.end > resolved.start && resolved.end <= text.length) {
            makeAnchor(episodeId, text, resolved.start, resolved.end, hash) ?: existingAnchor
        } else {
            existingAnchor
        }

        return if (item.type == "highlight") {
            item.copy(
                startOffset = resolved.start,
                endOffset = resolved.end,
                charOffset = resolved.start,
                selectedText = if (!resolved.needsReview && resolved.end <= text.length) {
                    text.substring(resolved.start, resolved.end)
                } else item.selectedText,
                anchor = newAnchor,
                needsReview = resolved.needsReview
            )
        } else {
            item.copy(
                charOffset = resolved.start,
                anchor = newAnchor,
                needsReview = resolved.needsReview
            )
        }
    }

    fun relocateReadingProgress(progress: ReadingProgress, chapter: Chapter): ReadingProgress {
        val text = chapter.text
        val anchor = progress.anchor ?: return progress
        if (text.isEmpty()) return progress
        val resolved = resolveAnchor(text, anchor, chapter.contentHash.ifBlank { sha256Hex(text) })
        return progress.copy(
            charOffset = resolved.start,
            needsReview = resolved.needsReview
        )
    }

    private fun commonSuffixLength(a: String, b: String): Int {
        var i = a.length - 1
        var j = b.length - 1
        var count = 0
        while (i >= 0 && j >= 0 && a[i] == b[j]) {
            count++
            i--
            j--
        }
        return count
    }

    private fun commonPrefixLength(a: String, b: String): Int {
        val limit = min(a.length, b.length)
        var count = 0
        while (count < limit && a[count] == b[count]) {
            count++
        }
        return count
    }
}
