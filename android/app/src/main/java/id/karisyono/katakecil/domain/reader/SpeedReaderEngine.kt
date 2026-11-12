package id.karisyono.katakecil.domain.reader

import java.text.BreakIterator
import kotlin.math.floor
import kotlin.math.min
import kotlin.math.roundToLong

/**
 * Port of src/reader/speed.ts & dist/speed-reading.js.
 * Implements RSVP (Rapid Serial Visual Presentation) tokenization, grapheme-aware ORP pivot
 * calculation (focusParts), and punctuation/paragraph-aware word delay timing (speedWordDelay).
 */
object SpeedReaderEngine {

    data class FocusParts(
        val left: String,
        val pivot: String,
        val right: String
    )

    data class SpeedToken(
        val index: Int,
        val word: String,
        val startOffset: Int,
        val endOffset: Int,
        val paragraphBreakAfter: Boolean,
        val focus: FocusParts
    )

    private val SENTENCE_END_REGEX = Regex("[.!?…][\"'”’)\\]]*$")
    private val CLAUSE_PAUSE_REGEX = Regex("[,;:—–][\"'”’)\\]]*$")

    /**
     * Exact port of focusParts(word) from src/reader/speed.ts:
     * Splits a word into graphemes and computes the Optimal Recognition Point (ORP):
     * count <= 1 -> 0
     * count <= 5 -> 1
     * count <= 9 -> 2
     * count <= 13 -> 3
     * else -> floor(count * 0.3)
     */
    fun focusParts(word: String): FocusParts {
        if (word.isEmpty()) return FocusParts("", "", "")
        val graphemes = splitGraphemes(word)
        val count = graphemes.size
        val pivotIdx = when {
            count <= 1 -> 0
            count <= 5 -> 1
            count <= 9 -> 2
            count <= 13 -> 3
            else -> floor(count * 0.3).toInt()
        }.coerceIn(0, count - 1)

        val left = graphemes.subList(0, pivotIdx).joinToString("")
        val pivot = graphemes[pivotIdx]
        val right = graphemes.subList(pivotIdx + 1, count).joinToString("")
        return FocusParts(left = left, pivot = pivot, right = right)
    }

    /**
     * Exact port of speedWordDelay(token, wpm) from src/reader/speed.ts.
     */
    fun speedWordDelayMs(token: SpeedToken, wpm: Int): Long {
        val clampedWpm = wpm.coerceIn(100, 600)
        val baseMs = 60_000.0 / clampedWpm.toDouble()
        var multiplier = 1.0
        val w = token.word
        when {
            token.paragraphBreakAfter -> multiplier = 1.9
            SENTENCE_END_REGEX.containsMatchIn(w) -> multiplier = 1.65
            CLAUSE_PAUSE_REGEX.containsMatchIn(w) -> multiplier = 1.3
        }
        val len = w.length
        if (len > 8) {
            multiplier += min(0.36, (len - 8) * 0.04)
        }
        return (baseMs * multiplier).roundToLong().coerceAtLeast(60L)
    }

    fun tokenizeEpisode(text: String): List<SpeedToken> {
        if (text.isBlank()) return emptyList()
        val tokens = mutableListOf<SpeedToken>()
        val wordRegex = Regex("\\S+")
        val allMatches = wordRegex.findAll(text).toList()

        for ((idx, match) in allMatches.withIndex()) {
            val word = match.value
            val start = match.range.first
            val end = match.range.last + 1
            val nextStart = if (idx + 1 < allMatches.size) allMatches[idx + 1].range.first else text.length
            val between = text.substring(end, nextStart)
            val paragraphBreak = between.contains('\n')

            tokens.add(
                SpeedToken(
                    index = idx,
                    word = word,
                    startOffset = start,
                    endOffset = end,
                    paragraphBreakAfter = paragraphBreak,
                    focus = focusParts(word)
                )
            )
        }
        return tokens
    }

    fun tokenIndexAtOrAfterOffset(tokens: List<SpeedToken>, charOffset: Int): Int {
        if (tokens.isEmpty()) return 0
        val idx = tokens.indexOfFirst { it.endOffset > charOffset }
        return if (idx >= 0) idx else 0
    }

    fun maxWordGraphemeCount(tokens: List<SpeedToken>): Int {
        if (tokens.isEmpty()) return 8
        return tokens.maxOf { it.word.length }.coerceAtLeast(6)
    }

    private fun splitGraphemes(text: String): List<String> {
        val iterator = BreakIterator.getCharacterInstance()
        iterator.setText(text)
        val result = mutableListOf<String>()
        var start = iterator.first()
        var end = iterator.next()
        while (end != BreakIterator.DONE) {
            result.add(text.substring(start, end))
            start = end
            end = iterator.next()
        }
        return if (result.isEmpty()) listOf(text) else result
    }
}
