package id.karisyono.katakecil.ui.settings

import androidx.compose.foundation.relocation.bringIntoViewRequester
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
import androidx.compose.foundation.layout.widthIn
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
import id.karisyono.katakecil.ui.components.WebDialog as Dialog
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
@OptIn(ExperimentalLayoutApi::class, androidx.compose.foundation.ExperimentalFoundationApi::class)
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

    var showLanguageDialog by remember { mutableStateOf(false) }
    var showAccentDialog by remember { mutableStateOf(false) }
    var advancedExpanded by androidx.compose.runtime.saveable.rememberSaveable { mutableStateOf(false) }
    val advancedRequester = remember { androidx.compose.foundation.relocation.BringIntoViewRequester() }
    LaunchedEffect(advancedExpanded) {
        if (advancedExpanded) { androidx.compose.runtime.withFrameNanos { }; advancedRequester.bringIntoView() }
    }
    var showGlobalThemeDialog by remember { mutableStateOf(false) }
    var showLiquidGlassDialog by remember { mutableStateOf(false) }
    var showPersonalEpubsDialog by remember { mutableStateOf(false) }
    var showStorageDialog by remember { mutableStateOf(false) }
    var showLoadingPreviewDialog by remember { mutableStateOf(false) }
    var showAboutLicensesDialog by remember { mutableStateOf(false) }
    var showAppUpdatesDialog by remember { mutableStateOf(false) }

    AmbientBackground {
        Column(Modifier.fillMaxSize().statusBarsPadding().padding(horizontal = 24.dp, vertical = 8.dp)) {
            id.karisyono.katakecil.ui.components.WebPageHeading(I18n.t("Pengaturan", "Settings", lang), "Library", onBack)
            Column(Modifier.weight(1f).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(24.dp)) {
                SettingsSectionCard(I18n.t("Tampilan dan bahasa", "Appearance & language", lang)) {
                    SettingsActionRow("globe", I18n.t("Bahasa aplikasi", "App language", lang), if (lang == "en") "English" else "Bahasa Indonesia", { showLanguageDialog = true })
                    SettingsActionRow("appearance", I18n.t("Tema", "Theme", lang), settings.themeMode.replaceFirstChar { it.uppercase() }, { showGlobalThemeDialog = true })
                    SettingsActionRow("sliders", "Liquid Glass", "${settings.glassTransparency}% · ${settings.glassBlur} px", { showLiquidGlassDialog = true })
                    Text(I18n.t("Warna aksen", "Accent color", lang), color = palette.textPrimary, fontSize = 13.sp, fontWeight = FontWeight.SemiBold, modifier = Modifier.padding(top = 14.dp, bottom = 10.dp))
                    FlowRow(horizontalArrangement = Arrangement.spacedBy(9.dp), verticalArrangement = Arrangement.spacedBy(9.dp)) {
                        id.karisyono.katakecil.core.theme.KataKecilThemeTokens.AccentPresets.forEach { preset ->
                            Box(Modifier.size(32.dp).clip(CircleShape).background(preset.color)
                                .border(if (settings.accentColor == preset.hex) 2.dp else 0.dp, palette.textPrimary.copy(alpha = .55f), CircleShape)
                                .clickable { onUpdateSettings { it.copy(accentColor = preset.hex) } }, contentAlignment = Alignment.Center) {
                                if (settings.accentColor == preset.hex) KataKecilIcon("check", tint = Color.White, size = 18.dp)
                            }
                        }
                        GlassIconButton("plus", I18n.t("Warna aksen kustom", "Custom accent color", lang), { showAccentDialog = true }, size = 32.dp)
                    }
                }
                SettingsSectionCard(I18n.t("Membaca", "Reading", lang)) {
                    Text(I18n.t("Huruf", "Font", lang), color = palette.textPrimary, fontSize = 13.sp)
                    id.karisyono.katakecil.ui.components.LiquidGlassTabs(listOf("Lora" to "Serif", "Plus Jakarta Sans" to "Sans"), settings.fontFamily,
                        { font -> onUpdateSettings { it.copy(fontFamily = font) } })
                    LabeledLiveSlider(I18n.t("Ukuran teks", "Text size", lang), settings.fontSize.toString(), settings.fontSize.toFloat(), 14f..32f, { value -> onUpdateSettings { it.copy(fontSize = value.toInt()) } }, {})
                }
                SettingsSectionCard(I18n.t("Data dan penyimpanan", "Data & storage", lang)) {
                    SettingsActionRow("download", I18n.t("Simpan backup", "Save backup", lang), "", onSaveBackupClick)
                    SettingsActionRow("upload", I18n.t("Pulihkan backup", "Restore backup", lang), "", onRestoreBackupClick)
                    SettingsActionRow("notes", I18n.t("Ekspor catatan", "Export notes", lang), "", onExportNotesClick)
                    SettingsActionRow("device", I18n.t("Penyimpanan perangkat", "Device storage", lang), "", { showStorageDialog = true })
                }
                Column(Modifier.fillMaxWidth().then(Modifier.bringIntoViewRequester(advancedRequester))) {
                    Row(Modifier.fillMaxWidth().clickable { advancedExpanded = !advancedExpanded }.padding(vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                        KataKecilIcon("sliders", tint = palette.accent, size = 18.dp)
                        Text(I18n.t("Lanjutan", "Advanced", lang), Modifier.weight(1f).padding(horizontal = 10.dp), color = palette.textPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        KataKecilIcon(if (advancedExpanded) "collapse" else "chevron", tint = palette.textMuted, size = 16.dp)
                    }
                    if (advancedExpanded) GlassSurface(cornerRadius = 20.dp, contentPadding = PaddingValues(16.dp), modifier = Modifier.fillMaxWidth()) {
                        Column {
                            SettingsActionRow("edit", "Publisher", "", onOpenPublisherStudio)
                            SettingsActionRow("upload", I18n.t("Impor EPUB dari perangkat", "Import EPUB", lang), "", onImportEpubClick)
                            SettingsActionRow("bookOpen", I18n.t("Kelola EPUB pribadi", "Manage personal EPUBs", lang), "", { showPersonalEpubsDialog = true })
                            SettingsActionRow("sparkle", I18n.t("Pratinjau loading", "Loading preview", lang), "", { showLoadingPreviewDialog = true })
                            SettingsActionRow("bookOpen", I18n.t("Tentang aplikasi", "About app", lang), BuildConfig.VERSION_NAME, { showAboutLicensesDialog = true })
                            SettingsActionRow("download", I18n.t("Pembaruan aplikasi", "App updates", lang), "", { showAppUpdatesDialog = true })
                        }
                    }
                }
                Spacer(Modifier.height(24.dp))
            }
        }
    }
    if (showLanguageDialog) Dialog(onDismissRequest = { showLanguageDialog = false }) {
        GlassSurface(contentPadding = PaddingValues(20.dp), modifier = Modifier.fillMaxWidth().padding(horizontal = 12.dp)) {
            Column {
                listOf("id" to "Bahasa Indonesia", "en" to "English").forEach { (code, label) ->
                    SettingsActionRow("globe", label, if (settings.uiLanguage == code) "✓" else "", {
                        onUpdateSettings { it.copy(uiLanguage = code, uiLanguageChosen = true) }; showLanguageDialog = false
                    })
                }
            }
        }
    }
    if (showAccentDialog) ColorWheelPickerDialog(I18n.t("Warna aksen kustom", "Custom accent color", lang), settings.accentColor,
        { showAccentDialog = false }, { hex -> onUpdateSettings { it.copy(accentColor = hex) }; showAccentDialog = false })

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
                        caption = ""
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
    Column(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text(title, color = palette.textMuted, fontFamily = KataKecilFonts.Ui, fontWeight = FontWeight.SemiBold, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 8.dp))
        GlassSurface(cornerRadius = 20.dp, contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp), modifier = Modifier.fillMaxWidth()) {
            Column(Modifier.fillMaxWidth()) { content() }
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
    Row(Modifier.fillMaxWidth().heightIn(min = 52.dp).clickable(onClick = onClick).padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
        KataKecilIcon(iconName, tint = palette.accent, size = 18.dp)
        Text(title, Modifier.weight(1f).padding(horizontal = 12.dp), color = palette.textPrimary, fontFamily = KataKecilFonts.Ui, fontSize = 13.sp, fontWeight = FontWeight.SemiBold)
        if (subtitle.isNotBlank()) Text(subtitle, color = palette.textMuted, fontSize = 11.sp, maxLines = 1, overflow = TextOverflow.Ellipsis, modifier = Modifier.widthIn(max = 115.dp))
        KataKecilIcon("chevron", tint = palette.textMuted, size = 16.dp)
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
    var showCustom by remember { mutableStateOf(false) }
    id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Tema", "Theme", lang), onDismiss) {
        id.karisyono.katakecil.ui.components.WebThemeChoices(settings) { mode ->
            if (mode == "custom") showCustom = true else onUpdateSettings { it.copy(themeMode = mode, readerTheme = "follow") }
        }
    }
    if (showCustom) id.karisyono.katakecil.ui.components.CustomThemeEditor(settings, onUpdateSettings) { showCustom = false }
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
    id.karisyono.katakecil.ui.components.WebBottomSheet("Liquid Glass", onDismiss) {
        Box(Modifier.fillMaxWidth().height(112.dp).clip(RoundedCornerShape(17.dp))) {
            AmbientBackground {
                GlassSurface(contentPadding = PaddingValues(16.dp), modifier = Modifier.align(Alignment.Center).fillMaxWidth(.88f)) {
                    Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween) {
                        Text("KataKecil", color = palette.textPrimary, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                        GlassPillButton(I18n.t("Baca", "Read", lang), {}, primary = true)
                    }
                }
            }
        }
        LabeledLiveSlider(I18n.t("Kebeningan", "Clarity", lang), "${settings.glassTransparency}%", settings.glassTransparency.toFloat(), 0f..100f,
            { value -> onUpdateSettings { it.copy(glassTransparency = value.roundToInt()) } }, {})
        LabeledLiveSlider("Blur", "${settings.glassBlur} px", settings.glassBlur.toFloat(), 0f..40f,
            { value -> onUpdateSettings { it.copy(glassBlur = value.roundToInt()) } }, {})
        LabeledLiveSlider("Ambient glow", "${settings.ambientIntensity}%", settings.ambientIntensity.toFloat(), 0f..100f,
            { value -> onUpdateSettings { it.copy(ambientIntensity = value.roundToInt()) } }, {})
        GlassPillButton(I18n.t("Kembalikan default", "Restore defaults", lang), { onUpdateSettings { it.copy(glassTransparency = 75, glassBlur = 20, ambientIntensity = 60) } }, leadingIcon = "refresh")
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
    var pendingDelete by remember { mutableStateOf<BookMeta?>(null) }
    id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("EPUB pribadi", "Personal EPUBs", lang), onDismiss, scrollable = false,
        headerContent = { GlassPillButton(I18n.t("Impor EPUB", "Import EPUB", lang), onImportClick, leadingIcon = "upload"); Spacer(Modifier.height(8.dp)) }) {
        if (localBooks.isEmpty()) Text(I18n.t("Belum ada EPUB pribadi.", "No personal EPUBs yet.", lang), color = palette.textMuted, fontSize = 13.sp)
        LazyColumn(Modifier.fillMaxWidth().heightIn(max = id.karisyono.katakecil.ui.components.webPanelBodyHeight()), verticalArrangement = Arrangement.spacedBy(14.dp)) {
            items(localBooks, key = { it.id }) { book ->
                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    BookCoverView(book.title, book.author, book.effectiveCover, Modifier.width(42.dp).height(64.dp), cornerRadius = 4.dp)
                    Column(Modifier.weight(1f)) {
                        Text(book.title, color = palette.textPrimary, fontSize = 14.sp, fontWeight = FontWeight.SemiBold)
                        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                            GlassIconButton("bookOpen", I18n.t("Baca", "Read", lang), { onOpenBook(book) }, size = 34.dp, iconSize = 17.dp)
                            GlassIconButton("palette", I18n.t("Ganti sampul", "Replace cover", lang), { onReplaceCover(book) }, size = 34.dp, iconSize = 17.dp)
                            GlassIconButton("refresh", I18n.t("Pulihkan sampul", "Reset cover", lang), { onResetCover(book) }, size = 34.dp, iconSize = 17.dp)
                            GlassIconButton("trash", I18n.t("Hapus buku", "Delete book", lang), { pendingDelete = book }, size = 34.dp, iconSize = 17.dp)
                        }
                    }
                }
            }
        }
    }
    pendingDelete?.let { book ->
        id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Hapus EPUB pribadi?", "Delete personal EPUB?", lang), { pendingDelete = null }) {
            Text(book.title, color = palette.textPrimary, fontSize = 14.sp)
            GlassPillButton(I18n.t("Hapus buku", "Delete book", lang), { onDeleteBook(book); pendingDelete = null }, primary = true)
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
    id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Penyimpanan perangkat", "Device storage", lang), onDismiss) {
        listOf(I18n.t("EPUB pribadi", "Personal EPUBs", lang) to localBookCount.toString(),
            I18n.t("Progres tersimpan", "Saved progress", lang) to progressCount.toString(),
            I18n.t("Catatan dan sorotan", "Notes & highlights", lang) to annotationCount.toString(),
            I18n.t("Penyimpanan lokal", "Local storage", lang) to formatBytes(storageBytesUsed)).forEach { (label, value) ->
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                Text(label, color = palette.textPrimary, fontSize = 13.sp)
                Text(value, color = palette.textMuted, fontSize = 13.sp)
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

    var showLicenses by remember { mutableStateOf(false) }
    id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Tentang aplikasi", "About app", lang), onDismiss) {
        androidx.compose.foundation.Image(androidx.compose.ui.res.painterResource(if (palette.isDark) id.karisyono.katakecil.R.drawable.katakecil_wordmark_cream else id.karisyono.katakecil.R.drawable.katakecil_wordmark), "KataKecil",
            Modifier.fillMaxWidth().height(70.dp).padding(horizontal = 20.dp), contentScale = androidx.compose.ui.layout.ContentScale.Fit)
        Text(I18n.t("Ruang tenang untuk cerita berikutnya.", "A quieter place for your next chapter.", lang), color = palette.textPrimary, fontSize = 14.sp)
        Text("${BuildConfig.VERSION_NAME} · Android", color = palette.textMuted, fontSize = 12.sp)
        GlassPillButton(I18n.t("Lisensi open source", "Open-source licenses", lang), { showLicenses = true }, leadingIcon = "notes")
        GlassPillButton("GitHub", { context.startActivity(android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse("https://github.com/arisynn/katakecil"))) }, leadingIcon = "globe")
    }
    if (showLicenses) id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Lisensi", "Licenses", lang), { showLicenses = false }) {
        Text(attributionsText, color = palette.textPrimary, fontSize = 12.sp, lineHeight = 18.sp)
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

    var includePreview by remember { mutableStateOf(BuildConfig.VERSION_NAME.contains("-")) }
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
            releaseInfo = null
            downloadedState = null
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

    id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Pembaruan aplikasi", "App updates", lang), onDismiss,
        headerContent = {
            Text("${I18n.t("Terpasang", "Installed", lang)}: ${BuildConfig.VERSION_NAME}", color = palette.textMuted, fontSize = 11.sp)
            SettingToggleRow(I18n.t("Sertakan preview", "Include previews", lang), includePreview) { includePreview = it }
            if (isChecking) Text(I18n.t("Memeriksa GitHub…", "Checking GitHub…", lang), color = palette.textMuted, fontSize = 12.sp)
            errorMessage?.let { Text(it, color = palette.textPrimary, fontSize = 12.sp) }
            GlassPillButton(I18n.t("Periksa ulang", "Recheck", lang), ::checkNow, enabled = !isDownloading && !isChecking, leadingIcon = "refresh")
            releaseInfo?.let { info ->
                Text(if (info.status == "update-available") "${I18n.t("Pembaruan", "Update", lang)} ${info.latestVersion}" else I18n.t("Tidak ada pembaruan yang lebih baru.", "No newer update available.", lang), color = palette.textPrimary, fontSize = 13.sp)
                if (isDownloading) LinearProgressIndicator(progress = { downloadProgress / 100f }, modifier = Modifier.fillMaxWidth(), color = palette.accent)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(vertical = 10.dp)) {
                    if (info.status == "update-available") GlassPillButton(
                        if (downloadedState == null) I18n.t("Unduh APK", "Download APK", lang) else I18n.t("Pasang pembaruan", "Install update", lang), {
                            val ready = downloadedState
                            if (ready != null) runCatching { updater.launchInstallOrPermission(ready) }.onFailure { errorMessage = it.message }
                            else scope.launch {
                                isDownloading = true; errorMessage = null
                                runCatching { updater.downloadUpdate(info) { downloadProgress = it } }
                                    .onSuccess { downloadedState = it }
                                    .onFailure { errorMessage = it.message }
                                isDownloading = false
                            }
                        }, primary = true, enabled = !isDownloading && !isChecking, leadingIcon = "download")
                }
            }
        }) {
        val notes = releaseInfo?.releaseNotes.orEmpty()
        if (notes.isNotBlank()) Text(notes, color = palette.textPrimary, fontSize = 12.sp, lineHeight = 18.sp)
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

    id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Pulihkan backup", "Restore backup", lang), onDismiss,
        footer = { GlassPillButton(I18n.t("Pulihkan", "Restore", lang), { onConfirmRestore(restoreAppearance) }, Modifier.fillMaxWidth(), primary = true) }) {
        Text("${preview.progressCount} ${I18n.t("progres", "progress records", lang)} · ${preview.annotationCount} ${I18n.t("catatan/sorotan", "notes/highlights", lang)}", color = palette.textPrimary, fontSize = 14.sp)
        Text(I18n.t("Data digabung dengan data perangkat ini; data yang lebih baru dipertahankan.", "Data is merged with this device; newer records are preserved.", lang), color = palette.textMuted, fontSize = 12.sp)
        if (preview.hasPreferences) SettingToggleRow(I18n.t("Pulihkan pengaturan", "Restore settings", lang), restoreAppearance) { restoreAppearance = it }
    }
}

@Composable
fun ImportEpubPreviewDialog(
    preview: ImportEpubPreview,
    lang: String,
    onDismiss: () -> Unit,
    onConfirmImport: (openImmediately: Boolean) -> Unit
) {
    val palette = LocalKataKecilPalette.current
    val meta = preview.record.meta

    id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Impor EPUB", "Import EPUB", lang), onDismiss,
        footer = {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GlassPillButton(I18n.t("Impor", "Import", lang), { onConfirmImport(false) }, Modifier.weight(1f), leadingIcon = "upload")
                GlassPillButton(I18n.t("Impor dan baca", "Import and read", lang), { onConfirmImport(true) }, Modifier.weight(1f), primary = true)
            }
        }) {
        Row(horizontalArrangement = Arrangement.spacedBy(14.dp), verticalAlignment = Alignment.CenterVertically) {
            BookCoverView(meta.title, meta.author, meta.effectiveCover, Modifier.width(64.dp).height(96.dp), cornerRadius = 4.dp)
            Column(Modifier.weight(1f)) {
                Text(meta.title, color = palette.textPrimary, fontSize = 17.sp, fontWeight = FontWeight.SemiBold)
                Text(meta.author, color = palette.textMuted, fontSize = 12.sp)
                Text("${preview.record.chapters.size} ${I18n.t("bab", "chapters", lang)} · ${formatBytes(preview.sizeBytes)}", color = palette.textMuted, fontSize = 12.sp)
            }
        }
        if (preview.alreadyExists) Text(I18n.t("Buku ini sudah ada di perangkat.", "This book is already on this device.", lang), color = palette.textPrimary, fontSize = 12.sp)
    }
}

private fun formatBytes(bytes: Long): String {
    if (bytes < 1024L) return "$bytes B"
    val kb = bytes / 1024.0
    if (kb < 1024.0) return String.format("%.1f KB", kb)
    val mb = kb / 1024.0
    return String.format("%.2f MB", mb)
}
