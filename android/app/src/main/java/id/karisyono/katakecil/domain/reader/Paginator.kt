package id.karisyono.katakecil.domain.reader

import id.karisyono.katakecil.core.model.Chapter
import id.karisyono.katakecil.core.model.PageSlice
import kotlin.math.max
import kotlin.math.min

/**
 * Port of dist/pagination.js (paginateToFit).
 * Binary-searches the maximum character range that fits within the measured page height,
 * snapping to word boundaries so words are never split mid-character while filling usable lines.
 */
object Paginator {

    fun paginateChapterToFit(
        chapterIndex: Int,
        text: String,
        startPageIndex: Int = 0,
        maxCharsHint: Int = 2400,
        fits: (candidateText: String, start: Int, end: Int) -> Boolean
    ): List<PageSlice> {
        if (text.isEmpty()) {
            return listOf(
                PageSlice(
                    pageIndex = startPageIndex,
                    chapterIndex = chapterIndex,
                    start = 0,
                    end = 0,
                    text = ""
                )
            )
        }

        val pages = mutableListOf<PageSlice>()
        var cursor = 0
        val totalLen = text.length

        while (cursor < totalLen) {
            // Skip leading horizontal spaces (but preserve paragraph newlines if needed)
            while (cursor < totalLen && (text[cursor] == ' ' || text[cursor] == '\t' || text[cursor] == '\n')) {
                cursor++
            }
            if (cursor >= totalLen) break

            val upperBound = min(totalLen, cursor + max(400, maxCharsHint * 2))
            if (fits(text.substring(cursor, upperBound), cursor, upperBound)) {
                if (upperBound == totalLen) {
                    pages.add(
                        PageSlice(
                            pageIndex = startPageIndex + pages.size,
                            chapterIndex = chapterIndex,
                            start = cursor,
                            end = totalLen,
                            text = text.substring(cursor, totalLen)
                        )
                    )
                    break
                }
            }

            var low = cursor + 1
            var high = upperBound
            var bestFit = low

            while (low <= high) {
                val mid = (low + high) ushr 1
                val snapped = snapToWordBoundary(text, cursor, mid)
                val probeEnd = if (snapped > cursor) snapped else mid
                val slice = text.substring(cursor, probeEnd)
                if (fits(slice, cursor, probeEnd)) {
                    bestFit = max(bestFit, probeEnd)
                    low = mid + 1
                } else {
                    high = mid - 1
                }
            }

            val finalEnd = if (bestFit < totalLen) {
                val snapped = snapToWordBoundary(text, cursor, bestFit)
                if (snapped > cursor) snapped else bestFit
            } else {
                totalLen
            }

            val safeEnd = max(cursor + 1, min(totalLen, finalEnd))
            val sliceText = text.substring(cursor, safeEnd).trimEnd()
            pages.add(
                PageSlice(
                    pageIndex = startPageIndex + pages.size,
                    chapterIndex = chapterIndex,
                    start = cursor,
                    end = safeEnd,
                    text = sliceText
                )
            )
            cursor = safeEnd
        }

        if (pages.isEmpty()) {
            pages.add(
                PageSlice(
                    pageIndex = startPageIndex,
                    chapterIndex = chapterIndex,
                    start = 0,
                    end = totalLen,
                    text = text
                )
            )
        }
        return pages
    }

    fun paginateAllChapters(
        chapters: List<Chapter>,
        maxCharsHint: Int = 2200,
        fits: (chapterIndex: Int, candidateText: String, start: Int, end: Int) -> Boolean
    ): List<PageSlice> {
        val allPages = mutableListOf<PageSlice>()
        for ((idx, ch) in chapters.withIndex()) {
            val chPages = paginateChapterToFit(
                chapterIndex = idx,
                text = ch.text,
                startPageIndex = allPages.size,
                maxCharsHint = maxCharsHint
            ) { candidate, start, end ->
                fits(idx, candidate, start, end)
            }
            allPages.addAll(chPages)
        }
        return allPages
    }

    fun findPageForOffset(pages: List<PageSlice>, chapterIndex: Int, charOffset: Int): Int {
        if (pages.isEmpty()) return 0
        val inChapter = pages.filter { it.chapterIndex == chapterIndex }
        if (inChapter.isEmpty()) return 0
        val exact = inChapter.firstOrNull { charOffset >= it.start && charOffset < it.end }
        if (exact != null) return pages.indexOf(exact).coerceAtLeast(0)
        val closest = inChapter.lastOrNull { it.start <= charOffset } ?: inChapter.first()
        return pages.indexOf(closest).coerceAtLeast(0)
    }

    private fun snapToWordBoundary(text: String, start: Int, targetEnd: Int): Int {
        if (targetEnd >= text.length) return text.length
        if (text[targetEnd].isWhitespace()) return targetEnd
        var i = targetEnd
        while (i > start && !text[i - 1].isWhitespace()) {
            i--
        }
        return if (i > start) i else targetEnd
    }
}
