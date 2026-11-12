package id.karisyono.katakecil.ui.reader

import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.ParagraphStyle
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.style.TextIndent
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp

/** Shared by pagination and drawing. Original text and character offsets never change. */
internal fun readingTextLayout(text: String, source: String, sourceStart: Int, indent: Float, paragraphGap: Int): AnnotatedString = buildAnnotatedString {
    append(text)
    if (text.isEmpty()) return@buildAnnotatedString
    addStyle(ParagraphStyle(textIndent = TextIndent(firstLine = indent.em)), 0, text.length)
    val paragraphStart = sourceStart == 0 || source.substring((sourceStart - 32).coerceAtLeast(0), sourceStart.coerceAtMost(source.length)).trimEnd(' ', '\t').endsWith("\n\n")
    if (!paragraphStart) addStyle(ParagraphStyle(textIndent = TextIndent(firstLine = 0.em)), 0, text.indexOf('\n').let { if (it < 0) text.length else it + 1 })
    Regex("\\n(?:[ \\t]*\\n)+").findAll(text).forEach { match ->
        val start = match.range.first + 1
        val end = match.range.last + 1
        val lines = match.value.count { it == '\n' } - 1
        val gap = paragraphGap.toFloat() / lines.coerceAtLeast(1)
        addStyle(SpanStyle(fontSize = gap.sp), start, end)
        addStyle(ParagraphStyle(lineHeight = gap.sp, textIndent = TextIndent(firstLine = 0.em)), start, end)
    }
}
