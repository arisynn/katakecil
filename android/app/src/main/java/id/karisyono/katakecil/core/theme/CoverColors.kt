package id.karisyono.katakecil.core.theme

import android.graphics.Bitmap
import androidx.compose.ui.graphics.Color
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Port of dist/cover-colors.js:
 * Extracts the dominant balanced RGB color from a cover Bitmap (downsampled to 24x24),
 * skipping near-white, near-black, and transparent pixels, and applying a 1.15x saturation boost.
 */
object CoverColors {
    val DefaultCoverColor = Color(84, 117, 108) // #54756c

    fun extractDominantColor(bitmap: Bitmap?): Color {
        if (bitmap == null || bitmap.width <= 0 || bitmap.height <= 0) {
            return DefaultCoverColor
        }
        return try {
            val scaled = Bitmap.createScaledBitmap(bitmap, 24, 24, true)
            var rSum = 0.0
            var gSum = 0.0
            var bSum = 0.0
            var weightSum = 0.0

            val pixels = IntArray(24 * 24)
            scaled.getPixels(pixels, 0, 24, 0, 0, 24, 24)
            for (pixel in pixels) {
                val a = (pixel ushr 24) and 0xFF
                if (a < 96) continue
                val r = (pixel ushr 16) and 0xFF
                val g = (pixel ushr 8) and 0xFF
                val b = pixel and 0xFF
                val lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
                if (lum < 22.0 || lum > 236.0) continue
                val maxCh = max(r, max(g, b))
                val minCh = min(r, min(g, b))
                val spread = (maxCh - minCh).toDouble()
                val weight = 1.0 + (spread / 255.0) * 1.4
                rSum += r * weight
                gSum += g * weight
                bSum += b * weight
                weightSum += weight
            }

            if (weightSum <= 0.0) {
                return DefaultCoverColor
            }

            val avgR = rSum / weightSum
            val avgG = gSum / weightSum
            val avgB = bSum / weightSum
            val mean = (avgR + avgG + avgB) / 3.0
            val boost = 1.15
            val finalR = (mean + (avgR - mean) * boost).roundToInt().coerceIn(36, 214)
            val finalG = (mean + (avgG - mean) * boost).roundToInt().coerceIn(36, 214)
            val finalB = (mean + (avgB - mean) * boost).roundToInt().coerceIn(36, 214)
            Color(finalR, finalG, finalB)
        } catch (_: Throwable) {
            DefaultCoverColor
        }
    }
}
