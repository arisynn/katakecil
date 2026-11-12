package id.karisyono.katakecil.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.karisyono.katakecil.core.i18n.I18n
import id.karisyono.katakecil.core.model.DeviceSettings
import id.karisyono.katakecil.core.theme.KataKecilFonts
import id.karisyono.katakecil.core.theme.KataKecilThemeTokens
import id.karisyono.katakecil.core.theme.LocalKataKecilPalette

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
