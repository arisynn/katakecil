package id.karisyono.katakecil.ui.settings

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Checkbox
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.Dialog
import id.karisyono.katakecil.BuildConfig
import id.karisyono.katakecil.core.i18n.I18n
import id.karisyono.katakecil.core.model.AnnotationItem
import id.karisyono.katakecil.core.model.BackupPreview
import id.karisyono.katakecil.core.model.BookMeta
import id.karisyono.katakecil.core.model.DeviceSettings
import id.karisyono.katakecil.core.model.DownloadedUpdateState
import id.karisyono.katakecil.core.model.ImportEpubPreview
import id.karisyono.katakecil.core.model.ReadingProgress
import id.karisyono.katakecil.core.model.UpdateReleaseInfo
import id.karisyono.katakecil.core.theme.KataKecilFonts
import id.karisyono.katakecil.core.theme.KataKecilThemeTokens
import id.karisyono.katakecil.core.theme.LocalKataKecilPalette
import id.karisyono.katakecil.data.remote.AppUpdateManager
import id.karisyono.katakecil.ui.components.AmbientBackground
import id.karisyono.katakecil.ui.components.BookCoverView
import id.karisyono.katakecil.ui.components.ColorWheelPickerDialog
import id.karisyono.katakecil.ui.components.GlassIconButton
import id.karisyono.katakecil.ui.components.GlassPillButton
import id.karisyono.katakecil.ui.components.GlassSurface
import id.karisyono.katakecil.ui.components.KataKecilIcon
import id.karisyono.katakecil.ui.components.LoadingWordmark
import id.karisyono.katakecil.ui.reader.LabeledLiveSlider
import id.karisyono.katakecil.ui.reader.SettingToggleRow
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.roundToInt

/**
 * Complete Settings Screen & Dialogs (port of Settings in dist/app.js, dist/glass-settings.js,
 * dist/local-books.js, dist/loading-previews.js, and dist/app-updates.js).
 */
@Composable
fun SettingsScreen(
    settings: DeviceSettings,
    localBooks: List<BookMeta>,
    progressMap: Map<String, ReadingProgress>,
    annotations: List<AnnotationItem>,
    storageBytesUsed: Long,
    onUpdateSettings: ((DeviceSettings) -> DeviceSettings) -> Unit,
    onBack: () -> Unit,
    onSaveBackupClick: () -> Unit,
    onRestoreBackupClick: () -> Unit,
    onExportNotesClick: () -> Unit,
    onImportEpubClick: () -> Unit,
    onOpenLocalBook: (BookMeta) -> Unit,
    onReplaceLocalBookCover: (BookMeta) -> Unit,
    onResetLocalBookCover: (BookMeta) -> Unit,
    onDeleteLocalBook: (BookMeta) -> Unit,
    onOpenPublisherStudio: () -> Unit,
    onShowToast: (String) -> Unit
) {
    val palette = LocalKataKecilPalette.current
    val lang = settings.uiLanguage

    var showGlobalThemeDialog by remember { mutableStateOf(false) }
    var showLiquidGlassDialog by remember { mutableStateOf(false) }
    var showPersonalEpubsDialog by remember { mutableStateOf(false) }
    var showStorageDialog by remember { mutableStateOf(false) }
    var showLoadingPreviewDialog by remember { mutableStateOf(false) }
    var showAboutLicensesDialog by remember { mutableStateOf(false) }
    var showAppUpdatesDialog by remember { mutableStateOf(false) }

    AmbientBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 20.dp, vertical = 14.dp)
        ) {
            // Header
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.SpaceBetween
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    GlassIconButton(
                        iconName = "back",
                        contentDescription = I18n.t("Kembali", "Back", lang),
                        onClick = onBack
                    )
                    Text(
                        text = I18n.t("Pengaturan", "Settings", lang),
                        color = palette.textPrimary,
                        fontFamily = KataKecilFonts.Fraunces,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 22.sp
                    )
                }
            }

            Spacer(modifier = Modifier.height(16.dp))

            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Section 1: Appearance & Language
                SettingsSectionCard(
                    title = I18n.t("Tampilan & Bahasa", "Appearance & Language", lang)
                ) {
                    SettingsActionRow(
                        iconName = "palette",
                        title = I18n.t("Tema Global", "Global Theme", lang),
                        subtitle = "${settings.themeMode.replaceFirstChar { it.uppercase() }} · ${settings.accentColor}",
                        onClick = { showGlobalThemeDialog = true }
                    )
                    SettingsActionRow(
                        iconName = "sparkle",
                        title = "Liquid Glass",
                        subtitle = "${settings.glassTransparency}% · ${settings.glassBlur}px · Ambient ${settings.ambientIntensity}%",
                        onClick = { showLiquidGlassDialog = true }
                    )
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 6.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(12.dp)
                        ) {
                            KataKecilIcon(name = "globe", size = 20.dp, tint = palette.accent)
                            Text(
                                text = I18n.t("Bahasa Antarmuka", "Interface Language", lang),
                                color = palette.textPrimary,
                                fontFamily = KataKecilFonts.DmSans,
                                fontWeight = FontWeight.Medium,
                                fontSize = 14.5.sp
                            )
                        }
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            GlassPillButton(
                                text = "ID",
                                primary = settings.uiLanguage != "en",
                                onClick = {
                                    onUpdateSettings {
                                        it.copy(uiLanguage = "id", uiLanguageChosen = true)
                                    }
                                }
                            )
                            GlassPillButton(
                                text = "EN",
                                primary = settings.uiLanguage == "en",
                                onClick = {
                                    onUpdateSettings {
                                        it.copy(uiLanguage = "en", uiLanguageChosen = true)
                                    }
                                }
                            )
                        }
                    }
                }

                // Section 2: Device Backup & Notes
                SettingsSectionCard(
                    title = I18n.t("Cadangan Perangkat", "Device Backup", lang)
                ) {
                    SettingsActionRow(
                        iconName = "download",
                        title = I18n.t("Simpan cadangan", "Save backup", lang),
                        subtitle = I18n.t(
                            "Simpan progres baca, sorotan, catatan & pengaturan (katakecil-backup.json)",
                            "Save reading progress, highlights, notes & settings (katakecil-backup.json)",
                            lang
                        ),
                        onClick = onSaveBackupClick
                    )
                    SettingsActionRow(
                        iconName = "upload",
                        title = I18n.t("Pulihkan cadangan", "Restore backup", lang),
                        subtitle = I18n.t(
                            "Gabungkan file cadangan JSON ke perangkat ini",
                            "Merge a backup JSON file into this device",
                            lang
                        ),
                        onClick = onRestoreBackupClick
                    )
                    SettingsActionRow(
                        iconName = "notes",
                        title = I18n.t("Ekspor catatan", "Export notes", lang),
                        subtitle = "${annotations.size} ${I18n.t("item tersimpan", "saved items", lang)}",
                        onClick = onExportNotesClick
                    )
                }

                // Section 3: App Updates
                SettingsSectionCard(
                    title = I18n.t("Pembaruan Aplikasi", "App Updates", lang)
                ) {
                    SettingsActionRow(
                        iconName = "cloud",
                        title = I18n.t("Periksa pembaruan", "Check for updates", lang),
                        subtitle = "KataKecil v${BuildConfig.VERSION_NAME} (build ${BuildConfig.VERSION_CODE})",
                        onClick = { showAppUpdatesDialog = true }
                    )
                }

                // Section 4: Advanced & Publisher
                SettingsSectionCard(
                    title = I18n.t("Lanjutan", "Advanced", lang)
                ) {
                    SettingsActionRow(
                        iconName = "book",
                        title = I18n.t("EPUB Pribadi", "Personal EPUBs", lang),
                        subtitle = "${localBooks.size} ${I18n.t("buku lokal di perangkat", "local books on device", lang)}",
                        onClick = { showPersonalEpubsDialog = true }
                    )
                    SettingsActionRow(
                        iconName = "device",
                        title = I18n.t("Penyimpanan perangkat", "Device storage", lang),
                        subtitle = formatBytes(storageBytesUsed),
                        onClick = { showStorageDialog = true }
                    )
                    SettingsActionRow(
                        iconName = "sparkle",
                        title = I18n.t("Pratinjau muat", "Loading preview", lang),
                        subtitle = I18n.t("Animasi gelombang wordmark KataKecil", "KataKecil wordmark wave animation", lang),
                        onClick = { showLoadingPreviewDialog = true }
                    )
                    SettingsActionRow(
                        iconName = "shield",
                        title = "Publisher Studio",
                        subtitle = I18n.t("Kelola buku & jadwal episode terbitan", "Manage published books & episode schedules", lang),
                        onClick = onOpenPublisherStudio
                    )
                    SettingsActionRow(
                        iconName = "info",
                        title = I18n.t("Tentang & Lisensi", "About & Licenses", lang),
                        subtitle = I18n.t("Atribusi sumber terbuka & lisensi font", "Open-source attributions & font licenses", lang),
                        onClick = { showAboutLicensesDialog = true }
                    )
                }

                Spacer(modifier = Modifier.height(28.dp))
            }
        }
    }

    if (showGlobalThemeDialog) {
        GlobalThemeDialog(
            settings = settings,
            lang = lang,
            onUpdateSettings = onUpdateSettings,
            onDismiss = { showGlobalThemeDialog = false }
        )
    }

    if (showLiquidGlassDialog) {
        LiquidGlassSettingsDialog(
            settings = settings,
            lang = lang,
            onUpdateSettings = onUpdateSettings,
            onDismiss = { showLiquidGlassDialog = false }
        )
    }

    if (showPersonalEpubsDialog) {
        PersonalEpubsDialog(
            localBooks = localBooks,
            lang = lang,
            onImportClick = {
                showPersonalEpubsDialog = false
                onImportEpubClick()
            },
            onOpenBook = { book ->
                showPersonalEpubsDialog = false
                onOpenLocalBook(book)
            },
            onReplaceCover = onReplaceLocalBookCover,
            onResetCover = onResetLocalBookCover,
            onDeleteBook = onDeleteLocalBook,
            onDismiss = { showPersonalEpubsDialog = false }
        )
    }

    if (showStorageDialog) {
        DeviceStorageDialog(
            settings = settings,
            localBookCount = localBooks.size,
            progressCount = progressMap.size,
            annotationCount = annotations.size,
            storageBytesUsed = storageBytesUsed,
            lang = lang,
            onDismiss = { showStorageDialog = false }
        )
    }

    if (showLoadingPreviewDialog) {
        Dialog(onDismissRequest = { showLoadingPreviewDialog = false }) {
            GlassSurface(
                cornerRadius = 26.dp,
                elevated = true,
                contentPadding = PaddingValues(28.dp),
                modifier = Modifier.fillMaxWidth()
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    LoadingWordmark(
                        caption = I18n.t("Memuat pustaka…", "Loading library…", lang)
                    )
                    Spacer(modifier = Modifier.height(22.dp))
                    GlassPillButton(
                        text = I18n.t("Tutup", "Close", lang),
                        onClick = { showLoadingPreviewDialog = false }
                    )
                }
            }
        }
    }

    if (showAboutLicensesDialog) {
        AboutLicensesDialog(
            lang = lang,
            onDismiss = { showAboutLicensesDialog = false }
        )
    }

    if (showAppUpdatesDialog) {
        AppUpdatesDialog(
            lang = lang,
            onShowToast = onShowToast,
            onDismiss = { showAppUpdatesDialog = false }
        )
    }
}

@Composable
private fun SettingsSectionCard(
    title: String,
    content: @Composable () -> Unit
) {
    val palette = LocalKataKecilPalette.current
    GlassSurface(
        cornerRadius = 24.dp,
        contentPadding = PaddingValues(18.dp),
        modifier = Modifier.fillMaxWidth()
    ) {
        Column(
            modifier = Modifier.fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Text(
                text = title,
                color = palette.accent,
                fontFamily = KataKecilFonts.DmSans,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
                letterSpacing = 0.8.sp
            )
            content()
        }
    }
}

@Composable
private fun SettingsActionRow(
    iconName: String,
    title: String,
    subtitle: String,
    onClick: () -> Unit
) {
    val palette = LocalKataKecilPalette.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(vertical = 8.dp, horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            modifier = Modifier.weight(1f)
        ) {
            Box(
                modifier = Modifier
                    .size(38.dp)
                    .clip(CircleShape)
                    .background(palette.accent.copy(alpha = 0.14f)),
                contentAlignment = Alignment.Center
            ) {
                KataKecilIcon(name = iconName, size = 19.dp, tint = palette.accent)
            }
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = title,
                    color = palette.textPrimary,
                    fontFamily = KataKecilFonts.DmSans,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.5.sp
                )
                Text(
                    text = subtitle,
                    color = palette.textSecondary,
                    fontFamily = KataKecilFonts.DmSans,
                    fontSize = 12.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
        KataKecilIcon(name = "chevron", size = 18.dp, tint = palette.textMuted)
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun GlobalThemeDialog(
    settings: DeviceSettings,
    lang: String,
    onUpdateSettings: ((DeviceSettings) -> DeviceSettings) -> Unit,
    onDismiss: () -> Unit
) {
    val palette = LocalKataKecilPalette.current
    var showColorWheel by remember { mutableStateOf(false) }

    Dialog(onDismissRequest = onDismiss) {
        GlassSurface(
            cornerRadius = 26.dp,
            elevated = true,
            contentPadding = PaddingValues(20.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = I18n.t("Tema Global", "Global Theme", lang),
                        color = palette.textPrimary,
                        fontFamily = KataKecilFonts.Fraunces,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 19.sp
                    )
                    GlassIconButton(
                        iconName = "close",
                        contentDescription = "Tutup",
                        size = 34.dp,
                        iconSize = 16.dp,
                        onClick = onDismiss
                    )
                }

                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf(
                        Triple("light", "sun", I18n.t("Terang (Pearl)", "Light (Pearl)", lang)),
                        Triple("dark", "moon", I18n.t("Gelap (Charcoal)", "Dark (Charcoal)", lang)),
                        Triple("system", "device", I18n.t("Ikuti perangkat", "Follow device", lang)),
                        Triple("sepia", "sepia", "Sepia"),
                        Triple("paper", "paper", I18n.t("Kertas", "Paper", lang)),
                        Triple("green", "leaf", I18n.t("Hijau", "Green", lang)),
                        Triple("custom", "palette", I18n.t("Kustom", "Custom", lang))
                    ).forEach { (modeKey, iconName, label) ->
                        GlassPillButton(
                            text = label,
                            leadingIcon = iconName,
                            primary = settings.themeMode == modeKey,
                            onClick = { onUpdateSettings { it.copy(themeMode = modeKey) } }
                        )
                    }
                }

                Text(
                    text = I18n.t("Warna Aksen", "Accent Color", lang),
                    color = palette.textSecondary,
                    fontFamily = KataKecilFonts.DmSans,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp
                )

                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    KataKecilThemeTokens.AccentPresets.forEach { preset ->
                        val isSelected = settings.accentColor.equals(preset.hex, ignoreCase = true)
                        Box(
                            modifier = Modifier
                                .size(38.dp)
                                .clip(CircleShape)
                                .background(preset.color)
                                .border(
                                    width = if (isSelected) 3.dp else 1.dp,
                                    color = if (isSelected) Color.White else palette.border,
                                    shape = CircleShape
                                )
                                .clickable {
                                    onUpdateSettings { it.copy(accentColor = preset.hex) }
                                }
                        )
                    }
                    GlassPillButton(
                        text = I18n.t("Roda Warna", "Color Wheel", lang),
                        leadingIcon = "palette",
                        onClick = { showColorWheel = true }
                    )
                }
            }
        }
    }

    if (showColorWheel) {
        ColorWheelPickerDialog(
            title = I18n.t("Pilih Warna Aksen", "Pick Accent Color", lang),
            initialHex = settings.accentColor,
            onDismiss = { showColorWheel = false },
            onColorSelected = { hex ->
                onUpdateSettings { it.copy(accentColor = hex) }
                showColorWheel = false
            }
        )
    }
}

/**
 * Port of dist/glass-settings.js & docs/liquid-glass-settings.md
 */
@Composable
private fun LiquidGlassSettingsDialog(
    settings: DeviceSettings,
    lang: String,
    onUpdateSettings: ((DeviceSettings) -> DeviceSettings) -> Unit,
    onDismiss: () -> Unit
) {
    val palette = LocalKataKecilPalette.current

    Dialog(onDismissRequest = onDismiss) {
        GlassSurface(
            cornerRadius = 26.dp,
            elevated = true,
            contentPadding = PaddingValues(20.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(14.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = "Liquid Glass",
                        color = palette.textPrimary,
                        fontFamily = KataKecilFonts.Fraunces,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 19.sp
                    )
                    GlassIconButton(
                        iconName = "close",
                        contentDescription = "Tutup",
                        size = 34.dp,
                        iconSize = 16.dp,
                        onClick = onDismiss
                    )
                }

                // Live Preview Stage
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(110.dp)
                        .clip(RoundedCornerShape(20.dp))
                ) {
                    AmbientBackground {
                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .padding(16.dp),
                            contentAlignment = Alignment.Center
                        ) {
                            GlassSurface(
                                cornerRadius = 18.dp,
                                contentPadding = PaddingValues(horizontal = 18.dp, vertical = 12.dp)
                            ) {
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    KataKecilIcon(name = "sparkle", size = 18.dp, tint = palette.accent)
                                    Text(
                                        text = I18n.t("Pratinjau Kaca Langsung", "Live Glass Preview", lang),
                                        color = palette.textPrimary,
                                        fontFamily = KataKecilFonts.DmSans,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 13.5.sp
                                    )
                                }
                            }
                        }
                    }
                }

                LabeledLiveSlider(
                    label = I18n.t("Transparansi kaca", "Glass transparency", lang),
                    valueText = "${settings.glassTransparency}%",
                    value = settings.glassTransparency.toFloat(),
                    valueRange = 0f..100f,
                    onValueChange = { v ->
                        onUpdateSettings { it.copy(glassTransparency = v.roundToInt().coerceIn(0, 100)) }
                    },
                    onValueChangeFinished = {}
                )

                LabeledLiveSlider(
                    label = I18n.t("Blur kaca", "Glass blur", lang),
                    valueText = "${settings.glassBlur} px",
                    value = settings.glassBlur.toFloat(),
                    valueRange = 0f..40f,
                    onValueChange = { v ->
                        onUpdateSettings { it.copy(glassBlur = v.roundToInt().coerceIn(0, 40)) }
                    },
                    onValueChangeFinished = {}
                )

                LabeledLiveSlider(
                    label = I18n.t("Pendaran ambient", "Ambient glow", lang),
                    valueText = "${settings.ambientIntensity}%",
                    value = settings.ambientIntensity.toFloat(),
                    valueRange = 0f..100f,
                    onValueChange = { v ->
                        onUpdateSettings { it.copy(ambientIntensity = v.roundToInt().coerceIn(0, 100)) }
                    },
                    onValueChangeFinished = {}
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    GlassPillButton(
                        text = I18n.t("Kembalikan ke awal", "Reset to default", lang),
                        leadingIcon = "refresh",
                        onClick = {
                            onUpdateSettings {
                                it.copy(
                                    glassTransparency = 75,
                                    glassBlur = 20,
                                    ambientIntensity = 60
                                )
                            }
                        }
                    )
                    GlassPillButton(
                        text = I18n.t("Selesai", "Done", lang),
                        primary = true,
                        onClick = onDismiss
                    )
                }
            }
        }
    }
}

@Composable
private fun PersonalEpubsDialog(
    localBooks: List<BookMeta>,
    lang: String,
    onImportClick: () -> Unit,
    onOpenBook: (BookMeta) -> Unit,
    onReplaceCover: (BookMeta) -> Unit,
    onResetCover: (BookMeta) -> Unit,
    onDeleteBook: (BookMeta) -> Unit,
    onDismiss: () -> Unit
) {
    val palette = LocalKataKecilPalette.current

    Dialog(onDismissRequest = onDismiss) {
        GlassSurface(
            cornerRadius = 26.dp,
            elevated = true,
            contentPadding = PaddingValues(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 560.dp)
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = I18n.t("EPUB Pribadi", "Personal EPUBs", lang),
                        color = palette.textPrimary,
                        fontFamily = KataKecilFonts.Fraunces,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 19.sp
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        GlassIconButton(
                            iconName = "plus",
                            contentDescription = "Impor EPUB",
                            size = 34.dp,
                            iconSize = 16.dp,
                            onClick = onImportClick
                        )
                        GlassIconButton(
                            iconName = "close",
                            contentDescription = "Tutup",
                            size = 34.dp,
                            iconSize = 16.dp,
                            onClick = onDismiss
                        )
                    }
                }

                if (localBooks.isEmpty()) {
                    Text(
                        text = I18n.t(
                            "Belum ada EPUB pribadi yang diimpor ke perangkat ini.",
                            "No personal EPUBs imported on this device yet.",
                            lang
                        ),
                        color = palette.textSecondary,
                        fontFamily = KataKecilFonts.DmSans,
                        fontSize = 13.5.sp
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.weight(1f, fill = false),
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        items(localBooks, key = { it.id }) { book ->
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(palette.surface.copy(alpha = 0.65f))
                                    .border(1.dp, palette.border, RoundedCornerShape(16.dp))
                                    .padding(12.dp),
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                BookCoverView(
                                    title = book.title,
                                    author = book.author,
                                    coverUrl = book.effectiveCover,
                                    cornerRadius = 10.dp,
                                    modifier = Modifier
                                        .width(56.dp)
                                        .height(82.dp)
                                        .clickable { onOpenBook(book) }
                                )

                                Column(
                                    modifier = Modifier.weight(1f),
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Text(
                                        text = book.title,
                                        color = palette.textPrimary,
                                        fontFamily = KataKecilFonts.Fraunces,
                                        fontWeight = FontWeight.SemiBold,
                                        fontSize = 15.sp,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis
                                    )
                                    Text(
                                        text = "${book.author} · ${book.chapterCount} ep · ${formatBytes(book.sizeBytes)}",
                                        color = palette.textSecondary,
                                        fontFamily = KataKecilFonts.DmSans,
                                        fontSize = 11.5.sp
                                    )
                                    Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                        GlassPillButton(
                                            text = I18n.t("Sampul", "Cover", lang),
                                            onClick = { onReplaceCover(book) }
                                        )
                                        if (book.customCoverDataUrl.isNotBlank()) {
                                            GlassPillButton(
                                                text = I18n.t("Reset", "Reset", lang),
                                                onClick = { onResetCover(book) }
                                            )
                                        }
                                        GlassIconButton(
                                            iconName = "trash",
                                            contentDescription = "Hapus",
                                            size = 32.dp,
                                            iconSize = 15.dp,
                                            onClick = { onDeleteBook(book) }
                                        )
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun DeviceStorageDialog(
    settings: DeviceSettings,
    localBookCount: Int,
    progressCount: Int,
    annotationCount: Int,
    storageBytesUsed: Long,
    lang: String,
    onDismiss: () -> Unit
) {
    val palette = LocalKataKecilPalette.current
    Dialog(onDismissRequest = onDismiss) {
        GlassSurface(
            cornerRadius = 26.dp,
            elevated = true,
            contentPadding = PaddingValues(20.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(10.dp)
            ) {
                Text(
                    text = I18n.t("Penyimpanan Perangkat", "Device Storage", lang),
                    color = palette.textPrimary,
                    fontFamily = KataKecilFonts.Fraunces,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 19.sp
                )
                Text(
                    text = "ID Perangkat: ${settings.deviceId}",
                    color = palette.textSecondary,
                    fontFamily = KataKecilFonts.JetBrainsMono,
                    fontSize = 11.5.sp
                )
                Text(
                    text = "• ${I18n.t("Total ruang terpakai", "Total space used", lang)}: ${formatBytes(storageBytesUsed)}",
                    color = palette.textPrimary,
                    fontFamily = KataKecilFonts.DmSans,
                    fontSize = 13.5.sp
                )
                Text(
                    text = "• ${I18n.t("EPUB pribadi", "Personal EPUBs", lang)}: $localBookCount",
                    color = palette.textPrimary,
                    fontFamily = KataKecilFonts.DmSans,
                    fontSize = 13.5.sp
                )
                Text(
                    text = "• ${I18n.t("Progres buku", "Book progress records", lang)}: $progressCount",
                    color = palette.textPrimary,
                    fontFamily = KataKecilFonts.DmSans,
                    fontSize = 13.5.sp
                )
                Text(
                    text = "• ${I18n.t("Sorotan, catatan & markah", "Highlights, notes & bookmarks", lang)}: $annotationCount",
                    color = palette.textPrimary,
                    fontFamily = KataKecilFonts.DmSans,
                    fontSize = 13.5.sp
                )
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    GlassPillButton(
                        text = I18n.t("Tutup", "Close", lang),
                        primary = true,
                        onClick = onDismiss
                    )
                }
            }
        }
    }
}

@Composable
private fun AboutLicensesDialog(
    lang: String,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val palette = LocalKataKecilPalette.current
    var attributionsText by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        attributionsText = withContext(Dispatchers.IO) {
            runCatching {
                context.assets.open("licenses/OPEN_SOURCE_ATTRIBUTIONS.md")
                    .bufferedReader(Charsets.UTF_8)
                    .use { it.readText() }
            }.getOrDefault("KataKecil Open Source Attributions")
        }
    }

    Dialog(onDismissRequest = onDismiss) {
        GlassSurface(
            cornerRadius = 26.dp,
            elevated = true,
            contentPadding = PaddingValues(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .fillMaxHeight(0.82f)
        ) {
            Column(modifier = Modifier.fillMaxSize()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = "KataKecil v${BuildConfig.VERSION_NAME}",
                            color = palette.textPrimary,
                            fontFamily = KataKecilFonts.Fraunces,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 19.sp
                        )
                        Text(
                            text = "Native Kotlin + Jetpack Compose · Karisyono",
                            color = palette.textSecondary,
                            fontFamily = KataKecilFonts.DmSans,
                            fontSize = 12.sp
                        )
                    }
                    GlassIconButton(
                        iconName = "close",
                        contentDescription = "Tutup",
                        size = 34.dp,
                        iconSize = 16.dp,
                        onClick = onDismiss
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))

                Column(
                    modifier = Modifier
                        .weight(1f)
                        .verticalScroll(rememberScrollState())
                ) {
                    Text(
                        text = attributionsText,
                        color = palette.textPrimary,
                        fontFamily = KataKecilFonts.DmSans,
                        fontSize = 12.5.sp,
                        lineHeight = 18.sp
                    )
                }
            }
        }
    }
}

@Composable
private fun AppUpdatesDialog(
    lang: String,
    onShowToast: (String) -> Unit,
    onDismiss: () -> Unit
) {
    val context = LocalContext.current
    val palette = LocalKataKecilPalette.current
    val scope = rememberCoroutineScope()
    val updater = remember { AppUpdateManager(context) }

    var includePreview by remember { mutableStateOf(false) }
    var isChecking by remember { mutableStateOf(false) }
    var isDownloading by remember { mutableStateOf(false) }
    var downloadProgress by remember { mutableIntStateOf(0) }
    var releaseInfo by remember { mutableStateOf<UpdateReleaseInfo?>(null) }
    var downloadedState by remember { mutableStateOf<DownloadedUpdateState?>(null) }
    var errorMessage by remember { mutableStateOf<String?>(null) }

    fun checkNow() {
        scope.launch {
            isChecking = true
            errorMessage = null
            runCatching {
                updater.checkForUpdates(includePreview)
            }.onSuccess {
                releaseInfo = it
            }.onFailure {
                errorMessage = it.message ?: "Gagal memeriksa pembaruan."
            }
            isChecking = false
        }
    }

    LaunchedEffect(includePreview) {
        checkNow()
    }

    Dialog(onDismissRequest = onDismiss) {
        GlassSurface(
            cornerRadius = 26.dp,
            elevated = true,
            contentPadding = PaddingValues(20.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = I18n.t("Pembaruan Aplikasi", "App Updates", lang),
                        color = palette.textPrimary,
                        fontFamily = KataKecilFonts.Fraunces,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 19.sp
                    )
                    GlassIconButton(
                        iconName = "close",
                        contentDescription = "Tutup",
                        size = 34.dp,
                        iconSize = 16.dp,
                        onClick = onDismiss
                    )
                }

                Text(
                    text = "${I18n.t("Versi terpasang", "Installed version", lang)}: v${BuildConfig.VERSION_NAME} (${BuildConfig.VERSION_CODE})",
                    color = palette.textSecondary,
                    fontFamily = KataKecilFonts.DmSans,
                    fontSize = 13.sp
                )

                SettingToggleRow(
                    title = I18n.t("Sertakan rilis pratinjau", "Include preview releases", lang),
                    checked = includePreview,
                    onCheckedChange = { includePreview = it }
                )

                when {
                    isChecking -> Text(
                        text = I18n.t("Memeriksa rilis GitHub…", "Checking GitHub releases…", lang),
                        color = palette.textSecondary,
                        fontFamily = KataKecilFonts.DmSans,
                        fontSize = 13.5.sp
                    )
                    errorMessage != null -> Text(
                        text = errorMessage ?: "",
                        color = Color(0xFFE76F51),
                        fontFamily = KataKecilFonts.DmSans,
                        fontSize = 13.sp
                    )
                    releaseInfo != null -> {
                        val info = releaseInfo!!
                        val statusText = when (info.status) {
                            "update-available" -> I18n.t(
                                "Pembaruan tersedia: v${info.latestVersion}",
                                "Update available: v${info.latestVersion}",
                                lang
                            )
                            "ahead" -> I18n.t(
                                "Versi lokal lebih baru dari rilis publik (v${info.latestVersion})",
                                "Local build is ahead of public release (v${info.latestVersion})",
                                lang
                            )
                            else -> I18n.t("Sudah versi terbaru", "Up to date", lang)
                        }
                        Text(
                            text = statusText,
                            color = if (info.status == "update-available") palette.accent else palette.textPrimary,
                            fontFamily = KataKecilFonts.DmSans,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.5.sp
                        )

                        if (info.releaseNotes.isNotBlank()) {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .heightIn(max = 160.dp)
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(palette.surface.copy(alpha = 0.6f))
                                    .padding(12.dp)
                                    .verticalScroll(rememberScrollState())
                            ) {
                                Text(
                                    text = info.releaseNotes,
                                    color = palette.textPrimary,
                                    fontFamily = KataKecilFonts.DmSans,
                                    fontSize = 12.5.sp
                                )
                            }
                        }

                        if (isDownloading) {
                            LinearProgressIndicator(
                                progress = { downloadProgress / 100f },
                                modifier = Modifier.fillMaxWidth(),
                                color = palette.accent
                            )
                            Text(
                                text = "${I18n.t("Mengunduh & memverifikasi SHA-256", "Downloading & verifying SHA-256", lang)} ($downloadProgress%)",
                                color = palette.textSecondary,
                                fontFamily = KataKecilFonts.DmSans,
                                fontSize = 12.sp
                            )
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.End
                        ) {
                            GlassPillButton(
                                text = I18n.t("Periksa ulang", "Recheck", lang),
                                leadingIcon = "refresh",
                                onClick = ::checkNow
                            )
                            if (info.status == "update-available") {
                                Spacer(modifier = Modifier.width(8.dp))
                                val dl = downloadedState
                                if (dl != null) {
                                    GlassPillButton(
                                        text = I18n.t("Pasang pembaruan", "Install update", lang),
                                        leadingIcon = "download",
                                        primary = true,
                                        onClick = {
                                            runCatching { updater.launchInstallOrPermission(dl) }
                                                .onFailure { onShowToast(it.message ?: "Gagal membuka installer.") }
                                        }
                                    )
                                } else {
                                    GlassPillButton(
                                        text = I18n.t("Unduh & pasang", "Download & install", lang),
                                        leadingIcon = "download",
                                        primary = true,
                                        enabled = !isDownloading,
                                        onClick = {
                                            scope.launch {
                                                isDownloading = true
                                                downloadProgress = 0
                                                errorMessage = null
                                                runCatching {
                                                    updater.downloadUpdate(info) { pct ->
                                                        downloadProgress = pct
                                                    }
                                                }.onSuccess { state ->
                                                    downloadedState = state
                                                    updater.launchInstallOrPermission(state)
                                                }.onFailure { err ->
                                                    errorMessage = err.message ?: "Gagal mengunduh pembaruan."
                                                }
                                                isDownloading = false
                                            }
                                        }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

/**
 * Backup Restore Preview Dialog (shows counts + optional Restore Appearance checkbox)
 */
@Composable
fun RestoreBackupPreviewDialog(
    preview: BackupPreview,
    lang: String,
    onDismiss: () -> Unit,
    onConfirmRestore: (restoreAppearance: Boolean) -> Unit
) {
    val palette = LocalKataKecilPalette.current
    var restoreAppearance by remember { mutableStateOf(preview.hasPreferences) }

    Dialog(onDismissRequest = onDismiss) {
        GlassSurface(
            cornerRadius = 26.dp,
            elevated = true,
            contentPadding = PaddingValues(20.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = I18n.t("Pulihkan Cadangan", "Restore Backup", lang),
                    color = palette.textPrimary,
                    fontFamily = KataKecilFonts.Fraunces,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 19.sp
                )
                Text(
                    text = "• ${I18n.t("Sorotan, catatan & markah", "Highlights, notes & bookmarks", lang)}: ${preview.annotationCount}",
                    color = palette.textPrimary,
                    fontFamily = KataKecilFonts.DmSans,
                    fontSize = 14.sp
                )
                Text(
                    text = "• ${I18n.t("Progres buku", "Book progress items", lang)}: ${preview.progressCount}",
                    color = palette.textPrimary,
                    fontFamily = KataKecilFonts.DmSans,
                    fontSize = 14.sp
                )

                if (preview.hasPreferences) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { restoreAppearance = !restoreAppearance }
                    ) {
                        Checkbox(
                            checked = restoreAppearance,
                            onCheckedChange = { restoreAppearance = it }
                        )
                        Text(
                            text = I18n.t("Pulihkan pengaturan tampilan", "Restore appearance settings", lang),
                            color = palette.textPrimary,
                            fontFamily = KataKecilFonts.DmSans,
                            fontSize = 13.5.sp
                        )
                    }
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    GlassPillButton(
                        text = I18n.t("Batal", "Cancel", lang),
                        onClick = onDismiss
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    GlassPillButton(
                        text = I18n.t("Pulihkan", "Restore", lang),
                        primary = true,
                        onClick = { onConfirmRestore(restoreAppearance) }
                    )
                }
            }
        }
    }
}

/**
 * Import EPUB Preview Dialog (shown before importing a local .epub from file picker or Android Intent)
 */
@Composable
fun ImportEpubPreviewDialog(
    preview: ImportEpubPreview,
    lang: String,
    onDismiss: () -> Unit,
    onConfirmImport: (openImmediately: Boolean) -> Unit
) {
    val palette = LocalKataKecilPalette.current
    val meta = preview.record.meta

    Dialog(onDismissRequest = onDismiss) {
        GlassSurface(
            cornerRadius = 26.dp,
            elevated = true,
            contentPadding = PaddingValues(20.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                modifier = Modifier.fillMaxWidth(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = I18n.t("Pratinjau Impor EPUB", "EPUB Import Preview", lang),
                    color = palette.textPrimary,
                    fontFamily = KataKecilFonts.Fraunces,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 19.sp
                )

                BookCoverView(
                    title = meta.title,
                    author = meta.author,
                    coverUrl = meta.effectiveCover,
                    cornerRadius = 14.dp,
                    modifier = Modifier
                        .width(112.dp)
                        .height(164.dp)
                )

                Text(
                    text = meta.title,
                    color = palette.textPrimary,
                    fontFamily = KataKecilFonts.Fraunces,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 17.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis
                )

                Text(
                    text = "${meta.author} · ${meta.chapterCount} episode · ${formatBytes(preview.sizeBytes)}",
                    color = palette.textSecondary,
                    fontFamily = KataKecilFonts.DmSans,
                    fontSize = 12.5.sp
                )

                if (preview.alreadyExists) {
                    Text(
                        text = I18n.t(
                            "Buku ini sudah ada di pustaka. Mengimpor ulang akan memperbarui salinan lokal tanpa menghapus catatan Anda.",
                            "This book is already in your library. Re-importing updates the local copy while keeping your notes.",
                            lang
                        ),
                        color = palette.accent,
                        fontFamily = KataKecilFonts.DmSans,
                        fontSize = 12.sp
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    GlassPillButton(
                        text = I18n.t("Batal", "Cancel", lang),
                        onClick = onDismiss
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        GlassPillButton(
                            text = I18n.t("Simpan", "Save", lang),
                            onClick = { onConfirmImport(false) }
                        )
                        GlassPillButton(
                            text = I18n.t("Baca", "Read", lang),
                            primary = true,
                            onClick = { onConfirmImport(true) }
                        )
                    }
                }
            }
        }
    }
}

private fun formatBytes(bytes: Long): String {
    if (bytes < 1024L) return "$bytes B"
    val kb = bytes / 1024.0
    if (kb < 1024.0) return String.format("%.1f KB", kb)
    val mb = kb / 1024.0
    return String.format("%.2f MB", mb)
}
