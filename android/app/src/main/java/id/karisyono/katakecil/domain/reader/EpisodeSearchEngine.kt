package id.karisyono.katakecil.domain.reader

import id.karisyono.katakecil.core.model.PageSlice
import id.karisyono.katakecil.core.model.SearchMatch
import kotlin.math.max
import kotlin.math.min

/**
 * Port of src/reader/search.ts.
 * Performs case-insensitive Unicode search within an episode (up to 1,000 matches)
 * with contextual snippet generation (-35 to +65 chars) and page mapping.
 */
object EpisodeSearchEngine {
    const val MAX_MATCHES = 1_000

    fun searchInEpisode(
        text: String,
        query: String,
        chapterIndex: Int = 0,
        pages: List<PageSlice> = emptyList()
    ): List<SearchMatch> {
        val cleanQuery = query.trim()
        if (cleanQuery.isEmpty() || text.isEmpty()) return emptyList()

        val matches = mutableListOf<SearchMatch>()
        var searchFrom = 0
        while (searchFrom <= text.length - cleanQuery.length && matches.size < MAX_MATCHES) {
            val found = text.indexOf(cleanQuery, searchFrom, ignoreCase = true)
            if (found < 0) break
            val end = found + cleanQuery.length
            val matchText = text.substring(found, end)
            val snippetStart = max(0, found - 35)
            val snippetEnd = min(text.length, end + 65)
            val prefixEllipsis = if (snippetStart > 0) "…" else ""
            val suffixEllipsis = if (snippetEnd < text.length) "…" else ""
            val rawSnippet = text.substring(snippetStart, snippetEnd).replace(Regex("\\s+"), " ").trim()
            val pageIdx = if (pages.isNotEmpty()) {
                Paginator.findPageForOffset(pages, chapterIndex, found)
            } else 0

            matches.add(
                SearchMatch(
                    index = matches.size,
                    start = found,
                    end = end,
                    matchText = matchText,
                    snippet = "$prefixEllipsis$rawSnippet$suffixEllipsis",
                    pageIndex = pageIdx
                )
            )
            searchFrom = found + max(1, cleanQuery.length)
        }
        return matches
    }
}
