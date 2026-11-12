package id.karisyono.katakecil.ui.reader

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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
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
import androidx.compose.ui.window.Dialog
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
                .background(Color.Black.copy(alpha = 0.42f))
                .clickable(onClick = onDismiss),
            contentAlignment = Alignment.BottomCenter
        ) {
            GlassSurface(
                cornerRadius = 28.dp,
                elevated = true,
                contentPadding = PaddingValues(20.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .fillMaxHeight(0.84f)
                    .clickable(enabled = false) {}
            ) {
                Column(modifier = Modifier.fillMaxSize()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = I18n.t("Buku Ini", "This Book", lang),
                                color = palette.textPrimary,
                                fontFamily = KataKecilFonts.Fraunces,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 20.sp
                            )
                            Text(
                                text = bookTitle,
                                color = palette.textSecondary,
                                fontFamily = KataKecilFonts.DmSans,
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
                        onTabSelected = { activeTab = it }
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    if (activeTab == "contents") {
                        LazyColumn(
                            modifier = Modifier.fillMaxSize(),
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
                                                .background(palette.accent.copy(alpha = 0.12f))
                                                .clickable { collapsedArcs[arc] = !isCollapsed }
                                                .padding(horizontal = 14.dp, vertical = 10.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Text(
                                                text = arc,
                                                color = palette.accent,
                                                fontFamily = KataKecilFonts.DmSans,
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
                                                        fontFamily = KataKecilFonts.DmSans,
                                                        fontWeight = FontWeight.SemiBold,
                                                        fontSize = 11.5.sp
                                                    )
                                                }
                                                Text(
                                                    text = ch.title,
                                                    color = palette.textPrimary,
                                                    fontFamily = KataKecilFonts.Fraunces,
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
                                        fontFamily = KataKecilFonts.DmSans,
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
                                modifier = Modifier.fillMaxSize(),
                                contentAlignment = Alignment.Center
                            ) {
                                Text(
                                    text = I18n.t(
                                        "Belum ada item pada tab ini.",
                                        "No items in this tab yet.",
                                        lang
                                    ),
                                    color = palette.textMuted,
                                    fontFamily = KataKecilFonts.DmSans,
                                    fontSize = 14.sp
                                )
                            }
                        } else {
                            LazyColumn(
                                modifier = Modifier.fillMaxSize(),
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
                    fontFamily = KataKecilFonts.DmSans,
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
                            fontFamily = KataKecilFonts.DmSans,
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
                fontFamily = KataKecilFonts.DmSans,
                fontSize = 13.5.sp
            )
        } else if (item.type == "bookmark" && !item.label.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                text = item.label,
                color = palette.textPrimary,
                fontFamily = KataKecilFonts.DmSans,
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
    val palette = LocalKataKecilPalette.current
    val lang = settings.uiLanguage
    var activeTab by remember { mutableStateOf("text") }
    var isDraggingSlider by remember { mutableStateOf(false) }
    var activeSliderSummary by remember { mutableStateOf("") }
    var colorPickerMode by remember { mutableStateOf<String?>(null) } // "accent", "text", "bg"

    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false)
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = if (isDraggingSlider) 0.02f else 0.35f))
                .clickable(onClick = onDismiss),
            contentAlignment = Alignment.BottomCenter
        ) {
            if (isDraggingSlider && activeSliderSummary.isNotBlank()) {
                Box(
                    modifier = Modifier
                        .align(Alignment.TopCenter)
                        .padding(top = 48.dp)
                ) {
                    GlassSurface(
                        cornerRadius = 999.dp,
                        elevated = true,
                        contentPadding = PaddingValues(horizontal = 20.dp, vertical = 10.dp)
                    ) {
                        Text(
                            text = activeSliderSummary,
                            color = palette.textPrimary,
                            fontFamily = KataKecilFonts.DmSans,
                            fontWeight = FontWeight.Bold,
                            fontSize = 14.sp
                        )
                    }
                }
            }

            GlassSurface(
                cornerRadius = 28.dp,
                elevated = true,
                contentPadding = PaddingValues(20.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(max = 560.dp)
                    .alpha(if (isDraggingSlider) 0.14f else 1f)
                    .clickable(enabled = false) {}
            ) {
                Column(modifier = Modifier.fillMaxWidth()) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Text(
                            text = I18n.t("Tampilan Baca", "Reading Appearance", lang),
                            color = palette.textPrimary,
                            fontFamily = KataKecilFonts.Fraunces,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 19.sp
                        )
                        GlassIconButton(
                            iconName = "close",
                            contentDescription = I18n.t("Tutup", "Close", lang),
                            onClick = onDismiss
                        )
                    }

                    Spacer(modifier = Modifier.height(12.dp))

                    LiquidGlassTabs(
                        tabs = listOf(
                            "text" to I18n.t("Teks", "Text", lang),
                            "layout" to I18n.t("Tata Letak", "Layout", lang),
                            "theme" to I18n.t("Tema", "Theme", lang),
                            "custom" to I18n.t("Kustom", "Custom", lang)
                        ),
                        selectedTab = activeTab,
                        onTabSelected = { activeTab = it }
                    )

                    Spacer(modifier = Modifier.height(14.dp))

                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        when (activeTab) {
                            "text" -> {
                                Text(
                                    text = I18n.t("Jenis huruf", "Font family", lang),
                                    color = palette.textSecondary,
                                    fontFamily = KataKecilFonts.DmSans,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp
                                )
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    listOf(
                                        "Lora" to "Lora",
                                        "Plus Jakarta Sans" to "Plus Jakarta",
                                        "DM Sans" to "DM Sans",
                                        "Georgia" to "Merriweather",
                                        "system" to "System Sans",
                                        "monospace" to "JetBrains Mono"
                                    ).forEach { (fontKey, fontLabel) ->
                                        GlassPillButton(
                                            text = fontLabel,
                                            primary = settings.fontFamily == fontKey,
                                            onClick = { onUpdateSettings { it.copy(fontFamily = fontKey) } }
                                        )
                                    }
                                }

                                LabeledLiveSlider(
                                    label = I18n.t("Ukuran huruf", "Font size", lang),
                                    valueText = "${settings.fontSize} px",
                                    value = settings.fontSize.toFloat(),
                                    valueRange = 14f..28f,
                                    onValueChange = { v ->
                                        isDraggingSlider = true
                                        val px = v.roundToInt().coerceIn(14, 28)
                                        activeSliderSummary = "${I18n.t("Ukuran huruf", "Font size", lang)}: $px px"
                                        onUpdateSettings { it.copy(fontSize = px) }
                                    },
                                    onValueChangeFinished = { isDraggingSlider = false }
                                )

                                LabeledLiveSlider(
                                    label = I18n.t("Tinggi baris", "Line height", lang),
                                    valueText = String.format("%.2f", settings.lineHeight),
                                    value = settings.lineHeight,
                                    valueRange = 1.2f..2.2f,
                                    onValueChange = { v ->
                                        isDraggingSlider = true
                                        val rounded = ((v * 20f).roundToInt() / 20f).coerceIn(1.2f, 2.2f)
                                        activeSliderSummary = "${I18n.t("Tinggi baris", "Line height", lang)}: ${String.format("%.2f", rounded)}"
                                        onUpdateSettings { it.copy(lineHeight = rounded) }
                                    },
                                    onValueChangeFinished = { isDraggingSlider = false }
                                )

                                LabeledLiveSlider(
                                    label = I18n.t("Ketebalan huruf", "Font weight", lang),
                                    valueText = "${settings.fontWeight}",
                                    value = settings.fontWeight.toFloat(),
                                    valueRange = 400f..700f,
                                    onValueChange = { v ->
                                        isDraggingSlider = true
                                        val w = ((v / 100f).roundToInt() * 100).coerceIn(400, 700)
                                        activeSliderSummary = "${I18n.t("Ketebalan huruf", "Font weight", lang)}: $w"
                                        onUpdateSettings { it.copy(fontWeight = w) }
                                    },
                                    onValueChangeFinished = { isDraggingSlider = false }
                                )

                                LabeledLiveSlider(
                                    label = I18n.t("Jarak paragraf", "Paragraph spacing", lang),
                                    valueText = "${settings.paragraphSpacing} px",
                                    value = settings.paragraphSpacing.toFloat(),
                                    valueRange = 0f..28f,
                                    onValueChange = { v ->
                                        isDraggingSlider = true
                                        val sp = v.roundToInt().coerceIn(0, 28)
                                        activeSliderSummary = "${I18n.t("Jarak paragraf", "Paragraph spacing", lang)}: $sp px"
                                        onUpdateSettings { it.copy(paragraphSpacing = sp) }
                                    },
                                    onValueChangeFinished = { isDraggingSlider = false }
                                )

                                LabeledLiveSlider(
                                    label = I18n.t("Indentasi baris pertama", "First-line indent", lang),
                                    valueText = String.format("%.1f em", settings.paragraphIndent),
                                    value = settings.paragraphIndent,
                                    valueRange = 0f..3f,
                                    onValueChange = { v ->
                                        isDraggingSlider = true
                                        val ind = ((v * 4f).roundToInt() / 4f).coerceIn(0f, 3f)
                                        activeSliderSummary = "${I18n.t("Indentasi", "Indent", lang)}: ${String.format("%.1f em", ind)}"
                                        onUpdateSettings { it.copy(paragraphIndent = ind) }
                                    },
                                    onValueChangeFinished = { isDraggingSlider = false }
                                )

                                Text(
                                    text = I18n.t("Perataan teks", "Text alignment", lang),
                                    color = palette.textSecondary,
                                    fontFamily = KataKecilFonts.DmSans,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp
                                )
                                FlowRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    listOf(
                                        "justify" to I18n.t("Rata kiri-kanan", "Justify", lang),
                                        "left" to I18n.t("Rata kiri", "Left", lang),
                                        "center" to I18n.t("Tengah", "Center", lang),
                                        "right" to I18n.t("Rata kanan", "Right", lang)
                                    ).forEach { (alignKey, alignLabel) ->
                                        GlassPillButton(
                                            text = alignLabel,
                                            primary = settings.textAlign == alignKey,
                                            onClick = { onUpdateSettings { it.copy(textAlign = alignKey) } }
                                        )
                                    }
                                }
                            }

                            "layout" -> {
                                Text(
                                    text = I18n.t("Mode baca", "Reading mode", lang),
                                    color = palette.textSecondary,
                                    fontFamily = KataKecilFonts.DmSans,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    GlassPillButton(
                                        text = I18n.t("Halaman", "Pages", lang),
                                        leadingIcon = "bookOpen",
                                        primary = settings.readingMode == "pages",
                                        onClick = { onUpdateSettings { it.copy(readingMode = "pages") } }
                                    )
                                    GlassPillButton(
                                        text = I18n.t("Gulir", "Scroll", lang),
                                        leadingIcon = "paper",
                                        primary = settings.readingMode == "scroll",
                                        onClick = { onUpdateSettings { it.copy(readingMode = "scroll") } }
                                    )
                                }

                                Text(
                                    text = I18n.t("Bentangan halaman", "Page spread", lang),
                                    color = palette.textSecondary,
                                    fontFamily = KataKecilFonts.DmSans,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    GlassPillButton(
                                        text = I18n.t("Satu halaman", "Single page", lang),
                                        leadingIcon = "single",
                                        primary = settings.spreadMode == "single",
                                        onClick = { onUpdateSettings { it.copy(spreadMode = "single") } }
                                    )
                                    GlassPillButton(
                                        text = I18n.t("Dua halaman", "Two-page spread", lang),
                                        leadingIcon = "double",
                                        primary = settings.spreadMode == "double",
                                        onClick = { onUpdateSettings { it.copy(spreadMode = "double") } }
                                    )
                                }

                                Text(
                                    text = I18n.t("Animasi halaman", "Page animation", lang),
                                    color = palette.textSecondary,
                                    fontFamily = KataKecilFonts.DmSans,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    listOf(
                                        "slide" to I18n.t("Geser", "Slide", lang),
                                        "fade" to I18n.t("Pudar", "Fade", lang),
                                        "none" to I18n.t("Tanpa animasi", "None", lang)
                                    ).forEach { (animKey, animLabel) ->
                                        GlassPillButton(
                                            text = animLabel,
                                            primary = settings.pageAnimation == animKey,
                                            onClick = { onUpdateSettings { it.copy(pageAnimation = animKey) } }
                                        )
                                    }
                                }

                                LabeledLiveSlider(
                                    label = I18n.t("Margin samping", "Horizontal margin", lang),
                                    valueText = "${settings.marginHorizontal} px",
                                    value = settings.marginHorizontal.toFloat(),
                                    valueRange = 12f..64f,
                                    onValueChange = { v ->
                                        isDraggingSlider = true
                                        val m = v.roundToInt().coerceIn(12, 64)
                                        activeSliderSummary = "${I18n.t("Margin samping", "Horizontal margin", lang)}: $m px"
                                        onUpdateSettings { it.copy(marginHorizontal = m) }
                                    },
                                    onValueChangeFinished = { isDraggingSlider = false }
                                )

                                LabeledLiveSlider(
                                    label = I18n.t("Margin atas-bawah", "Vertical margin", lang),
                                    valueText = "${settings.marginVertical} px",
                                    value = settings.marginVertical.toFloat(),
                                    valueRange = 12f..72f,
                                    onValueChange = { v ->
                                        isDraggingSlider = true
                                        val m = v.roundToInt().coerceIn(12, 72)
                                        activeSliderSummary = "${I18n.t("Margin vertikal", "Vertical margin", lang)}: $m px"
                                        onUpdateSettings { it.copy(marginVertical = m) }
                                    },
                                    onValueChangeFinished = { isDraggingSlider = false }
                                )

                                LabeledLiveSlider(
                                    label = I18n.t("Kecerahan baca", "Reading brightness", lang),
                                    valueText = "${settings.brightness}%",
                                    value = settings.brightness.toFloat(),
                                    valueRange = 35f..100f,
                                    onValueChange = { v ->
                                        isDraggingSlider = true
                                        val b = v.roundToInt().coerceIn(35, 100)
                                        activeSliderSummary = "${I18n.t("Kecerahan baca", "Reading brightness", lang)}: $b%"
                                        onUpdateSettings { it.copy(brightness = b) }
                                    },
                                    onValueChangeFinished = { isDraggingSlider = false }
                                )

                                SettingToggleRow(
                                    title = I18n.t("Ketuk tepi untuk balik halaman", "Tap edge to turn page", lang),
                                    checked = settings.tapNavigation,
                                    onCheckedChange = { v -> onUpdateSettings { it.copy(tapNavigation = v) } }
                                )

                                SettingToggleRow(
                                    title = I18n.t("Layar tetap menyala", "Keep screen awake", lang),
                                    checked = settings.wakeLock,
                                    onCheckedChange = { v -> onUpdateSettings { it.copy(wakeLock = v) } }
                                )

                                Text(
                                    text = I18n.t("Orientasi layar", "Screen orientation", lang),
                                    color = palette.textSecondary,
                                    fontFamily = KataKecilFonts.DmSans,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    listOf(
                                        "auto" to I18n.t("Otomatis", "Auto", lang),
                                        "portrait" to I18n.t("Potret", "Portrait", lang),
                                        "landscape" to I18n.t("Lanskap", "Landscape", lang)
                                    ).forEach { (oriKey, oriLabel) ->
                                        GlassPillButton(
                                            text = oriLabel,
                                            primary = settings.orientation == oriKey,
                                            onClick = { onUpdateSettings { it.copy(orientation = oriKey) } }
                                        )
                                    }
                                }
                            }

                            "theme" -> {
                                Text(
                                    text = I18n.t("Tema halaman baca", "Reading page theme", lang),
                                    color = palette.textSecondary,
                                    fontFamily = KataKecilFonts.DmSans,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 13.sp
                                )
                                FlowRow(
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                    verticalArrangement = Arrangement.spacedBy(8.dp)
                                ) {
                                    listOf(
                                        Triple("follow", "sparkle", I18n.t("Ikuti global", "Follow global", lang)),
                                        Triple("light", "sun", I18n.t("Terang", "Light", lang)),
                                        Triple("dark", "moon", I18n.t("Gelap", "Dark", lang)),
                                        Triple("sepia", "sepia", "Sepia"),
                                        Triple("paper", "paper", I18n.t("Kertas", "Paper", lang)),
                                        Triple("green", "leaf", I18n.t("Hijau", "Green", lang)),
                                        Triple("custom", "palette", I18n.t("Kustom", "Custom", lang))
                                    ).forEach { (themeKey, iconName, label) ->
                                        GlassPillButton(
                                            text = label,
                                            leadingIcon = iconName,
                                            primary = settings.readerTheme == themeKey,
                                            onClick = { onUpdateSettings { it.copy(readerTheme = themeKey) } }
                                        )
                                    }
                                }

                                Spacer(modifier = Modifier.height(6.dp))

                                Text(
                                    text = I18n.t("Warna aksen", "Accent color", lang),
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
                                        onClick = { colorPickerMode = "accent" }
                                    )
                                }
                            }

                            "custom" -> {
                                val customInk = KataKecilThemeTokens.parseHexColor(settings.customTextColor, Color(0xFF1F2933))
                                val customBg = KataKecilThemeTokens.parseHexColor(settings.customBackgroundColor, Color(0xFFF7F4EB))
                                val contrast = KataKecilThemeTokens.contrastRatio(customInk, customBg)
                                val passesWcag = contrast >= 4.5

                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .clip(RoundedCornerShape(18.dp))
                                        .background(customBg)
                                        .border(1.dp, palette.border, RoundedCornerShape(18.dp))
                                        .padding(16.dp)
                                ) {
                                    Column {
                                        Text(
                                            text = I18n.t("Pratinjau Kertas Kustom", "Custom Paper Preview", lang),
                                            color = customInk,
                                            fontFamily = KataKecilFonts.Fraunces,
                                            fontWeight = FontWeight.SemiBold,
                                            fontSize = 16.sp
                                        )
                                        Spacer(modifier = Modifier.height(4.dp))
                                        Text(
                                            text = "${I18n.t("Rasio kontras", "Contrast ratio", lang)}: ${String.format("%.2f:1", contrast)} " +
                                                if (passesWcag) "✓ WCAG AA" else "⚠️ < 4.5:1",
                                            color = customInk.copy(alpha = 0.8f),
                                            fontFamily = KataKecilFonts.DmSans,
                                            fontSize = 12.5.sp
                                        )
                                    }
                                }

                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp)
                                ) {
                                    GlassPillButton(
                                        text = "${I18n.t("Warna teks", "Text color", lang)} (${settings.customTextColor})",
                                        leadingIcon = "palette",
                                        modifier = Modifier.weight(1f),
                                        onClick = { colorPickerMode = "text" }
                                    )
                                    GlassPillButton(
                                        text = "${I18n.t("Warna kertas", "Paper color", lang)} (${settings.customBackgroundColor})",
                                        leadingIcon = "palette",
                                        modifier = Modifier.weight(1f),
                                        onClick = { colorPickerMode = "bg" }
                                    )
                                }
                            }
                        }
                    }
                }
            }
        }
    }

    when (colorPickerMode) {
        "accent" -> ColorWheelPickerDialog(
            title = I18n.t("Warna Aksen", "Accent Color", lang),
            initialHex = settings.accentColor,
            onDismiss = { colorPickerMode = null },
            onColorSelected = { hex ->
                onUpdateSettings { it.copy(accentColor = hex) }
                colorPickerMode = null
            }
        )
        "text" -> ColorWheelPickerDialog(
            title = I18n.t("Warna Teks Kustom", "Custom Text Color", lang),
            initialHex = settings.customTextColor,
            onDismiss = { colorPickerMode = null },
            onColorSelected = { hex ->
                onUpdateSettings { it.copy(customTextColor = hex, readerTheme = "custom") }
                colorPickerMode = null
            }
        )
        "bg" -> ColorWheelPickerDialog(
            title = I18n.t("Warna Kertas Kustom", "Custom Paper Color", lang),
            initialHex = settings.customBackgroundColor,
            onDismiss = { colorPickerMode = null },
            onColorSelected = { hex ->
                onUpdateSettings { it.copy(customBackgroundColor = hex, readerTheme = "custom") }
                colorPickerMode = null
            }
        )
    }
}

/**
 * 3. Reading Tools Sheet (Episode Stats, Search, RSVP Speed Reading, Read Aloud TTS, Word Tools, Go to Page)
 */
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
                        text = I18n.t("Alat Baca", "Reading Tools", lang),
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
                            fontFamily = KataKecilFonts.DmSans,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.5.sp
                        )
                        Text(
                            text = "$wordsCount ${I18n.t("kata", "words", lang)} · ~$estMinutes ${I18n.t("mnt baca", "min read", lang)}",
                            color = palette.textSecondary,
                            fontFamily = KataKecilFonts.DmSans,
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

    Dialog(onDismissRequest = onDismiss) {
        GlassSurface(
            cornerRadius = 26.dp,
            elevated = true,
            contentPadding = PaddingValues(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 520.dp)
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = I18n.t("Cari di Episode", "Search in Episode", lang),
                        color = palette.textPrimary,
                        fontFamily = KataKecilFonts.Fraunces,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 18.sp
                    )
                    GlassIconButton(
                        iconName = "close",
                        contentDescription = "Tutup",
                        size = 34.dp,
                        iconSize = 16.dp,
                        onClick = onDismiss
                    )
                }

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
                    fontFamily = KataKecilFonts.DmSans,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.Medium
                )

                Spacer(modifier = Modifier.height(8.dp))

                LazyColumn(
                    modifier = Modifier.weight(1f, fill = false),
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
                                fontFamily = KataKecilFonts.DmSans,
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
                                    fontFamily = KataKecilFonts.Fraunces,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 18.sp
                                )
                                Text(
                                    text = chapterTitle,
                                    color = palette.textSecondary,
                                    fontFamily = KataKecilFonts.DmSans,
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
                                fontFamily = KataKecilFonts.DmSans,
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

    Dialog(onDismissRequest = onDismiss) {
        GlassSurface(
            cornerRadius = 26.dp,
            elevated = true,
            contentPadding = PaddingValues(20.dp),
            modifier = Modifier
                .fillMaxWidth()
                .heightIn(max = 540.dp)
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
                        text = I18n.t("Baca Nyaring (TTS)", "Read Aloud (TTS)", lang),
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
                    fontFamily = KataKecilFonts.DmSans,
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
                        modifier = Modifier.heightIn(max = 160.dp),
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
                                    fontFamily = KataKecilFonts.DmSans,
                                    fontSize = 12.5.sp,
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = if (voice.isLocal) I18n.t("Lokal", "Local", lang) else "Online",
                                    color = if (voice.isLocal) palette.accent else palette.textMuted,
                                    fontFamily = KataKecilFonts.DmSans,
                                    fontSize = 11.sp,
                                    fontWeight = FontWeight.SemiBold
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
                        text = I18n.t("Alat Kata", "Word Tools", uiLanguage),
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
                            fontFamily = KataKecilFonts.DmSans,
                            fontSize = 13.sp
                        )
                        dictError != null -> Text(
                            text = dictError ?: "",
                            color = Color(0xFFE76F51),
                            fontFamily = KataKecilFonts.DmSans,
                            fontSize = 13.sp
                        )
                        dictResult != null -> {
                            val res = dictResult!!
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .weight(1f, fill = false)
                                    .verticalScroll(rememberScrollState()),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    text = buildString {
                                        append(res.word)
                                        if (res.phonetic.isNotBlank()) append("  ${res.phonetic}")
                                    },
                                    color = palette.textPrimary,
                                    fontFamily = KataKecilFonts.Fraunces,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 17.sp
                                )
                                res.meanings.forEach { meaning ->
                                    Text(
                                        text = meaning.partOfSpeech,
                                        color = palette.accent,
                                        fontFamily = KataKecilFonts.DmSans,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 12.sp
                                    )
                                    meaning.definitions.forEachIndexed { idx, def ->
                                        Text(
                                            text = "${idx + 1}. ${def.definition}",
                                            color = palette.textPrimary,
                                            fontFamily = KataKecilFonts.DmSans,
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
                                    fontFamily = KataKecilFonts.DmSans,
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
                            fontFamily = KataKecilFonts.DmSans,
                            fontSize = 13.sp
                        )
                        transError != null -> Text(
                            text = transError ?: "",
                            color = Color(0xFFE76F51),
                            fontFamily = KataKecilFonts.DmSans,
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
                                    fontFamily = KataKecilFonts.DmSans,
                                    fontSize = 11.sp
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
                    text = I18n.t("Catatan & Sorotan", "Note & Highlight", lang),
                    color = palette.textPrimary,
                    fontFamily = KataKecilFonts.Fraunces,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 18.sp
                )

                if (selectedText.isNotBlank()) {
                    Text(
                        text = "“$selectedText”",
                        color = palette.textSecondary,
                        fontFamily = KataKecilFonts.Lora,
                        fontStyle = FontStyle.Italic,
                        fontSize = 13.5.sp,
                        maxLines = 3,
                        overflow = TextOverflow.Ellipsis
                    )
                }

                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    listOf("amber", "emerald", "sapphire", "rose").forEach { c ->
                        val swatch = KataKecilThemeTokens.highlightSwatchColor(c)
                        val selected = color == c
                        Box(
                            modifier = Modifier
                                .size(30.dp)
                                .clip(CircleShape)
                                .background(swatch)
                                .border(
                                    width = if (selected) 2.5.dp else 1.dp,
                                    color = if (selected) palette.accent else Color.White,
                                    shape = CircleShape
                                )
                                .clickable { color = c }
                        )
                    }
                }

                OutlinedTextField(
                    value = noteText,
                    onValueChange = { noteText = it },
                    minLines = 3,
                    maxLines = 6,
                    label = { Text(I18n.t("Tulis catatan Anda…", "Write your note…", lang)) },
                    modifier = Modifier.fillMaxWidth()
                )

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
                        text = I18n.t("Simpan", "Save", lang),
                        primary = true,
                        onClick = { onSave(color, noteText.trim()) }
                    )
                }
            }
        }
    }
}

@Composable
fun LabeledLiveSlider(
    label: String,
    valueText: String,
    value: Float,
    valueRange: ClosedFloatingPointRange<Float>,
    onValueChange: (Float) -> Unit,
    onValueChangeFinished: () -> Unit
) {
    val palette = LocalKataKecilPalette.current
    Column(modifier = Modifier.fillMaxWidth()) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween
        ) {
            Text(
                text = label,
                color = palette.textPrimary,
                fontFamily = KataKecilFonts.DmSans,
                fontSize = 13.5.sp,
                fontWeight = FontWeight.Medium
            )
            Text(
                text = valueText,
                color = palette.accent,
                fontFamily = KataKecilFonts.DmSans,
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
            fontFamily = KataKecilFonts.DmSans,
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
