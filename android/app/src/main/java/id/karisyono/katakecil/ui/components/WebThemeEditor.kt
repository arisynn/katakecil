package id.karisyono.katakecil.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.Alignment
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.karisyono.katakecil.core.i18n.I18n
import id.karisyono.katakecil.core.model.DeviceSettings
import id.karisyono.katakecil.core.theme.KataKecilFonts
import id.karisyono.katakecil.core.theme.KataKecilThemeTokens
import id.karisyono.katakecil.core.theme.LocalKataKecilPalette

@Composable
fun WebThemeChoices(settings: DeviceSettings, onSelected: (String) -> Unit) {
    val palette = LocalKataKecilPalette.current
    val lang = settings.uiLanguage
    val options = listOf("light", "dark", "system", "sepia", "paper", "green", "custom")
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        options.chunked(4).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                row.forEach { mode ->
                    val sample = KataKecilThemeTokens.resolvePalette(settings.copy(themeMode = mode), palette.isDark)
                    val label = when (mode) {
                        "light" -> I18n.t("Terang", "Light", lang); "dark" -> I18n.t("Gelap", "Dark", lang)
                        "system" -> I18n.t("Sistem", "System", lang); "paper" -> I18n.t("Kertas", "Paper", lang)
                        "green" -> I18n.t("Hijau", "Green", lang); "custom" -> I18n.t("Kustom", "Custom", lang); else -> "Sepia"
                    }
                    Column(Modifier.weight(1f).border(1.dp, if (settings.themeMode == mode) palette.accent else palette.border, RoundedCornerShape(13.dp))
                        .background(if (settings.themeMode == mode) palette.accent.copy(alpha = .06f) else Color.Transparent, RoundedCornerShape(13.dp))
                        .clickable { onSelected(mode) }.padding(horizontal = 4.dp, vertical = 9.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Box(Modifier.size(37.dp, 31.dp).background(if (mode == "system") Brush.horizontalGradient(0f to Color(0xFFFAF9F5), .49f to Color(0xFFFAF9F5), .5f to Color(0xFF191D1B), 1f to Color(0xFF191D1B)) else Brush.linearGradient(listOf(sample.readingPaper, sample.readingPaper)), RoundedCornerShape(8.dp)), contentAlignment = Alignment.Center) {
                            Text("Aa", color = sample.readingText, fontFamily = KataKecilFonts.Lora, fontSize = 18.sp)
                        }
                        Spacer(Modifier.height(6.dp))
                        Text(label, color = if (settings.themeMode == mode) palette.accent else palette.textPrimary, fontSize = 10.sp, fontWeight = FontWeight.SemiBold)
                    }
                }
                repeat(4 - row.size) { Spacer(Modifier.weight(1f)) }
            }
        }
    }
}

@Composable
fun CustomThemeEditor(settings: DeviceSettings, onUpdateSettings: ((DeviceSettings) -> DeviceSettings) -> Unit, onDismiss: () -> Unit) {
    val palette = LocalKataKecilPalette.current
    val lang = settings.uiLanguage
    var inkHex by remember { mutableStateOf(settings.customTextColor) }
    var paperHex by remember { mutableStateOf(settings.customBackgroundColor) }
    var editing by remember { mutableStateOf<String?>(null) }
    val ink = KataKecilThemeTokens.parseHexColor(inkHex, palette.readingText)
    val paper = KataKecilThemeTokens.parseHexColor(paperHex, palette.readingPaper)
    val contrast = KataKecilThemeTokens.contrastRatio(ink, paper)
    WebBottomSheet(I18n.t("Tema kustom", "Custom theme", lang), onDismiss,
        footer = {
            GlassPillButton(I18n.t("Terapkan warna", "Apply colors", lang), {
                onUpdateSettings { it.copy(themeMode = "custom", readerTheme = "follow", customTextColor = inkHex, customBackgroundColor = paperHex) }; onDismiss()
            }, Modifier.fillMaxWidth(), primary = true, enabled = contrast >= 4.5)
        }) {
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            GlassPillButton(I18n.t("Warna teks", "Text color", lang), { editing = "text" }, Modifier.weight(1f), leadingIcon = "type")
            GlassPillButton(I18n.t("Latar", "Background", lang), { editing = "background" }, Modifier.weight(1f), leadingIcon = "palette")
        }
        Column(Modifier.fillMaxWidth().background(paper).padding(20.dp)) {
            Text("KataKecil", color = ink, fontFamily = KataKecilFonts.Lora, fontSize = 22.sp)
            Spacer(Modifier.height(8.dp))
            Text(I18n.t("Ruang tenang untuk cerita berikutnya.", "A quieter place for your next chapter.", lang), color = ink, fontFamily = KataKecilFonts.Lora, fontSize = 15.sp)
            Text(String.format("%.1f:1", contrast), color = ink, modifier = Modifier.padding(top = 12.dp), fontSize = 11.sp)
        }
        if (contrast < 4.5) Text(I18n.t("Naikkan kontras teks dan latar sebelum menerapkan.", "Increase text/background contrast before applying.", lang), color = palette.textPrimary, fontSize = 12.sp)
    }
    editing?.let { target ->
        ColorWheelPickerDialog(I18n.t(if (target == "text") "Warna teks" else "Warna latar", if (target == "text") "Text color" else "Background color", lang),
            if (target == "text") inkHex else paperHex, { editing = null },
            { hex -> if (target == "text") inkHex = hex else paperHex = hex; editing = null })
    }
}
