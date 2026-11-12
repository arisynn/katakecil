package id.karisyono.katakecil.core.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import id.karisyono.katakecil.R
import id.karisyono.katakecil.core.model.DeviceSettings
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow

object KataKecilFonts {
    val Ui = FontFamily.Default

    val DmSans = FontFamily(
        Font(R.font.dm_sans_regular, FontWeight.Normal),
        Font(R.font.dm_sans_medium, FontWeight.Medium),
        Font(R.font.dm_sans_semibold, FontWeight.SemiBold),
        Font(R.font.dm_sans_bold, FontWeight.Bold)
    )

    val Fraunces = FontFamily(
        Font(R.font.fraunces_regular, FontWeight.Normal),
        Font(R.font.fraunces_medium, FontWeight.Medium),
        Font(R.font.fraunces_semibold, FontWeight.SemiBold)
    )

    val Lora = FontFamily(
        Font(R.font.lora_regular, FontWeight.Normal),
        Font(R.font.lora_italic, FontWeight.Normal, FontStyle.Italic),
        Font(R.font.lora_medium, FontWeight.Medium),
        Font(R.font.lora_semibold, FontWeight.SemiBold)
    )

    val PlusJakartaSans = FontFamily(
        Font(R.font.plus_jakarta_sans_regular, FontWeight.Normal),
        Font(R.font.dm_sans_medium, FontWeight.Medium),
        Font(R.font.dm_sans_semibold, FontWeight.SemiBold)
    )

    val Merriweather = FontFamily(
        Font(R.font.merriweather_regular, FontWeight.Normal),
        Font(R.font.lora_semibold, FontWeight.SemiBold)
    )

    val JetBrainsMono = FontFamily(
        Font(R.font.jetbrains_mono_regular, FontWeight.Normal)
    )

    fun resolveReadingFont(fontFamilyName: String): FontFamily {
        return when (fontFamilyName.trim()) {
            "Lora" -> Lora
            "Plus Jakarta Sans" -> PlusJakartaSans
            "DM Sans" -> DmSans
            "Georgia", "Merriweather" -> Merriweather
            "monospace", "JetBrains Mono" -> JetBrainsMono
            "system" -> FontFamily.SansSerif
            else -> Lora
        }
    }
}

@Immutable
data class KataKecilPalette(
    val id: String,
    val isDark: Boolean,
    val background: Color,
    val surface: Color,
    val surfaceElevated: Color,
    val textPrimary: Color,
    val textSecondary: Color,
    val textMuted: Color,
    val readingPaper: Color,
    val readingText: Color,
    val readingMuted: Color,
    val accent: Color,
    val border: Color,
    val glassFillAlpha: Float,
    val glassBlurDp: Float,
    val ambientIntensity: Float
)

data class AccentPreset(
    val id: String,
    val labelId: String,
    val labelEn: String,
    val hex: String,
    val color: Color
)

object KataKecilThemeTokens {
    val AccentPresets = listOf(
        AccentPreset("sage", "Sage", "Sage", "#54756c", Color(0xFF54756C)),
        AccentPreset("blue", "Biru", "Blue", "#4269a5", Color(0xFF4269A5)),
        AccentPreset("purple", "Ungu", "Purple", "#82669c", Color(0xFF82669C)),
        AccentPreset("rose", "Rose", "Rose", "#a15e73", Color(0xFFA15E73)),
        AccentPreset("amber", "Amber", "Amber", "#a07732", Color(0xFFA07732)),
        AccentPreset("graphite", "Graphite", "Graphite", "#58616e", Color(0xFF58616E))
    )

    fun highlightColor(name: String, isDark: Boolean): Color {
        return when (name.lowercase()) {
            "emerald" -> if (isDark) Color(0x66589E72) else Color(0x99A4C9AE)
            "sapphire" -> if (isDark) Color(0x665E8BC2) else Color(0x99ACC7E6)
            "rose" -> if (isDark) Color(0x66B86B82) else Color(0x99E4B3C3)
            else -> if (isDark) Color(0x66C49E42) else Color(0x99E7CA7E) // amber
        }
    }

    fun highlightSwatchColor(name: String): Color {
        return when (name.lowercase()) {
            "emerald" -> Color(0xFFA4C9AE)
            "sapphire" -> Color(0xFFACC7E6)
            "rose" -> Color(0xFFE4B3C3)
            else -> Color(0xFFE7CA7E)
        }
    }

    fun parseHexColor(hex: String?, fallback: Color): Color {
        if (hex.isNullOrBlank()) return fallback
        val clean = hex.trim().removePrefix("#")
        if (clean.length != 6 || !clean.all { it.isDigit() || it.lowercaseChar() in 'a'..'f' }) {
            return fallback
        }
        return try {
            val rgb = clean.toLong(16)
            Color(0xFF000000 or rgb)
        } catch (_: Exception) {
            fallback
        }
    }

    fun colorToHex(color: Color): String {
        val r = (color.red * 255f).toInt().coerceIn(0, 255)
        val g = (color.green * 255f).toInt().coerceIn(0, 255)
        val b = (color.blue * 255f).toInt().coerceIn(0, 255)
        return String.format("#%02x%02x%02x", r, g, b)
    }

    fun relativeLuminance(color: Color): Double {
        fun channel(v: Float): Double {
            val c = v.toDouble().coerceIn(0.0, 1.0)
            return if (c <= 0.03928) c / 12.92 else ((c + 0.055) / 1.055).pow(2.4)
        }
        return 0.2126 * channel(color.red) + 0.7152 * channel(color.green) + 0.0722 * channel(color.blue)
    }

    fun contrastRatio(first: Color, second: Color): Double {
        val l1 = relativeLuminance(first)
        val l2 = relativeLuminance(second)
        val lighter = max(l1, l2)
        val darker = min(l1, l2)
        return (lighter + 0.05) / (darker + 0.05)
    }

    fun resolvePalette(
        settings: DeviceSettings,
        systemDark: Boolean
    ): KataKecilPalette {
        val accent = parseHexColor(settings.accentColor, Color(0xFF54756C))
        val transparency = settings.glassTransparency.coerceIn(0, 100)
        val glassFillAlpha = ((100f - transparency) / 100f).coerceIn(0f, 1f)
        val glassBlurDp = settings.glassBlur.coerceIn(0, 40).toFloat()
        val ambientIntensity = (settings.ambientIntensity.coerceIn(0, 100) / 100f)

        val effectiveGlobalMode = when (settings.themeMode) {
            "system", "auto-sensor" -> if (systemDark) "dark" else "light"
            "dark", "sepia", "paper", "green", "custom" -> settings.themeMode
            else -> "light"
        }

        val (bg, surface, textPrimary, isDarkGlobal, defaultPaper, defaultReadingInk) = when (effectiveGlobalMode) {
            "dark" -> PaletteBase(
                bg = Color(0xFF11161C),
                surface = Color(0xFF182028),
                text = Color(0xFFE6EDF3),
                isDark = true,
                paper = Color(0xFF191D1B),
                ink = Color(0xFFDDDCD4)
            )
            "sepia" -> PaletteBase(
                bg = Color(0xFFEEE2C8),
                surface = Color(0xFFF5ECD7),
                text = Color(0xFF4C3B2A),
                isDark = false,
                paper = Color(0xFFEEE2C8),
                ink = Color(0xFF4C3B2A)
            )
            "paper" -> PaletteBase(
                bg = Color(0xFFF1F0E9),
                surface = Color(0xFFF8F7F2),
                text = Color(0xFF353B36),
                isDark = false,
                paper = Color(0xFFF1F0E9),
                ink = Color(0xFF353B36)
            )
            "green" -> PaletteBase(
                bg = Color(0xFFDCE8D9),
                surface = Color(0xFFE6F0E4),
                text = Color(0xFF293D30),
                isDark = false,
                paper = Color(0xFFDCE8D9),
                ink = Color(0xFF293D30)
            )
            "custom" -> {
                val customInk = parseHexColor(settings.customTextColor, Color(0xFF1F2933))
                val customBg = parseHexColor(settings.customBackgroundColor, Color(0xFFF7F4EB))
                if (contrastRatio(customInk, customBg) >= 4.5) {
                    val dark = relativeLuminance(customBg) < 0.28
                    PaletteBase(
                        bg = customBg,
                        surface = customBg,
                        text = customInk,
                        isDark = dark,
                        paper = customBg,
                        ink = customInk
                    )
                } else {
                    PaletteBase(
                        bg = Color(0xFFEEF2F6),
                        surface = Color(0xFFF8FAFC),
                        text = Color(0xFF25313B),
                        isDark = false,
                        paper = Color(0xFFFAF9F5),
                        ink = Color(0xFF28302B)
                    )
                }
            }
            else -> PaletteBase(
                bg = Color(0xFFEEF2F6),
                surface = Color(0xFFF8FAFC),
                text = Color(0xFF25313B),
                isDark = false,
                paper = Color(0xFFFAF9F5),
                ink = Color(0xFF28302B)
            )
        }

        val readerMode = if (settings.readerTheme == "follow") effectiveGlobalMode else settings.readerTheme
        val (readingPaper, readingInk) = when (readerMode) {
            "dark" -> Color(0xFF191D1B) to Color(0xFFDDDCD4)
            "sepia" -> Color(0xFFEEE2C8) to Color(0xFF4C3B2A)
            "paper" -> Color(0xFFF1F0E9) to Color(0xFF353B36)
            "green" -> Color(0xFFDCE8D9) to Color(0xFF293D30)
            "custom" -> {
                val customInk = parseHexColor(settings.customTextColor, Color(0xFF1F2933))
                val customBg = parseHexColor(settings.customBackgroundColor, Color(0xFFF7F4EB))
                if (contrastRatio(customInk, customBg) >= 4.5) {
                    customBg to customInk
                } else {
                    Color(0xFFFAF9F5) to Color(0xFF28302B)
                }
            }
            "light" -> Color(0xFFFAF9F5) to Color(0xFF28302B)
            else -> defaultPaper to defaultReadingInk
        }

        return KataKecilPalette(
            id = effectiveGlobalMode,
            isDark = isDarkGlobal,
            background = bg,
            surface = androidx.compose.ui.graphics.lerp(bg, textPrimary, .035f),
            surfaceElevated = androidx.compose.ui.graphics.lerp(bg, textPrimary, .035f),
            textPrimary = textPrimary,
            textSecondary = androidx.compose.ui.graphics.lerp(bg, textPrimary, .64f),
            textMuted = androidx.compose.ui.graphics.lerp(bg, textPrimary, .64f),
            readingPaper = readingPaper,
            readingText = readingInk,
            readingMuted = readingInk.copy(alpha = 0.62f),
            accent = accent,
            border = androidx.compose.ui.graphics.lerp(bg, textPrimary, .14f),
            glassFillAlpha = glassFillAlpha,
            glassBlurDp = glassBlurDp,
            ambientIntensity = ambientIntensity
        )
    }

    private data class PaletteBase(
        val bg: Color,
        val surface: Color,
        val text: Color,
        val isDark: Boolean,
        val paper: Color,
        val ink: Color
    )
}

val LocalKataKecilPalette = staticCompositionLocalOf {
    KataKecilThemeTokens.resolvePalette(DeviceSettings(), systemDark = false)
}

@Composable
fun KataKecilTheme(
    settings: DeviceSettings,
    content: @Composable () -> Unit
) {
    val systemDark = isSystemInDarkTheme()
    val palette = KataKecilThemeTokens.resolvePalette(settings, systemDark)
    val colorScheme = if (palette.isDark) {
        darkColorScheme(
            primary = palette.accent,
            secondary = palette.accent,
            background = palette.background,
            surface = palette.surface,
            onPrimary = Color.White,
            onBackground = palette.textPrimary,
            onSurface = palette.textPrimary
        )
    } else {
        lightColorScheme(
            primary = palette.accent,
            secondary = palette.accent,
            background = palette.background,
            surface = palette.surface,
            onPrimary = Color.White,
            onBackground = palette.textPrimary,
            onSurface = palette.textPrimary
        )
    }

    CompositionLocalProvider(LocalKataKecilPalette provides palette) {
        MaterialTheme(
            colorScheme = colorScheme,
            typography = androidx.compose.material3.Typography().let { t ->
                val ui = androidx.compose.ui.text.TextStyle(fontFamily = KataKecilFonts.Ui, platformStyle = androidx.compose.ui.text.PlatformTextStyle(includeFontPadding = false))
                t.copy(bodyLarge = ui, bodyMedium = ui, bodySmall = ui, titleLarge = ui, titleMedium = ui, titleSmall = ui, labelLarge = ui, labelMedium = ui, labelSmall = ui)
            },
            content = content
        )
    }
}
