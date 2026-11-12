package id.karisyono.katakecil.ui.components

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Matrix
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import id.karisyono.katakecil.core.theme.LocalKataKecilPalette

object KataKecilIcons {
    val Paths = mapOf(
        "eye" to "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
        "eyeOff" to "M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z M3 3l18 18",
        "sun" to "M12 3v1 M12 20v1 M3 12h1 M20 12h1 m-3.6-6.4-.7.7 M6.3 17.7l-.7.7 m0-12.8.7.7 m11.4 11.4.7.7 M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0",
        "moon" to "M20 14A8 8 0 0 1 10 4a8 8 0 1 0 10 10",
        "leaf" to "M20 4c0 8-2 15-10 15a6 6 0 0 1-6-6C4 5 12 4 20 4Z M4 20l11-11",
        "paper" to "M6 3h8l4 4v14H6V3Z M14 3v5h4 M9 12h6 M9 16h6",
        "sepia" to "M5 7h12v8a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V7Z M17 8h2a3 3 0 0 1 0 6h-2 M8 3v1 M12 3v1",
        "speaker" to "M11 4 6 8H3v8h3l5 4V4Z M15 8a6 6 0 0 1 0 8 M18 5a10 10 0 0 1 0 14",
        "play" to "m8 4 12 8-12 8V4Z",
        "pause" to "M8 5v14 M16 5v14",
        "globe" to "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0 M3 12h18 M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z",
        "refresh" to "M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8 M21 3v5h-5",
        "collapse" to "M9 3v6H3 M15 3v6h6 M3 15h6v6 M21 15h-6v6",
        "palette" to "M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4 2 2 0 0 1 0-4h4a4 4 0 0 0 4-4c0-3-4-6-9-6Z M7 9h.01 M10 6h.01 M15 6h.01 M6 14h.01",
        "type" to "M4 6V4h16v2 M12 4v16 M8 20h8",
        "textSize" to "M3 18 8 6l5 12 M5 14h6 M15 10h6 M18 10v10",
        "device" to "M8 3h8a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3Z M11 17h2",
        "book" to "M4 4c3-1 5-1 8 1 3-2 5-2 8-1v15c-3-1-5-1-8 1-3-2-5-2-8-1V4Z M12 5v15",
        "grid" to "M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z",
        "bookOpen" to "M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Z M12 6v14",
        "notes" to "M7 3h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M9 8h6 M9 12h6 M9 16h3",
        "appearance" to "M12 3a9 9 0 1 0 9 9c0-1-1-2-2-2h-2a2 2 0 0 1-2-2c0-1 1-2 1-3s-2-2-4-2Z M7 10h.01 M7 15h.01 M11 7h.01",
        "plus" to "M12 5v14 M5 12h14",
        "search" to "M21 21l-5-5 M18 10.5a7.5 7.5 0 1 1-15 0 7.5 7.5 0 0 1 15 0",
        "chevron" to "m9 5 7 7-7 7",
        "left" to "m15 5-7 7 7 7",
        "arrow" to "M5 12h14 m-5-5 5 5-5 5",
        "close" to "m6 6 12 12 M6 18 18 6",
        "check" to "m5 12 4 4L19 6",
        "shield" to "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z m-4 9 3 3 5-6",
        "cloud" to "M7 18H6a4 4 0 0 1-1-8 7 7 0 0 1 13-2 5 5 0 0 1 0 10h-1 M12 13v8 m-3-3 3 3 3-3",
        "upload" to "M12 16V3 m-5 5 5-5 5 5 M4 14v7h16v-7",
        "bookmark" to "M8 3h8a2 2 0 0 1 2 2v15l-6-4-6 4V5a2 2 0 0 1 2-2Z",
        "quote" to "M10 4C6 4 3 8 3 13v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2H4 M21 4c-4 0-7 4-7 9v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-5",
        "sparkle" to "m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z",
        "list" to "M8 6h13 M8 12h13 M8 18h13 M3 6h.01 M3 12h.01 M3 18h.01",
        "lock" to "M6 10h12v11H6z M8 10V7a4 4 0 0 1 8 0v3",
        "more" to "M5 12h.01 M12 12h.01 M19 12h.01",
        "download" to "M12 3v13 m-5-5 5 5 5-5 M4 16v5h16v-5",
        "expand" to "M4 9V4h5 M15 4h5v5 M20 15v5h-5 M9 20H4v-5",
        "edit" to "m15 4 5 5 M3 21l5-1L21 7l-5-5L3 15z",
        "trash" to "M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7",
        "info" to "M12 11v6 M12 7h.01 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
        "back" to "M20 12H4 m6-6-6 6 6 6",
        "sliders" to "M3 7h7 M16 7h5 M3 17h3 M12 17h9 M16 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0 M12 17a3 3 0 1 1-6 0 3 3 0 0 1 6 0",
        "clock" to "M12 7v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0",
        "single" to "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z",
        "double" to "M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z M12 3v18",
        "folder" to "M3 7V4h7l2 3h9v13H3V7Z"
    )
}

@Composable
fun KataKecilIcon(
    name: String,
    modifier: Modifier = Modifier,
    size: Dp = 20.dp,
    tint: Color = LocalKataKecilPalette.current.textPrimary,
    strokeWidth: Float = 2.2f
) {
    val rawPath = KataKecilIcons.Paths[name] ?: KataKecilIcons.Paths["book"]!!
    val parsedPath = remember(rawPath) {
        PathParser().parsePathString(rawPath).toPath()
    }

    Canvas(modifier = modifier.size(size)) {
        val scaleX = this.size.width / 24f
        val scaleY = this.size.height / 24f
        val scaledPath = Path().apply {
            addPath(parsedPath)
            transform(Matrix().apply {
                scale(scaleX, scaleY, 1f)
            })
        }
        drawPath(
            path = scaledPath,
            color = tint,
            style = Stroke(
                width = strokeWidth * scaleX,
                cap = StrokeCap.Round,
                join = StrokeJoin.Round
            )
        )
    }
}
