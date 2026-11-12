package id.karisyono.katakecil.ui.reader

import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.ui.input.pointer.pointerInput
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import id.karisyono.katakecil.ui.components.WebTextField as OutlinedTextField
import id.karisyono.katakecil.ui.components.WebSlider as Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.karisyono.katakecil.ui.components.WebDialog as Dialog
import androidx.compose.ui.window.DialogProperties
import id.karisyono.katakecil.core.i18n.I18n
import id.karisyono.katakecil.core.model.AnnotationItem
import id.karisyono.katakecil.core.model.Chapter
import id.karisyono.katakecil.core.model.DeviceSettings
import id.karisyono.katakecil.core.model.DictionaryResult
import id.karisyono.katakecil.core.model.SearchMatch
import id.karisyono.katakecil.core.model.TranslationResult
import id.karisyono.katakecil.core.theme.KataKecilFonts
import id.karisyono.katakecil.core.theme.KataKecilThemeTokens
import id.karisyono.katakecil.core.theme.LocalKataKecilPalette
import id.karisyono.katakecil.data.remote.WordToolsService
import id.karisyono.katakecil.domain.reader.ReadAloudController
import id.karisyono.katakecil.domain.reader.SpeedReaderEngine
import id.karisyono.katakecil.ui.components.ColorWheelPickerDialog
import id.karisyono.katakecil.ui.components.GlassIconButton
import id.karisyono.katakecil.ui.components.GlassPillButton
import id.karisyono.katakecil.ui.components.GlassSurface
import id.karisyono.katakecil.ui.components.KataKecilIcon
import id.karisyono.katakecil.ui.components.LiquidGlassTabs
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlin.math.ceil
import kotlin.math.roundToInt

/**
 * 1. "This Book" Drawer Sheet (Contents, Highlights, Notes, Bookmarks)
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ThisBookSheetDialog(
    bookTitle: String,
    chapters: List<Chapter>,
    currentChapterIndex: Int,
    annotations: List<AnnotationItem>,
    lang: String,
    onDismiss: () -> Unit,
    onSelectChapter: (Int) -> Unit,
    onJumpToAnnotation: (AnnotationItem) -> Unit,
    onUpdateAnnotation: (AnnotationItem) -> Unit,
    onDeleteAnnotation: (String) -> Unit,
    onExportNotesClick: () -> Unit
) {
    val palette = LocalKataKecilPalette.current
    var activeTab by remember { mutableStateOf("contents") }
    var episodeFilter by remember { mutableIntStateOf(-1) } // -1 = all episodes
    var colorFilter by remember { mutableStateOf("all") }
    var editingAnnotation by remember { mutableStateOf<AnnotationItem?>(null) }
    val collapsedArcs = remember { mutableStateMapOf<String, Boolean>() }

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Transparent)
                .clickable(onClick = onDismiss),
            contentAlignment = Alignment.BottomCenter
        ) {
            GlassSurface(
                cornerRadius = 28.dp,
                elevated = true,
                contentPadding = PaddingValues(20.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = id.karisyono.katakecil.ui.components.webPanelHeight(168.dp))
                    .pointerInput(Unit) { detectTapGestures(onTap = {}) }
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = I18n.t("Buku Ini", "This Book", lang),
                                color = palette.textPrimary,
                                fontFamily = KataKecilFonts.Ui,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 20.sp
                            )
                            Text(
                                text = bookTitle,
                                color = palette.textSecondary,
                                fontFamily = KataKecilFonts.Ui,
                                fontSize = 12.5.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        GlassIconButton(
                            iconName = "close",
                            contentDescription = I18n.t("Tutup", "Close", lang),
                            onClick = onDismiss
                        )
                    }

                    Spacer(modifier = Modifier.height(14.dp))

                    LiquidGlassTabs(
                        tabs = listOf(
                            "contents" to I18n.t("Daftar Isi", "Contents", lang),
                            "highlights" to I18n.t("Sorotan", "Highlights", lang),
                            "notes" to I18n.t("Catatan", "Notes", lang),
                            "bookmarks" to I18n.t("Markah", "Bookmarks", lang)
                        ),
                        selectedTab = activeTab,
                        onTabSelected = { activeTab = it },
                        iconNames = listOf("list", "quote", "notes", "bookmark"), vertical = true
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    if (activeTab == "contents") {
                        LazyColumn(
                            modifier = Modifier.fillMaxWidth().heightIn(max = id.karisyono.katakecil.ui.components.webPanelBodyHeight()),
                            verticalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            var lastArc = ""
                            chapters.forEachIndexed { idx, ch ->
                                val arc = ch.arc.trim()
                                if (arc.isNotEmpty() && arc != lastArc) {
                                    lastArc = arc
                                    item(key = "arc_${idx}_$arc") {
                                        val isCollapsed = collapsedArcs[arc] == true
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clip(RoundedCornerShape(14.dp))
                                                .background(Color.Transparent)
                                                .clickable { collapsedArcs[arc] = !isCollapsed }
                                                .padding(horizontal = 14.dp, vertical = 10.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = arc,
                                                color = palette.accent,
                                                fontFamily = KataKecilFonts.Ui,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 12.5.sp
                                            )
                                            KataKecilIcon(
                                                name = if (isCollapsed) "chevron" else "expand",
                                                size = 16.dp,
                                                tint = palette.accent
                                            )
                                        }
                                    }
                                }

                                if (arc.isEmpty() || collapsedArcs[arc] != true) {
                                    item(key = "ch_${ch.id}_$idx") {
                                        val isCurrent = idx == currentChapterIndex
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clip(RoundedCornerShape(16.dp))
                                                .background(
                                                    if (isCurrent) palette.accent.copy(alpha = 0.18f)
                                                    else palette.surface.copy(alpha = 0.45f)
                                                )
                                                .border(
                                                    1.dp,
                                                    if (isCurrent) palette.accent else palette.border,
                                                    RoundedCornerShape(16.dp)
                                                )
                                                .clickable {
                                                    onSelectChapter(idx)
                                                    onDismiss()
                                                }
                                                .padding(horizontal = 16.dp, vertical = 12.dp),
                                            verticalAlignment = Alignment.CenterVertically,
                                            horizontalArrangement = Arrangement.SpaceBetween
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                if (ch.chapterLabel.isNotBlank()) {
                                                    Text(
                                                        text = ch.chapterLabel,
                                                        color = if (isCurrent) palette.accent else palette.textMuted,
                                                        fontFamily = KataKecilFonts.Ui,
                                                        fontWeight = FontWeight.SemiBold,
                                                        fontSize = 11.5.sp
                                                    )
                                                }
                                                Text(
                                                    text = ch.title,
                                                    color = palette.textPrimary,
                                                    fontFamily = KataKecilFonts.Ui,
                                                    fontWeight = if (isCurrent) FontWeight.SemiBold else FontWeight.Normal,
                                                    fontSize = 15.sp
                                                )
                                            }
                                            if (isCurrent) {
                                                KataKecilIcon(
                                                    name = "check",
                                                    size = 18.dp,
                                                    tint = palette.accent
                                                )
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        // Filter bar for Highlights / Notes / Bookmarks
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            FlowRow(
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                                modifier = Modifier.weight(1f)
                            ) {
                                val epFilterLabel = if (episodeFilter < 0) {
                                    I18n.t("Semua episode", "All episodes", lang)
                                } else {
                                    "Episode ${episodeFilter + 1}"
                                }
                                Box(
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(999.dp))
                                        .background(palette.surfaceElevated.copy(alpha = 0.7f))
                                        .border(1.dp, palette.border, RoundedCornerShape(999.dp))
                                        .clickable {
                                            episodeFilter = if (episodeFilter < 0) currentChapterIndex else -1
                                        }
                                        .padding(horizontal = 12.dp, vertical = 6.dp)
                                ) {
                                    Text(
                                        text = epFilterLabel,
                                        color = palette.textPrimary,
                                        fontFamily = KataKecilFonts.Ui,
                                        fontSize = 12.sp,
                                        fontWeight = FontWeight.Medium
                                    )
                                }

                                if (activeTab != "bookmarks") {
                                    listOf("all", "amber", "emerald", "sapphire", "rose").forEach { c ->
                                        val selected = colorFilter == c
                                        Box(
                                            modifier = Modifier
                                                .size(26.dp)
                                                .clip(CircleShape)
                                                .background(
                                                    if (c == "all") palette.surfaceElevated
                                                    else KataKecilThemeTokens.highlightSwatchColor(c)
                                                )
                                                .border(
                                                    width = if (selected) 2.dp else 1.dp,
                                                    color = if (selected) palette.accent else palette.border,
                                                    shape = CircleShape
                                                )
                                                .clickable { colorFilter = c },
                                            contentAlignment = Alignment.Center
                                        ) {
                                            if (c == "all") {
                                                Text(
                                                    text = "*",
                                                    color = palette.textPrimary,
                                                    fontSize = 12.sp,
                                                    fontWeight = FontWeight.Bold
                                                )
                                            }
                                        }
                                    }
                                }
                            }

                            GlassPillButton(
                                text = I18n.t("Ekspor", "Export", lang),
                                leadingIcon = "download",
                                onClick = onExportNotesClick
                            )
                        }

                        Spacer(modifier = Modifier.height(10.dp))

                        val filtered = remember(annotations, activeTab, episodeFilter, colorFilter) {
                            annotations.filter { item ->
                                val tabMatch = when (activeTab) {
                                    "highlights" -> item.type == "highlight"
                                    "notes" -> item.type == "highlight" && !item.noteText.isNullOrBlank()
                                    "bookmarks" -> item.type == "bookmark"
                                    else -> true
                                }
                                val epMatch = episodeFilter < 0 || item.chapterIndex == episodeFilter
                                val colMatch = colorFilter == "all" || item.color == colorFilter
                                tabMatch && epMatch && colMatch
                            }
                        }

                        if (filtered.isEmpty()) {
                            Box(
                                modifier = Modifier.fillMaxWidth().heightIn(max = id.karisyono.katakecil.ui.components.webPanelBodyHeight()),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = I18n.t(
                                        "Belum ada item pada tab ini.",
                                        "No items in this tab yet.",
                                        lang
                                    ),
                                    color = palette.textMuted,
                                    fontFamily = KataKecilFonts.Ui,
                                    fontSize = 14.sp
                                )
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxWidth().heightIn(max = id.karisyono.katakecil.ui.components.webPanelBodyHeight()),
                                verticalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                items(filtered, key = { it.id }) { item ->
                                    AnnotationCardItem(
                                        item = item,
                                        chapterTitle = chapters.getOrNull(item.chapterIndex)?.navigationTitle
                                            ?: "Episode ${item.chapterIndex + 1}",
                                        lang = lang,
                                        onJump = {
                                            onJumpToAnnotation(item)
                                            onDismiss()
                                        },
                                        onEdit = { editingAnnotation = item },
                                        onDelete = { onDeleteAnnotation(item.id) }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    val currentEditing = editingAnnotation
    if (currentEditing != null) {
        NoteEditorDialog(
            selectedText = currentEditing.selectedText ?: currentEditing.label ?: "",
            initialNote = if (currentEditing.type == "bookmark") {
                currentEditing.label ?: ""
            } else {
                currentEditing.noteText ?: ""
            },
            initialColor = currentEditing.color,
            lang = lang,
            onDismiss = { editingAnnotation = null },
            onSave = { newColor, newText ->
                val updated = if (currentEditing.type == "bookmark") {
                    currentEditing.copy(color = newColor, label = newText.take(120))
                } else {
                    currentEditing.copy(color = newColor, noteText = newText)
                }
                onUpdateAnnotation(updated)
                editingAnnotation = null
            }
        )
    }
}

@Composable
private fun AnnotationCardItem(
    item: AnnotationItem,
    chapterTitle: String,
    lang: String,
    onJump: () -> Unit,
    onEdit: () -> Unit,
    onDelete: () -> Unit
) {
    val palette = LocalKataKecilPalette.current
    val swatch = KataKecilThemeTokens.highlightSwatchColor(item.color)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(palette.surface.copy(alpha = 0.6f))
            .border(1.dp, palette.border, RoundedCornerShape(18.dp))
            .clickable(onClick = onJump)
            .padding(14.dp)
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(12.dp)
                        .clip(CircleShape)
                        .background(swatch)
                )
                Text(
                    text = chapterTitle,
                    color = palette.textSecondary,
                    fontFamily = KataKecilFonts.Ui,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp
                )
                if (item.needsReview) {
                    Box(
                        modifier = Modifier
                            .clip(RoundedCornerShape(999.dp))
                            .background(Color(0xFFE76F51).copy(alpha = 0.2f))
                            .padding(horizontal = 8.dp, vertical = 2.dp)
                    ) {
                        Text(
                            text = I18n.t("Perlu ditinjau", "Needs review", lang),
                            color = Color(0xFFE76F51),
                            fontFamily = KataKecilFonts.Ui,
                            fontSize = 10.5.sp,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }
            }

            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                GlassIconButton(
                    iconName = "edit",
                    contentDescription = I18n.t("Ubah", "Edit", lang),
                    size = 30.dp,
                    iconSize = 14.dp,
                    onClick = onEdit
                )
                GlassIconButton(
                    iconName = "trash",
                    contentDescription = I18n.t("Hapus", "Delete", lang),
                    size = 30.dp,
                    iconSize = 14.dp,
                    onClick = onDelete
                )
            }
        }

        if (!item.selectedText.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                text = "“${item.selectedText}”",
                color = palette.textPrimary,
                fontFamily = KataKecilFonts.Lora,
                fontStyle = FontStyle.Italic,
                fontSize = 14.sp,
                maxLines = 4,
                overflow = TextOverflow.Ellipsis
            )
        }

        if (!item.noteText.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = item.noteText,
                color = palette.textPrimary,
                fontFamily = KataKecilFonts.Ui,
                fontSize = 13.5.sp
            )
        } else if (item.type == "bookmark" && !item.label.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = item.label,
                color = palette.textPrimary,
                fontFamily = KataKecilFonts.Ui,
                fontWeight = FontWeight.Medium,
                fontSize = 13.5.sp
            )
        }
    }
}

/**
 * 2. Reading Appearance Sheet (Text, Layout, Theme, Custom + Live Slider Peek Preview)
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ReadingAppearanceSheetDialog(
    settings: DeviceSettings,
    onUpdateSettings: ((DeviceSettings) -> DeviceSettings) -> Unit,
    onDismiss: () -> Unit
) {
    val lang = settings.uiLanguage
    val palette = LocalKataKecilPalette.current
    var activeTab by remember { mutableStateOf("text") }
    var activeSlider by remember { mutableStateOf<String?>(null) }
    var showFonts by remember { mutableStateOf(false) }
    var showCustom by remember { mutableStateOf(false) }
    var showReset by remember { mutableStateOf(false) }
    @Composable fun Range(label: String, display: String, value: Float, range: ClosedFloatingPointRange<Float>, update: (DeviceSettings, Float) -> DeviceSettings) {
        LabeledLiveSlider(label, display, value, range, { v -> activeSlider = label; onUpdateSettings { update(it, v) } }, { activeSlider = null })
    }
    @Composable fun PairOf(first: @Composable () -> Unit, second: @Composable () -> Unit) {
        Row(horizontalArrangement = Arrangement.spacedBy(18.dp)) {
            Column(Modifier.weight(1f)) { first() }
            Column(Modifier.weight(1f)) { second() }
        }
    }
    id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Tampilan baca", "Reading appearance", lang), onDismiss,
        closeLabel = I18n.t("Tutup", "Close", lang), previewLabel = activeSlider,
        headerContent = {
            LiquidGlassTabs(listOf("text" to I18n.t("Teks", "Text", lang), "layout" to I18n.t("Tata letak", "Layout", lang), "theme" to I18n.t("Tema", "Theme", lang)), activeTab,
                { activeTab = it }, iconNames = listOf("type", "sliders", "palette"))
            Spacer(Modifier.height(12.dp))
        }) {
        when (activeTab) {
            "text" -> {
                Row(Modifier.alpha(if (activeSlider == null) 1f else .05f), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    GlassPillButton(settings.fontFamily, { showFonts = true }, Modifier.weight(1f), leadingIcon = "type")
                    GlassPillButton(I18n.t("Default nyaman", "Comfort defaults", lang), { showReset = true }, leadingIcon = "refresh")
                }
                PairOf(
                    { Range(I18n.t("Ukuran", "Size", lang), settings.fontSize.toString(), settings.fontSize.toFloat(), 14f..32f) { p, v -> p.copy(fontSize = v.roundToInt()) } },
                    { Range(I18n.t("Tinggi baris", "Line height", lang), String.format("%.1f", settings.lineHeight), settings.lineHeight, 1.2f..2.4f) { p, v -> p.copy(lineHeight = (v * 10).roundToInt() / 10f) } })
                PairOf(
                    { Range(I18n.t("Ketebalan", "Weight", lang), settings.fontWeight.toString(), settings.fontWeight.toFloat(), 400f..700f) { p, v -> p.copy(fontWeight = (v / 100).roundToInt() * 100) } },
                    { Range(I18n.t("Jarak paragraf", "Paragraph gap", lang), settings.paragraphSpacing.toString(), settings.paragraphSpacing.toFloat(), 0f..32f) { p, v -> p.copy(paragraphSpacing = v.roundToInt()) } })
                PairOf(
                    { Range(I18n.t("Jarak huruf", "Letter spacing", lang), String.format("%.1f", settings.letterSpacing), settings.letterSpacing, -.5f..3f) { p, v -> p.copy(letterSpacing = (v * 10).roundToInt() / 10f) } },
                    { Range(I18n.t("Indentasi", "First-line indent", lang), String.format("%.2f", settings.paragraphIndent), settings.paragraphIndent, 0f..3f) { p, v -> p.copy(paragraphIndent = (v * 4).roundToInt() / 4f) } })
                FlowRow(Modifier.alpha(if (activeSlider == null) 1f else .05f), horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("left" to I18n.t("Kiri", "Left", lang), "justify" to I18n.t("Rata kanan kiri", "Justified", lang), "center" to I18n.t("Tengah", "Center", lang), "right" to I18n.t("Kanan", "Right", lang)).forEach { (key, label) ->
                        GlassPillButton(label, { onUpdateSettings { it.copy(textAlign = key) } }, primary = settings.textAlign == key)
                    }
                }
            }
            "layout" -> {
                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    GlassPillButton(I18n.t("Halaman", "Pages", lang), { onUpdateSettings { it.copy(readingMode = "pages") } }, leadingIcon = "single", primary = settings.readingMode == "pages")
                    GlassPillButton("Scroll", { onUpdateSettings { it.copy(readingMode = "scroll") } }, leadingIcon = "list", primary = settings.readingMode == "scroll")
                    GlassPillButton(I18n.t("Dua halaman", "Two pages", lang), { onUpdateSettings { it.copy(spreadMode = if (it.spreadMode == "double") "single" else "double") } }, leadingIcon = "double", primary = settings.spreadMode == "double")
                }
                PairOf(
                    { Range(I18n.t("Margin samping", "Side margins", lang), settings.marginHorizontal.toString(), settings.marginHorizontal.toFloat(), 12f..72f) { p, v -> p.copy(marginHorizontal = v.roundToInt()) } },
                    { Range(I18n.t("Margin atas/bawah", "Vertical margins", lang), settings.marginVertical.toString(), settings.marginVertical.toFloat(), 8f..80f) { p, v -> p.copy(marginVertical = v.roundToInt()) } })
                Range(I18n.t("Lebar bacaan", "Reading width", lang), settings.readerWidth.toString(), settings.readerWidth.toFloat(), 320f..1100f) { p, v -> p.copy(readerWidth = v.roundToInt()) }
                Range(I18n.t("Kecerahan", "Brightness", lang), "${settings.brightness}%", settings.brightness.toFloat(), 50f..100f) { p, v -> p.copy(brightness = v.roundToInt()) }
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("fade", "slide", "none").forEach { mode -> GlassPillButton(mode.replaceFirstChar { it.uppercase() }, { onUpdateSettings { it.copy(pageAnimation = mode) } }, primary = settings.pageAnimation == mode) }
                }
                FlowRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                    listOf("top", "center").forEach { mode -> GlassPillButton(I18n.t(if (mode == "top") "Atas" else "Tengah", if (mode == "top") "Top" else "Center", lang), { onUpdateSettings { it.copy(contentPosition = mode) } }, primary = settings.contentPosition == mode) }
                    listOf("auto", "portrait", "landscape").forEach { mode -> GlassPillButton(mode.replaceFirstChar { it.uppercase() }, { onUpdateSettings { it.copy(orientation = mode) } }, primary = settings.orientation == mode) }
                }
                SettingToggleRow(I18n.t("Ketuk untuk navigasi", "Tap navigation", lang), settings.tapNavigation) { enabled -> onUpdateSettings { it.copy(tapNavigation = enabled) } }
                SettingToggleRow(I18n.t("Layar tetap menyala", "Keep screen awake", lang), settings.wakeLock) { enabled -> onUpdateSettings { it.copy(wakeLock = enabled) } }
            }
            "theme" -> {
                id.karisyono.katakecil.ui.components.WebThemeChoices(settings) { mode ->
                    if (mode == "custom") showCustom = true else onUpdateSettings { it.copy(themeMode = mode, readerTheme = "follow") }
                }
            }
        }
    }
    if (showFonts) id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Huruf", "Font", lang), { showFonts = false }) {
        listOf("Lora", "Plus Jakarta Sans", "system", "Georgia", "monospace").forEach { font -> GlassPillButton(font, { onUpdateSettings { it.copy(fontFamily = font) }; showFonts = false }, Modifier.fillMaxWidth(), primary = settings.fontFamily == font) }
    }
    if (showCustom) id.karisyono.katakecil.ui.components.CustomThemeEditor(settings, onUpdateSettings) { showCustom = false }
    if (showReset) id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Default nyaman", "Comfort defaults", lang), { showReset = false }) {
        Text(I18n.t("Kembalikan pengaturan teks dan tata letak? Tema dan data bacaan tetap.", "Restore text and layout settings? Theme and reading data are preserved.", lang), color = palette.textPrimary, fontSize = 14.sp)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            GlassPillButton(I18n.t("Batal", "Cancel", lang), { showReset = false }, Modifier.weight(1f))
            GlassPillButton(I18n.t("Kembalikan", "Restore", lang), {
                onUpdateSettings { it.copy(fontFamily = "Lora", fontSize = 19, lineHeight = 1.6f, fontWeight = 400, paragraphSpacing = 6, letterSpacing = 0f, paragraphIndent = 1.5f, marginHorizontal = 24, marginVertical = 22, readerWidth = 720, readingMode = "pages", spreadMode = "single", pageAnimation = "fade", contentPosition = "top", brightness = 100, orientation = "auto", tapNavigation = true, wakeLock = false) }; showReset = false
            }, Modifier.weight(1f), primary = true)
        }
    }
}

@Composable
fun ReadingToolsSheetDialog(
    chapter: Chapter?,
    currentPageIndex: Int,
    totalPages: Int,
    lang: String,
    onDismiss: () -> Unit,
    onOpenSearch: () -> Unit,
    onOpenSpeedReader: () -> Unit,
    onOpenReadAloud: () -> Unit,
    onOpenWordTools: () -> Unit,
    onGoToPage: (Int) -> Unit
) {
    val palette = LocalKataKecilPalette.current
    val wordsCount = remember(chapter?.text) {
        val t = chapter?.text?.trim() ?: ""
        if (t.isEmpty()) 0 else t.split(Regex("\\s+")).size
    }
    val estMinutes = ceil(wordsCount / 220.0).toInt().coerceAtLeast(1)
    var pageInput by remember { mutableStateOf("${currentPageIndex + 1}") }

    id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Alat baca", "Reading tools", lang), onDismiss) {


                // Episode Stats Banner
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .clip(RoundedCornerShape(16.dp))
                        .background(palette.surface.copy(alpha = 0.65f))
                        .padding(horizontal = 16.dp, vertical = 12.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text(
                            text = chapter?.navigationTitle ?: "",
                            color = palette.textPrimary,
                            fontFamily = KataKecilFonts.Ui,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.5.sp
                        )
                        Text(
                            text = "$wordsCount ${I18n.t("kata", "words", lang)} · ~$estMinutes ${I18n.t("mnt baca", "min read", lang)}",
                            color = palette.textSecondary,
                            fontFamily = KataKecilFonts.Ui,
                            fontSize = 12.sp
                        )
                    }
                    KataKecilIcon(name = "clock", size = 18.dp, tint = palette.accent)
                }

                GlassPillButton(
                    text = I18n.t("Cari di episode", "Search in episode", lang),
                    leadingIcon = "search",
                    modifier = Modifier.fillMaxWidth(),
                    onClick = {
                        onDismiss()
                        onOpenSearch()
                    }
                )

                GlassPillButton(
                    text = I18n.t("Baca cepat (RSVP)", "Speed reading (RSVP)", lang),
                    leadingIcon = "sparkle",
                    modifier = Modifier.fillMaxWidth(),
                    onClick = {
                        onDismiss()
                        onOpenSpeedReader()
                    }
                )

                GlassPillButton(
                    text = I18n.t("Baca nyaring (TTS)", "Read aloud (TTS)", lang),
                    leadingIcon = "speaker",
                    modifier = Modifier.fillMaxWidth(),
                    onClick = {
                        onDismiss()
                        onOpenReadAloud()
                    }
                )

                GlassPillButton(
                    text = I18n.t("Alat kata (Kamus & Terjemahan)", "Word tools (Dictionary & Translate)", lang),
                    leadingIcon = "globe",
                    modifier = Modifier.fillMaxWidth(),
                    onClick = {
                        onDismiss()
                        onOpenWordTools()
                    }
                )

                if (totalPages > 1) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        OutlinedTextField(
                            value = pageInput,
                            onValueChange = { pageInput = it.filter { ch -> ch.isDigit() } },
                            singleLine = true,
                            label = {
                                Text("${I18n.t("Ke halaman", "Go to page", lang)} (1–$totalPages)")
                            },
                            modifier = Modifier.weight(1f)
                        )
                        GlassPillButton(
                            text = I18n.t("Buka", "Go", lang),
                            primary = true,
                            onClick = {
                                val target = (pageInput.toIntOrNull() ?: 1).coerceIn(1, totalPages) - 1
                                onGoToPage(target)
                                onDismiss()
                            }
                        )
                    }
                }

    }
}

/**
 * 4. In-Episode Search Dialog
 */
@Composable
fun EpisodeSearchDialog(
    initialQuery: String,
    matches: List<SearchMatch>,
    lang: String,
    onSearchQueryChange: (String) -> Unit,
    onSelectMatch: (Int) -> Unit,
    onDismiss: () -> Unit
) {
    val palette = LocalKataKecilPalette.current
    var query by remember { mutableStateOf(initialQuery) }

    id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Cari di episode", "Search episode", lang), onDismiss) {


                Spacer(modifier = Modifier.height(10.dp))

                OutlinedTextField(
                    value = query,
                    onValueChange = {
                        query = it
                        onSearchQueryChange(it)
                    },
                    singleLine = true,
                    placeholder = { Text(I18n.t("Ketik kata atau frasa…", "Type word or phrase…", lang)) },
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(10.dp))

                Text(
                    text = "${matches.size} ${I18n.t("hasil ditemukan", "matches found", lang)}",
                    color = palette.textSecondary,
                    fontFamily = KataKecilFonts.Ui,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.Medium
                )

                Spacer(modifier = Modifier.height(8.dp))

                LazyColumn(
                    modifier = Modifier.heightIn(max = id.karisyono.katakecil.ui.components.webPanelBodyHeight()).weight(1f, fill = false),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(matches, key = { it.index }) { match ->
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(palette.surface.copy(alpha = 0.65f))
                                .border(1.dp, palette.border, RoundedCornerShape(14.dp))
                                .clickable {
                                    onSelectMatch(match.index)
                                    onDismiss()
                                }
                                .padding(12.dp)
                        ) {
                            Text(
                                text = "${I18n.t("Halaman", "Page", lang)} ${match.pageIndex + 1}",
                                color = palette.accent,
                                fontFamily = KataKecilFonts.Ui,
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.5.sp
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                text = match.snippet,
                                color = palette.textPrimary,
                                fontFamily = KataKecilFonts.Lora,
                                fontSize = 13.5.sp,
                                maxLines = 3,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    }
                }

    }
}

/**
 * 5. RSVP Speed Reading Dialog & Fullscreen Focus Mode (port of src/reader/speed.ts & dist/speed-reading.js)
 */
@Composable
fun SpeedReadingDialog(
    chapterTitle: String,
    chapterText: String,
    startCharOffset: Int,
    wpm: Int,
    lang: String,
    onUpdateWpm: (Int) -> Unit,
    onSyncOffset: (Int) -> Unit,
    onNextEpisode: () -> Unit,
    onDismiss: () -> Unit
) {
    val palette = LocalKataKecilPalette.current
    val tokens = remember(chapterText) {
        SpeedReaderEngine.tokenizeEpisode(chapterText)
    }
    var currentIndex by remember(tokens) {
        mutableIntStateOf(SpeedReaderEngine.tokenIndexAtOrAfterOffset(tokens, startCharOffset))
    }
    var isPlaying by remember { mutableStateOf(false) }
    var isFocusMode by remember { mutableStateOf(false) }

    val maxGraphemes = remember(tokens) { SpeedReaderEngine.maxWordGraphemeCount(tokens) }
    val dynamicWordFontSize = remember(maxGraphemes, isFocusMode) {
        val base = if (isFocusMode) 38f else 30f
        if (maxGraphemes <= 12) base.sp
        else (base * (12f / maxGraphemes.coerceAtMost(24))).coerceAtLeast(18f).sp
    }

    LaunchedEffect(isPlaying, currentIndex, wpm, tokens) {
        if (isPlaying && tokens.isNotEmpty() && currentIndex in tokens.indices) {
            val token = tokens[currentIndex]
            onSyncOffset(token.startOffset)
            val delayMs = SpeedReaderEngine.speedWordDelayMs(token, wpm)
            delay(delayMs)
            if (currentIndex + 1 < tokens.size) {
                currentIndex += 1
            } else {
                isPlaying = false
                onNextEpisode()
            }
        }
    }

    val currentToken = tokens.getOrNull(currentIndex)

    Dialog(
        onDismissRequest = {
            isPlaying = false
            onDismiss()
        },
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(if (isFocusMode) palette.readingPaper else Color.Black.copy(alpha = 0.55f))
                .clickable {
                    if (isFocusMode && isPlaying) {
                        isPlaying = false
                    }
                },
            contentAlignment = Alignment.Center
        ) {
            GlassSurface(
                cornerRadius = if (isFocusMode) 0.dp else 28.dp,
                elevated = !isFocusMode,
                contentPadding = PaddingValues(24.dp),
                modifier = if (isFocusMode) {
                    Modifier.fillMaxSize()
                } else {
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 20.dp)
                }
            ) {
                Column(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.SpaceBetween
                ) {
                    // Header
                    if (!isFocusMode || !isPlaying) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = I18n.t("Baca Cepat (RSVP)", "Speed Reading (RSVP)", lang),
                                    color = palette.textPrimary,
                                    fontFamily = KataKecilFonts.Ui,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 18.sp
                                )
                                Text(
                                    text = chapterTitle,
                                    color = palette.textSecondary,
                                    fontFamily = KataKecilFonts.Ui,
                                    fontSize = 12.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis
                                )
                            }
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                GlassIconButton(
                                    iconName = if (isFocusMode) "collapse" else "expand",
                                    contentDescription = I18n.t("Mode fokus", "Focus mode", lang),
                                    active = isFocusMode,
                                    onClick = { isFocusMode = !isFocusMode }
                                )
                                GlassIconButton(
                                    iconName = "close",
                                    contentDescription = I18n.t("Tutup", "Close", lang),
                                    onClick = {
                                        isPlaying = false
                                        onDismiss()
                                    }
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(20.dp))

                    // Fixed ORP Pivot Stage (1fr auto 1fr layout so the red pivot letter never shifts)
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(if (isFocusMode) 200.dp else 136.dp)
                            .clip(RoundedCornerShape(22.dp))
                            .background(palette.readingPaper)
                            .border(1.dp, palette.border, RoundedCornerShape(22.dp))
                            .padding(horizontal = 16.dp),
                        contentAlignment = Alignment.Center
                    ) {
                        // Top and bottom pivot guide ticks
                        Box(
                            modifier = Modifier
                                .align(Alignment.TopCenter)
                                .padding(top = 12.dp)
                                .width(2.dp)
                                .height(10.dp)
                                .background(palette.accent.copy(alpha = 0.55f))
                        )
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomCenter)
                                .padding(bottom = 12.dp)
                                .width(2.dp)
                                .height(10.dp)
                                .background(palette.accent.copy(alpha = 0.55f))
                        )

                        if (currentToken != null) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = currentToken.focus.left,
                                    color = palette.readingText,
                                    fontFamily = KataKecilFonts.Lora,
                                    fontSize = dynamicWordFontSize,
                                    fontWeight = FontWeight.Medium,
                                    textAlign = TextAlign.End,
                                    maxLines = 1,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = currentToken.focus.pivot,
                                    color = Color(0xFFD9534F),
                                    fontFamily = KataKecilFonts.Lora,
                                    fontSize = dynamicWordFontSize,
                                    fontWeight = FontWeight.Bold,
                                    maxLines = 1
                                )
                                Text(
                                    text = currentToken.focus.right,
                                    color = palette.readingText,
                                    fontFamily = KataKecilFonts.Lora,
                                    fontSize = dynamicWordFontSize,
                                    fontWeight = FontWeight.Medium,
                                    textAlign = TextAlign.Start,
                                    maxLines = 1,
                                    modifier = Modifier.weight(1f)
                                )
                            }
                        } else {
                            Text(
                                text = "—",
                                color = palette.readingMuted,
                                fontSize = 24.sp
                            )
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    if (!isFocusMode || !isPlaying) {
                        Column(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalAlignment = Alignment.CenterHorizontally
                        ) {
                            Text(
                                text = "${currentIndex + 1} / ${tokens.size.coerceAtLeast(1)} · $wpm KPM",
                                color = palette.textSecondary,
                                fontFamily = KataKecilFonts.Ui,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.SemiBold
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            Slider(
                                value = wpm.toFloat(),
                                onValueChange = { raw ->
                                    val stepped = ((raw / 25f).roundToInt() * 25).coerceIn(100, 600)
                                    onUpdateWpm(stepped)
                                },
                                valueRange = 100f..600f,
                                colors = SliderDefaults.colors(
                                    thumbColor = palette.accent,
                                    activeTrackColor = palette.accent
                                )
                            )

                            Spacer(modifier = Modifier.height(10.dp))

                            Row(
                                horizontalArrangement = Arrangement.spacedBy(12.dp),
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                GlassPillButton(
                                    text = "-5",
                                    onClick = {
                                        currentIndex = (currentIndex - 5).coerceAtLeast(0)
                                        tokens.getOrNull(currentIndex)?.let { onSyncOffset(it.startOffset) }
                                    }
                                )
                                GlassPillButton(
                                    text = if (isPlaying) I18n.t("Jeda", "Pause", lang) else I18n.t("Putar", "Play", lang),
                                    leadingIcon = if (isPlaying) "pause" else "play",
                                    primary = true,
                                    onClick = { isPlaying = !isPlaying }
                                )
                                GlassPillButton(
                                    text = "+5",
                                    onClick = {
                                        currentIndex = (currentIndex + 5).coerceAtMost((tokens.size - 1).coerceAtLeast(0))
                                        tokens.getOrNull(currentIndex)?.let { onSyncOffset(it.startOffset) }
                                    }
                                )
                                GlassIconButton(
                                    iconName = "refresh",
                                    contentDescription = I18n.t("Ulangi", "Restart", lang),
                                    onClick = {
                                        isPlaying = false
                                        currentIndex = 0
                                        onSyncOffset(0)
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

/**
 * 6. Read Aloud (TTS) Sheet Dialog
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun ReadAloudSheetDialog(
    ttsState: ReadAloudController.TtsState,
    lang: String,
    onPlayPause: () -> Unit,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onStop: () -> Unit,
    onRateChange: (Float) -> Unit,
    onVoiceSelect: (voiceId: String, languageTag: String) -> Unit,
    onDismiss: () -> Unit
) {
    val palette = LocalKataKecilPalette.current

    id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Baca lantang", "Read aloud", lang), onDismiss) {


                if (ttsState.currentParagraphPreview.isNotBlank()) {
                    Text(
                        text = ttsState.currentParagraphPreview,
                        color = palette.textSecondary,
                        fontFamily = KataKecilFonts.Lora,
                        fontStyle = FontStyle.Italic,
                        fontSize = 13.5.sp,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(14.dp))
                            .background(palette.surface.copy(alpha = 0.6f))
                            .padding(12.dp)
                    )
                }

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.Center,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    GlassIconButton(
                        iconName = "left",
                        contentDescription = "Sebelumnya",
                        onClick = onPrev
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    GlassPillButton(
                        text = if (ttsState.isPlaying) I18n.t("Jeda", "Pause", lang) else I18n.t("Putar", "Play", lang),
                        leadingIcon = if (ttsState.isPlaying) "pause" else "play",
                        primary = true,
                        onClick = onPlayPause
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    GlassIconButton(
                        iconName = "chevron",
                        contentDescription = "Berikutnya",
                        onClick = onNext
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    GlassIconButton(
                        iconName = "close",
                        contentDescription = "Berhenti",
                        onClick = onStop
                    )
                }

                LabeledLiveSlider(
                    label = I18n.t("Kecepatan suara", "Speech rate", lang),
                    valueText = String.format("%.2fx", ttsState.rate),
                    value = ttsState.rate,
                    valueRange = 0.5f..2.0f,
                    onValueChange = { r ->
                        val stepped = ((r * 20f).roundToInt() / 20f).coerceIn(0.5f, 2.0f)
                        onRateChange(stepped)
                    },
                    onValueChangeFinished = {}
                )

                Text(
                    text = I18n.t("Pilih bahasa & suara", "Select language & voice", lang),
                    color = palette.textSecondary,
                    fontFamily = KataKecilFonts.Ui,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp
                )

                FlowRow(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("id-ID" to "Bahasa Indonesia", "en-US" to "English (US)").forEach { (tag, label) ->
                        GlassPillButton(
                            text = label,
                            primary = ttsState.selectedLanguage.startsWith(tag.take(2), ignoreCase = true),
                            onClick = { onVoiceSelect("", tag) }
                        )
                    }
                }

                val filteredVoices = remember(ttsState.availableVoices, ttsState.selectedLanguage) {
                    val langPrefix = ttsState.selectedLanguage.take(2).lowercase()
                    ttsState.availableVoices.filter {
                        it.languageTag.lowercase().startsWith(langPrefix)
                    }.ifEmpty { ttsState.availableVoices }.take(12)
                }

                if (filteredVoices.isNotEmpty()) {
                    LazyColumn(
                        modifier = Modifier.heightIn(max = id.karisyono.katakecil.ui.components.webPanelBodyHeight()).heightIn(max = 160.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        items(filteredVoices, key = { it.id }) { voice ->
                            val isSelected = voice.id == ttsState.selectedVoiceId
                            Row(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(
                                        if (isSelected) palette.accent.copy(alpha = 0.18f)
                                        else palette.surface.copy(alpha = 0.5f)
                                    )
                                    .clickable { onVoiceSelect(voice.id, voice.languageTag) }
                                    .padding(horizontal = 12.dp, vertical = 8.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = voice.name,
                                    color = palette.textPrimary,
                                    fontFamily = KataKecilFonts.Ui,
                                    fontSize = 12.5.sp,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = if (voice.isLocal) I18n.t("Lokal", "Local", lang) else "Online",
                                    color = if (voice.isLocal) palette.accent else palette.textMuted,
                                    fontFamily = KataKecilFonts.Ui,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                        }
                    }
                }

    }
}

/**
 * 7. Word Tools Dialog (Dictionary + Translation)
 */
@OptIn(ExperimentalLayoutApi::class)
@Composable
fun WordToolsDialog(
    initialSelection: String,
    bookLanguage: String,
    uiLanguage: String,
    onDismiss: () -> Unit
) {
    val palette = LocalKataKecilPalette.current
    val scope = rememberCoroutineScope()
    var activeTab by remember { mutableStateOf("dictionary") }

    var dictQuery by remember { mutableStateOf(WordToolsService.extractTargetWord(initialSelection).ifBlank { initialSelection.take(40) }) }
    var dictLang by remember { mutableStateOf(if (bookLanguage.startsWith("en")) "en" else "id") }
    var dictLoading by remember { mutableStateOf(false) }
    var dictError by remember { mutableStateOf<String?>(null) }
    var dictResult by remember { mutableStateOf<DictionaryResult?>(null) }

    var transInput by remember { mutableStateOf(initialSelection) }
    var sourceLang by remember { mutableStateOf(if (bookLanguage.startsWith("en")) "en" else "id") }
    var targetLang by remember { mutableStateOf(if (sourceLang == "id") "en" else "id") }
    var transLoading by remember { mutableStateOf(false) }
    var transError by remember { mutableStateOf<String?>(null) }
    var transResult by remember { mutableStateOf<TranslationResult?>(null) }

    fun runDictionaryLookup() {
        if (dictQuery.isBlank()) return
        scope.launch {
            dictLoading = true
            dictError = null
            runCatching {
                WordToolsService.lookupWord(dictQuery, dictLang)
            }.onSuccess {
                dictResult = it
            }.onFailure {
                dictError = it.message ?: "Gagal memuat kamus."
            }
            dictLoading = false
        }
    }

    fun runTranslation() {
        if (transInput.isBlank()) return
        scope.launch {
            transLoading = true
            transError = null
            runCatching {
                WordToolsService.translatePassage(transInput, sourceLang, targetLang)
            }.onSuccess {
                transResult = it
            }.onFailure {
                transError = it.message ?: "Gagal menerjemahkan kutipan."
            }
            transLoading = false
        }
    }

    LaunchedEffect(Unit) {
        if (dictQuery.isNotBlank()) {
            runDictionaryLookup()
        }
    }

    id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Alat kata", "Word tools", uiLanguage), onDismiss) {


                LiquidGlassTabs(
                    tabs = listOf(
                        "dictionary" to I18n.t("Kamus", "Dictionary", uiLanguage),
                        "translate" to I18n.t("Terjemahan", "Translate", uiLanguage)
                    ),
                    selectedTab = activeTab,
                    onTabSelected = { tab ->
                        activeTab = tab
                        if (tab == "translate" && transResult == null && transInput.isNotBlank()) {
                            runTranslation()
                        }
                    }
                )

                if (activeTab == "dictionary") {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        OutlinedTextField(
                            value = dictQuery,
                            onValueChange = { dictQuery = it },
                            singleLine = true,
                            label = { Text(I18n.t("Kata", "Word", uiLanguage)) },
                            modifier = Modifier.weight(1f)
                        )
                        GlassPillButton(
                            text = I18n.t("Cari", "Lookup", uiLanguage),
                            primary = true,
                            onClick = ::runDictionaryLookup
                        )
                    }

                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        GlassPillButton(
                            text = "Wikikamus (ID)",
                            primary = dictLang == "id",
                            onClick = {
                                dictLang = "id"
                                runDictionaryLookup()
                            }
                        )
                        GlassPillButton(
                            text = "English (EN)",
                            primary = dictLang == "en",
                            onClick = {
                                dictLang = "en"
                                runDictionaryLookup()
                            }
                        )
                    }

                    when {
                        dictLoading -> Text(
                            text = I18n.t("Mencari arti kata…", "Looking up definition…", uiLanguage),
                            color = palette.textSecondary,
                            fontFamily = KataKecilFonts.Ui,
                            fontSize = 13.sp
                        )
                        dictError != null -> Text(
                            text = dictError ?: "",
                            color = Color(0xFFE76F51),
                            fontFamily = KataKecilFonts.Ui,
                            fontSize = 13.sp
                        )
                        dictResult != null -> {
                            val res = dictResult!!
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f, fill = false)
                                    ,
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = buildString {
                                        append(res.word)
                                        if (res.phonetic.isNotBlank()) append("  ${res.phonetic}")
                                    },
                                    color = palette.textPrimary,
                                    fontFamily = KataKecilFonts.Ui,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 17.sp
                                )
                                res.meanings.forEach { meaning ->
                                    Text(
                                        text = meaning.partOfSpeech,
                                        color = palette.accent,
                                        fontFamily = KataKecilFonts.Ui,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp
                                    )
                                    meaning.definitions.forEachIndexed { idx, def ->
                                        Text(
                                            text = "${idx + 1}. ${def.definition}",
                                            color = palette.textPrimary,
                                            fontFamily = KataKecilFonts.Ui,
                                            fontSize = 13.5.sp
                                        )
                                        if (def.example.isNotBlank()) {
                                            Text(
                                                text = "“${def.example}”",
                                                color = palette.textSecondary,
                                                fontFamily = KataKecilFonts.Lora,
                                                fontStyle = FontStyle.Italic,
                                                fontSize = 12.5.sp
                                            )
                                        }
                                    }
                                }
                                Text(
                                    text = "${res.sourceLabel} · ${res.licenseLabel}",
                                    color = palette.textMuted,
                                    fontFamily = KataKecilFonts.Ui,
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }
                } else {
                    OutlinedTextField(
                        value = transInput,
                        onValueChange = { transInput = it },
                        maxLines = 3,
                        label = { Text(I18n.t("Kutipan (maks. 450 byte)", "Passage (max 450 bytes)", uiLanguage)) },
                        modifier = Modifier.fillMaxWidth()
                    )

                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        WordToolsService.SupportedLanguages.forEach { (code, name) ->
                            GlassPillButton(
                                text = "$code →",
                                primary = sourceLang == code,
                                onClick = { sourceLang = code }
                            )
                        }
                    }

                    FlowRow(
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                        verticalArrangement = Arrangement.spacedBy(6.dp)
                    ) {
                        WordToolsService.SupportedLanguages.forEach { (code, _) ->
                            GlassPillButton(
                                text = "→ $code",
                                primary = targetLang == code,
                                onClick = {
                                    targetLang = code
                                    runTranslation()
                                }
                            )
                        }
                    }

                    GlassPillButton(
                        text = I18n.t("Terjemahkan", "Translate", uiLanguage),
                        leadingIcon = "globe",
                        primary = true,
                        modifier = Modifier.fillMaxWidth(),
                        onClick = ::runTranslation
                    )

                    when {
                        transLoading -> Text(
                            text = I18n.t("Menerjemahkan…", "Translating…", uiLanguage),
                            color = palette.textSecondary,
                            fontFamily = KataKecilFonts.Ui,
                            fontSize = 13.sp
                        )
                        transError != null -> Text(
                            text = transError ?: "",
                            color = Color(0xFFE76F51),
                            fontFamily = KataKecilFonts.Ui,
                            fontSize = 13.sp
                        )
                        transResult != null -> {
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(palette.surface.copy(alpha = 0.65f))
                                    .padding(14.dp)
                            ) {
                                Text(
                                    text = transResult!!.translatedText,
                                    color = palette.textPrimary,
                                    fontFamily = KataKecilFonts.Lora,
                                    fontSize = 14.5.sp
                                )
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    text = "Diterjemahkan oleh ${transResult!!.providerLabel}",
                                    color = palette.textMuted,
                                    fontFamily = KataKecilFonts.Ui,
                                    fontSize = 11.sp
                                )
                            }
                        }
                    }
                }

    }
}

/**
 * 8. Note & Highlight Editor Dialog
 */
@Composable
fun NoteEditorDialog(
    selectedText: String,
    initialNote: String,
    initialColor: String,
    lang: String,
    onDismiss: () -> Unit,
    onSave: (color: String, noteText: String) -> Unit
) {
    val palette = LocalKataKecilPalette.current
    var noteText by remember { mutableStateOf(initialNote) }
    var color by remember { mutableStateOf(initialColor) }

    id.karisyono.katakecil.ui.components.WebBottomSheet(I18n.t("Catatan", "Note", lang), onDismiss,
        footer = {
            Row(Modifier.fillMaxWidth().padding(top = 10.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                GlassPillButton(I18n.t("Batal", "Cancel", lang), onDismiss, Modifier.weight(1f))
                GlassPillButton(I18n.t("Simpan", "Save", lang), { onSave(color, noteText.trim()) }, Modifier.weight(1f), primary = true)
            }
        }) {
        if (selectedText.isNotBlank()) Text(selectedText, color = palette.textMuted, fontFamily = KataKecilFonts.Lora, fontSize = 13.sp, maxLines = 3, overflow = TextOverflow.Ellipsis)
        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            listOf("amber", "emerald", "sapphire", "rose").forEach { name ->
                Box(Modifier.size(32.dp).clip(CircleShape).background(KataKecilThemeTokens.highlightSwatchColor(name))
                    .border(if (color == name) 2.dp else 0.dp, palette.accent, CircleShape).clickable { color = name })
            }
        }
        OutlinedTextField(noteText, { noteText = it }, Modifier.fillMaxWidth(), minLines = 3, maxLines = 6,
            label = { Text(I18n.t("Catatan", "Note", lang)) })
    }
}

@Composable
fun LabeledLiveSlider(
    label: String,
    valueText: String,
    value: Float,
    valueRange: ClosedFloatingPointRange<Float>,
    onValueChange: (Float) -> Unit,
    onValueChangeFinished: () -> Unit,
    modifier: Modifier = Modifier
) {
    val palette = LocalKataKecilPalette.current
    val active = id.karisyono.katakecil.ui.components.LocalPreviewSlider.current
    Column(modifier = modifier.fillMaxWidth().alpha(if (active == null || active == label) 1f else .04f)
        .background(if (active == label) palette.background.copy(alpha = .88f) else Color.Transparent, RoundedCornerShape(14.dp))
        .padding(if (active == label) 4.dp else 4.dp)) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = label,
                color = palette.textPrimary,
                fontFamily = KataKecilFonts.Ui,
                fontSize = 13.5.sp,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = valueText,
                color = palette.accent,
                fontFamily = KataKecilFonts.Ui,
                fontSize = 13.sp,
                fontWeight = FontWeight.SemiBold
            )
        }
        Slider(
            value = value,
            onValueChange = onValueChange,
            onValueChangeFinished = onValueChangeFinished,
            valueRange = valueRange,
            colors = SliderDefaults.colors(
                thumbColor = palette.accent,
                activeTrackColor = palette.accent
            )
        )
    }
}

@Composable
fun SettingToggleRow(
    title: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit
) {
    val palette = LocalKataKecilPalette.current
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Text(
            text = title,
            color = palette.textPrimary,
            fontFamily = KataKecilFonts.Ui,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            modifier = Modifier.weight(1f)
        )
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            colors = SwitchDefaults.colors(
                checkedThumbColor = Color.White,
                checkedTrackColor = palette.accent
            )
        )
    }
}
