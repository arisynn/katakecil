package id.karisyono.katakecil.ui.reader

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.slideOutVertically
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectTransformGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import id.karisyono.katakecil.ui.components.WebSlider as Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.sync.withLock
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.ParagraphStyle
import androidx.compose.ui.text.SpanStyle
import androidx.compose.ui.text.TextLayoutResult
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.buildAnnotatedString
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.rememberTextMeasurer
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextIndent
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Constraints
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.em
import androidx.compose.ui.unit.sp
import id.karisyono.katakecil.core.i18n.I18n
import id.karisyono.katakecil.core.model.AnnotationItem
import id.karisyono.katakecil.core.model.BookMeta
import id.karisyono.katakecil.core.model.Chapter
import id.karisyono.katakecil.core.model.DeviceSettings
import id.karisyono.katakecil.core.model.PageSlice
import id.karisyono.katakecil.core.model.SearchMatch
import id.karisyono.katakecil.core.theme.KataKecilFonts
import id.karisyono.katakecil.core.theme.KataKecilThemeTokens
import id.karisyono.katakecil.core.theme.LocalKataKecilPalette
import id.karisyono.katakecil.domain.reader.Paginator
import id.karisyono.katakecil.domain.reader.ReadAloudController
import id.karisyono.katakecil.ui.components.AmbientBackground
import id.karisyono.katakecil.ui.components.GlassIconButton
import id.karisyono.katakecil.ui.components.GlassPillButton
import id.karisyono.katakecil.ui.components.GlassSurface
import id.karisyono.katakecil.ui.components.KataKecilIcon
import id.karisyono.katakecil.ui.components.LoadingWordmark
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * Complete Native Jetpack Compose Reader Screen (port of dist/app.js, dist/reader-experience.js,
 * dist/pagination.js, dist/text-selection.js, dist/page-scrubber.js, and dist/reader-zoom.js).
 */
@Composable
fun ReaderScreen(
    book: BookMeta,
    chapters: List<Chapter>,
    currentChapterIndex: Int,
    currentCharOffset: Int,
    annotations: List<AnnotationItem>,
    settings: DeviceSettings,
    isLoadingEpisode: Boolean,
    hudControlsVisible: Boolean,
    searchQuery: String,
    searchMatches: List<SearchMatch>,
    activeSearchMatchIndex: Int,
    ttsState: ReadAloudController.TtsState,
    onToggleHudControls: (Boolean) -> Unit,
    onPositionChanged: (chapterIndex: Int, charOffset: Int, pageIndex: Int, totalPages: Int) -> Unit,
    onSwitchEpisode: (Int, Int) -> Unit,
    onBackToLibrary: () -> Unit,
    onCreateHighlight: (startOffset: Int, endOffset: Int, selectedText: String, color: String, noteText: String?) -> Unit,
    onDeleteAnnotation: (String) -> Unit,
    onTogglePageBookmark: (chapterIndex: Int, pageIndex: Int, charOffset: Int, snippet: String) -> Unit,
    onOpenThisBookSheet: () -> Unit,
    onOpenAppearanceSheet: () -> Unit,
    onOpenReadingToolsSheet: () -> Unit,
    onOpenSearchDialog: () -> Unit,
    onOpenWordTools: (String) -> Unit,
    onStepSearchMatch: (Int) -> Unit,
    onClearSearch: () -> Unit,
    onTtsPlayPause: () -> Unit,
    onTtsPrev: () -> Unit,
    onTtsNext: () -> Unit,
    onTtsStop: () -> Unit
) {
    val palette = LocalKataKecilPalette.current
    val lang = settings.uiLanguage
    val density = LocalDensity.current
    val textMeasurer = rememberTextMeasurer()
    val paginationLock = remember { kotlinx.coroutines.sync.Mutex() }

    val chapter = chapters.getOrNull(currentChapterIndex)
    val chapterText = chapter?.text ?: ""

    // Custom selection state (relative to current chapter character offsets)
    var selectionRange by remember(currentChapterIndex) { mutableStateOf<IntRange?>(null) }
    var selectedExistingHighlight by remember(currentChapterIndex) { mutableStateOf<AnnotationItem?>(null) }
    var noteDraftTarget by remember { mutableStateOf<Triple<Int, Int, String>?>(null) }

    // Pinch-to-zoom & pan state
    var zoomScale by remember(currentChapterIndex) { mutableFloatStateOf(1f) }
    var zoomOffset by remember(currentChapterIndex) { mutableStateOf(Offset.Zero) }

    // Reading text style based on user settings
    val readingFont = remember(settings.fontFamily) {
        KataKecilFonts.resolveReadingFont(settings.fontFamily)
    }
    val textAlign = when (settings.textAlign) {
        "center" -> TextAlign.Center
        "right" -> TextAlign.Right
        "left" -> TextAlign.Left
        else -> TextAlign.Justify
    }
    val baseTextStyle = TextStyle(
        color = palette.readingText,
        platformStyle = androidx.compose.ui.text.PlatformTextStyle(includeFontPadding = false),
        fontFamily = readingFont,
        fontSize = settings.fontSize.sp,
        lineHeight = (settings.fontSize * settings.lineHeight).sp,
        fontWeight = FontWeight(settings.fontWeight.coerceIn(400, 700)),
        letterSpacing = settings.letterSpacing.sp,
        textAlign = textAlign
    )

    val previewScale by animateFloatAsState(
        targetValue = if (hudControlsVisible) 0.90f else 1f,
        animationSpec = spring(dampingRatio = 0.78f, stiffness = 420f),
        label = "hudPreviewScale"
    )
    val previewCornerDp = if (hudControlsVisible) 24.dp else 0.dp

    AmbientBackground {
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val screenWidthDp = maxWidth
            val screenHeightDp = maxHeight
            val isDoubleSpread = settings.readingMode == "pages" &&
                settings.spreadMode == "double" &&
                screenWidthDp >= 1000.dp

            val horizontalMarginDp = settings.marginHorizontal.coerceIn(12, 64).dp
            val verticalMarginDp = settings.marginVertical.coerceIn(12, 72).dp
            val maxColumnWidthDp = min(screenWidthDp.value, settings.readerWidth.toFloat()).dp

            val contentWidthPx = with(density) {
                val colW = if (isDoubleSpread) {
                    (screenWidthDp - horizontalMarginDp * 3) / 2f
                } else {
                    minOf(screenWidthDp, maxColumnWidthDp) - horizontalMarginDp * 2
                }
                colW.toPx().roundToInt().coerceAtLeast(180)
            }
            val contentHeightPx = with(density) {
                (screenHeightDp - verticalMarginDp * 2 - 48.dp).toPx().roundToInt().coerceAtLeast(220)
            }

            // Compute paginated slices whenever text, typography, or layout changes
            val pages by androidx.compose.runtime.produceState<List<PageSlice>>(initialValue = emptyList(), keys = arrayOf(
                currentChapterIndex,
                chapterText,
                contentWidthPx,
                contentHeightPx,
                settings.fontFamily,
                settings.fontSize,
                settings.lineHeight,
                settings.fontWeight,
                settings.letterSpacing,
                settings.paragraphSpacing,
                settings.paragraphIndent,
                settings.textAlign, density.fontScale, density.density, textMeasurer)) {
                value = emptyList()
                value = kotlinx.coroutines.withContext(kotlinx.coroutines.Dispatchers.Default) {
                    paginationLock.withLock {
                        val calculationContext = kotlinx.coroutines.currentCoroutineContext()
                        if (chapterText.isEmpty()) emptyList() else {
                            val heading = textMeasurer.measure(AnnotatedString(chapter?.title ?: ""), style = baseTextStyle.copy(fontSize = 22.sp, lineHeight = 30.sp, fontWeight = FontWeight.Medium, letterSpacing = (-.5).sp), constraints = Constraints(maxWidth = contentWidthPx))
                            val headingReservePx = heading.size.height + with(density) { (if (chapter?.arc.isNullOrBlank()) 42.dp else 60.dp).toPx().roundToInt() }
                            Paginator.paginateChapterToFit(currentChapterIndex, chapterText, maxCharsHint = 2200) { candidate, start, _ ->
                                calculationContext.ensureActive()
                                val available = if (start == 0) (contentHeightPx - headingReservePx).coerceAtLeast(80) else contentHeightPx
                                val layout = textMeasurer.measure(readingTextLayout(candidate, chapterText, start, settings.paragraphIndent, settings.paragraphSpacing), style = baseTextStyle, constraints = Constraints(maxWidth = contentWidthPx))
                                layout.size.height <= available
                            }
                        }
                    }
                }
            }

            val currentPageIndex = remember(pages, currentCharOffset) {
                Paginator.findPageForOffset(pages, currentChapterIndex, currentCharOffset)
            }.coerceIn(0, (pages.size - 1).coerceAtLeast(0))

            var scrubberPreviewPage by remember(currentPageIndex) { mutableStateOf<Int?>(null) }
            val displayedPageIndex = (scrubberPreviewPage ?: currentPageIndex)
                .coerceIn(0, (pages.size - 1).coerceAtLeast(0))
            val displayedPage = pages.getOrNull(displayedPageIndex)
                ?: PageSlice(0, currentChapterIndex, 0, 0, "")

            LaunchedEffect(currentChapterIndex, displayedPageIndex, pages.size) {
                if (scrubberPreviewPage == null && pages.isNotEmpty() && chapterText.isNotEmpty()) {
                    onPositionChanged(
                        currentChapterIndex,
                        currentCharOffset.coerceIn(displayedPage.start, max(displayedPage.start, displayedPage.end - 1)),
                        displayedPageIndex,
                        pages.size
                    )
                }
            }

            val chapterBookmarks = remember(annotations, currentChapterIndex) {
                annotations.filter { it.type == "bookmark" && it.chapterIndex == currentChapterIndex }
            }
            val isCurrentPageBookmarked = remember(chapterBookmarks, displayedPage) {
                chapterBookmarks.any { bm ->
                    val off = bm.charOffset ?: 0
                    off in displayedPage.start..max(displayedPage.start, displayedPage.end)
                }
            }

            fun goPreviousPageOrEpisode() {
                selectionRange = null
                selectedExistingHighlight = null
                if (settings.readingMode == "pages") {
                    val step = if (isDoubleSpread) 2 else 1
                    if (displayedPageIndex - step >= 0) {
                        val targetPage = pages[displayedPageIndex - step]
                        onPositionChanged(currentChapterIndex, targetPage.start, displayedPageIndex - step, pages.size)
                    } else if (currentChapterIndex > 0) {
                        onSwitchEpisode(currentChapterIndex - 1, Int.MAX_VALUE)
                    }
                } else if (currentChapterIndex > 0) {
                    onSwitchEpisode(currentChapterIndex - 1, 0)
                }
            }

            fun goNextPageOrEpisode() {
                selectionRange = null
                selectedExistingHighlight = null
                if (settings.readingMode == "pages") {
                    val step = if (isDoubleSpread) 2 else 1
                    if (displayedPageIndex + step < pages.size) {
                        val targetPage = pages[displayedPageIndex + step]
                        onPositionChanged(currentChapterIndex, targetPage.start, displayedPageIndex + step, pages.size)
                    } else if (currentChapterIndex + 1 < chapters.size) {
                        onSwitchEpisode(currentChapterIndex + 1, 0)
                    }
                } else if (currentChapterIndex + 1 < chapters.size) {
                    onSwitchEpisode(currentChapterIndex + 1, 0)
                }
            }

            // Main Reading Paper Card (scales down in HUD controls mode)
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .graphicsLayer {
                        scaleX = previewScale * zoomScale
                        scaleY = previewScale * zoomScale
                        translationX = zoomOffset.x
                        translationY = zoomOffset.y
                    }
                    .shadow(
                        elevation = if (hudControlsVisible) 24.dp else 0.dp,
                        shape = RoundedCornerShape(previewCornerDp)
                    )
                    .clip(RoundedCornerShape(previewCornerDp))
                    .background(palette.readingPaper)
                    .pointerInput(hudControlsVisible, zoomScale) {
                        detectTransformGestures { _, pan, zoom, _ ->
                            if (zoom != 1f) {
                                val nextZoom = (zoomScale * zoom)
                                if (zoomScale <= 1.02f && nextZoom < 0.92f) {
                                    onToggleHudControls(true)
                                    zoomScale = 1f
                                    zoomOffset = Offset.Zero
                                } else {
                                    zoomScale = nextZoom.coerceIn(1f, 3f)
                                    if (zoomScale == 1f) zoomOffset = Offset.Zero
                                }
                            } else if (zoomScale > 1.01f) {
                                zoomOffset += pan
                            }
                        }
                    }
                    .pointerInput(
                        settings.readingMode,
                        displayedPageIndex,
                        pages.size,
                        currentChapterIndex,
                        hudControlsVisible
                    ) {
                        var swipeDeltaX = 0f
                        detectHorizontalDragGestures(
                            onDragStart = { swipeDeltaX = 0f },
                            onHorizontalDrag = { change, dragAmount ->
                                if (selectionRange == null && zoomScale <= 1.02f) {
                                    change.consume()
                                    swipeDeltaX += dragAmount
                                }
                            },
                            onDragEnd = {
                                if (selectionRange == null && zoomScale <= 1.02f && abs(swipeDeltaX) > 56.dp.toPx()) {
                                    if (swipeDeltaX < 0) {
                                        goNextPageOrEpisode()
                                    } else {
                                        goPreviousPageOrEpisode()
                                    }
                                }
                            }
                        )
                    },
                contentAlignment = Alignment.TopCenter
            ) {
                if (isLoadingEpisode || chapter == null) {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        LoadingWordmark(
                            caption = I18n.t("Memuat episode…", "Loading episode…", lang)
                        )
                    }
                } else if (settings.readingMode == "scroll") {
                    val scrollState = rememberScrollState()
                    Column(
                        modifier = Modifier
                            .widthIn(max = maxColumnWidthDp)
                            .fillMaxSize()
                            .verticalScroll(scrollState)
                            .padding(
                                horizontal = horizontalMarginDp,
                                vertical = verticalMarginDp + 24.dp
                            )
                    ) {
                        ChapterHeadingBlock(chapter = chapter, fontFamily = readingFont)
                        Spacer(modifier = Modifier.height(18.dp))
                        SelectableChapterPageText(
                            pageSlice = PageSlice(0, currentChapterIndex, 0, chapterText.length, chapterText),
                            baseTextStyle = baseTextStyle,
                            paragraphIndentEm = settings.paragraphIndent,
                            paragraphGap = settings.paragraphSpacing, sourceText = chapterText,
                            annotations = annotations,
                            searchMatches = searchMatches,
                            activeSearchMatchIndex = activeSearchMatchIndex,
                            ttsHighlightRange = if (ttsState.isPlaying || ttsState.isPaused) {
                                ttsState.highlightStartOffset..ttsState.highlightEndOffset
                            } else null,
                            selectionRange = selectionRange,
                            onSelectionChanged = { range, existingHighlight ->
                                selectionRange = range
                                selectedExistingHighlight = existingHighlight
                            },
                            onTapZone = { fractionX ->
                                if (selectionRange != null) {
                                    selectionRange = null
                                    selectedExistingHighlight = null
                                } else {
                                    onToggleHudControls(!hudControlsVisible)
                                }
                            }
                        )
                        Spacer(modifier = Modifier.height(36.dp))
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            GlassPillButton(
                                text = I18n.t("Episode sebelumnya", "Previous episode", lang),
                                leadingIcon = "left",
                                enabled = currentChapterIndex > 0,
                                onClick = { onSwitchEpisode(currentChapterIndex - 1, 0) }
                            )
                            GlassPillButton(
                                text = I18n.t("Episode berikutnya", "Next episode", lang),
                                leadingIcon = "chevron",
                                primary = true,
                                enabled = currentChapterIndex + 1 < chapters.size,
                                onClick = { onSwitchEpisode(currentChapterIndex + 1, 0) }
                            )
                        }
                        Spacer(modifier = Modifier.height(60.dp))
                    }
                } else {
                    // Paginated Mode (Single or Two-Page Spread)
                    AnimatedContent(
                        targetState = displayedPageIndex,
                        transitionSpec = {
                            when (settings.pageAnimation) {
                                "none" -> fadeIn(tween(0)) togetherWith fadeOut(tween(0))
                                "fade" -> fadeIn(tween(220)) togetherWith fadeOut(tween(180))
                                else -> {
                                    val forward = targetState >= initialState
                                    if (forward) {
                                        (slideInHorizontally(tween(240)) { it / 5 } + fadeIn(tween(200))) togetherWith
                                            (slideOutHorizontally(tween(200)) { -it / 5 } + fadeOut(tween(160)))
                                    } else {
                                        (slideInHorizontally(tween(240)) { -it / 5 } + fadeIn(tween(200))) togetherWith
                                            (slideOutHorizontally(tween(200)) { it / 5 } + fadeOut(tween(160)))
                                    }
                                }
                            }
                        },
                        label = "pageTransition"
                    ) { pageIdx ->
                        val firstSlice = pages.getOrNull(pageIdx) ?: displayedPage
                        val secondSlice = if (isDoubleSpread) pages.getOrNull(pageIdx + 1) else null

                        Box(
                            modifier = Modifier
                                .fillMaxSize()
                                .statusBarsPadding()
                                .navigationBarsPadding()
                                .padding(
                                    horizontal = horizontalMarginDp,
                                    vertical = verticalMarginDp
                                ),
                            contentAlignment = if (settings.contentPosition == "center") {
                                Alignment.Center
                            } else {
                                Alignment.TopCenter
                            }
                        ) {
                            if (isDoubleSpread) {
                                Row(
                                    modifier = Modifier.fillMaxSize(),
                                    horizontalArrangement = Arrangement.spacedBy(horizontalMarginDp)
                                ) {
                                    Column(modifier = Modifier.weight(1f)) {
                                        if (firstSlice.start == 0) {
                                            ChapterHeadingBlock(chapter = chapter, fontFamily = readingFont)
                                            Spacer(modifier = Modifier.height(14.dp))
                                        }
                                        SelectableChapterPageText(
                                            pageSlice = firstSlice,
                                            baseTextStyle = baseTextStyle,
                                            paragraphIndentEm = settings.paragraphIndent,
                            paragraphGap = settings.paragraphSpacing, sourceText = chapterText,
                                            annotations = annotations,
                                            searchMatches = searchMatches,
                                            activeSearchMatchIndex = activeSearchMatchIndex,
                                            ttsHighlightRange = if (ttsState.isPlaying || ttsState.isPaused) {
                                                ttsState.highlightStartOffset..ttsState.highlightEndOffset
                                            } else null,
                                            selectionRange = selectionRange,
                                            onSelectionChanged = { r, ex ->
                                                selectionRange = r
                                                selectedExistingHighlight = ex
                                            },
                                            onTapZone = { fracX ->
                                                handlePageTap(
                                                    fracX = fracX * 0.5f,
                                                    tapNavigation = settings.tapNavigation,
                                                    hudVisible = hudControlsVisible,
                                                    hasSelection = selectionRange != null,
                                                    onClearSelection = {
                                                        selectionRange = null
                                                        selectedExistingHighlight = null
                                                    },
                                                    onPrev = ::goPreviousPageOrEpisode,
                                                    onNext = ::goNextPageOrEpisode,
                                                    onToggleHud = { onToggleHudControls(!hudControlsVisible) }
                                                )
                                            }
                                        )
                                    }
                                    Column(modifier = Modifier.weight(1f)) {
                                        if (secondSlice != null) {
                                            SelectableChapterPageText(
                                                pageSlice = secondSlice,
                                                baseTextStyle = baseTextStyle,
                                                paragraphIndentEm = settings.paragraphIndent,
                            paragraphGap = settings.paragraphSpacing, sourceText = chapterText,
                                                annotations = annotations,
                                                searchMatches = searchMatches,
                                                activeSearchMatchIndex = activeSearchMatchIndex,
                                                ttsHighlightRange = if (ttsState.isPlaying || ttsState.isPaused) {
                                                    ttsState.highlightStartOffset..ttsState.highlightEndOffset
                                                } else null,
                                                selectionRange = selectionRange,
                                                onSelectionChanged = { r, ex ->
                                                    selectionRange = r
                                                    selectedExistingHighlight = ex
                                                },
                                                onTapZone = { fracX ->
                                                    handlePageTap(
                                                        fracX = 0.5f + fracX * 0.5f,
                                                        tapNavigation = settings.tapNavigation,
                                                        hudVisible = hudControlsVisible,
                                                        hasSelection = selectionRange != null,
                                                        onClearSelection = {
                                                            selectionRange = null
                                                            selectedExistingHighlight = null
                                                        },
                                                        onPrev = ::goPreviousPageOrEpisode,
                                                        onNext = ::goNextPageOrEpisode,
                                                        onToggleHud = { onToggleHudControls(!hudControlsVisible) }
                                                    )
                                                }
                                            )
                                        }
                                    }
                                }
                            } else {
                                Column(
                                    modifier = Modifier
                                        .widthIn(max = maxColumnWidthDp)
                                        .fillMaxSize(),
                                    verticalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column(modifier = Modifier.weight(1f, fill = false)) {
                                        if (firstSlice.start == 0) {
                                            ChapterHeadingBlock(chapter = chapter, fontFamily = readingFont)
                                            Spacer(modifier = Modifier.height(14.dp))
                                        }
                                        SelectableChapterPageText(
                                            pageSlice = firstSlice,
                                            baseTextStyle = baseTextStyle,
                                            paragraphIndentEm = settings.paragraphIndent,
                            paragraphGap = settings.paragraphSpacing, sourceText = chapterText,
                                            annotations = annotations,
                                            searchMatches = searchMatches,
                                            activeSearchMatchIndex = activeSearchMatchIndex,
                                            ttsHighlightRange = if (ttsState.isPlaying || ttsState.isPaused) {
                                                ttsState.highlightStartOffset..ttsState.highlightEndOffset
                                            } else null,
                                            selectionRange = selectionRange,
                                            onSelectionChanged = { r, ex ->
                                                selectionRange = r
                                                selectedExistingHighlight = ex
                                            },
                                            onTapZone = { fracX ->
                                                handlePageTap(
                                                    fracX = fracX,
                                                    tapNavigation = settings.tapNavigation,
                                                    hudVisible = hudControlsVisible,
                                                    hasSelection = selectionRange != null,
                                                    onClearSelection = {
                                                        selectionRange = null
                                                        selectedExistingHighlight = null
                                                    },
                                                    onPrev = ::goPreviousPageOrEpisode,
                                                    onNext = ::goNextPageOrEpisode,
                                                    onToggleHud = { onToggleHudControls(!hudControlsVisible) }
                                                )
                                            }
                                        )
                                    }

                                    // Subtle page footer inside reading paper
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(top = 8.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(
                                            text = chapter.navigationTitle,
                                            color = palette.readingMuted,
                                            fontFamily = KataKecilFonts.Ui,
                                            fontSize = 11.5.sp,
                                            maxLines = 1,
                                            overflow = TextOverflow.Ellipsis,
                                            modifier = Modifier.weight(1f)
                                        )
                                        Text(
                                            text = "${pageIdx + 1} / ${pages.size}",
                                            color = palette.readingMuted,
                                            fontFamily = KataKecilFonts.Ui,
                                            fontSize = 11.5.sp,
                                            fontWeight = FontWeight.Medium
                                        )
                                    }
                                }
                            }
                        }
                    }
                }

                // Subtle top-right HUD trigger + bookmark ribbon in distraction-free mode
                if (!hudControlsVisible) {
                    Row(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .statusBarsPadding()
                            .padding(top = 8.dp, end = 14.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        if (isCurrentPageBookmarked) {
                            KataKecilIcon(
                                name = "bookmark",
                                size = 18.dp,
                                tint = palette.accent
                            )
                        }
                        Box(
                            modifier = Modifier
                                .size(34.dp)
                                .clip(CircleShape)
                                .background(palette.readingText.copy(alpha = 0.06f))
                                .clickable { onToggleHudControls(true) },
                            contentAlignment = Alignment.Center
                        ) {
                            KataKecilIcon(
                                name = "more",
                                size = 18.dp,
                                tint = palette.readingMuted
                            )
                        }
                    }
                }

                // Reading Brightness Dimmer Overlay
                val dimAlpha = ((100 - settings.brightness.coerceIn(35, 100)) / 100f) * 0.65f
                if (dimAlpha > 0.01f) {
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(Color.Black.copy(alpha = dimAlpha))
                    )
                }
            }

            // Floating Selection Popover (4 highlight colors + Note + Word Tools + Delete)
            val activeSelection = selectionRange
            if (activeSelection != null && chapter != null && activeSelection.first < activeSelection.last) {
                val safeStart = activeSelection.first.coerceIn(0, chapterText.length)
                val safeEnd = (activeSelection.last + 1).coerceIn(safeStart, chapterText.length)
                val selectedSubstring = chapterText.substring(safeStart, safeEnd).trim()
                if (selectedSubstring.isNotEmpty()) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopCenter)
                            .statusBarsPadding()
                            .padding(top = 74.dp)
                    ) {
                        GlassSurface(
                            cornerRadius = 999.dp,
                            elevated = true,
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                listOf("amber", "emerald", "sapphire", "rose").forEach { colorName ->
                                    val swatch = KataKecilThemeTokens.highlightSwatchColor(colorName)
                                    Box(
                                        modifier = Modifier
                                            .size(26.dp)
                                            .clip(CircleShape)
                                            .background(swatch)
                                            .border(1.5.dp, Color.White.copy(alpha = 0.8f), CircleShape)
                                            .clickable {
                                                onCreateHighlight(
                                                    safeStart,
                                                    safeEnd,
                                                    selectedSubstring,
                                                    colorName,
                                                    selectedExistingHighlight?.noteText
                                                )
                                                selectionRange = null
                                                selectedExistingHighlight = null
                                            }
                                    )
                                }

                                Box(
                                    modifier = Modifier
                                        .width(1.dp)
                                        .height(22.dp)
                                        .background(palette.border)
                                )

                                GlassIconButton(
                                    iconName = "notes",
                                    contentDescription = I18n.t("Catatan", "Note", lang),
                                    size = 34.dp,
                                    iconSize = 17.dp,
                                    onClick = {
                                        noteDraftTarget = Triple(safeStart, safeEnd, selectedSubstring)
                                    }
                                )

                                GlassIconButton(
                                    iconName = "globe",
                                    contentDescription = I18n.t("Alat Kata", "Word Tools", lang),
                                    size = 34.dp,
                                    iconSize = 17.dp,
                                    onClick = {
                                        onOpenWordTools(selectedSubstring)
                                        selectionRange = null
                                        selectedExistingHighlight = null
                                    }
                                )

                                if (selectedExistingHighlight != null) {
                                    GlassIconButton(
                                        iconName = "trash",
                                        contentDescription = I18n.t("Hapus", "Delete", lang),
                                        size = 34.dp,
                                        iconSize = 17.dp,
                                        onClick = {
                                            selectedExistingHighlight?.id?.let(onDeleteAnnotation)
                                            selectionRange = null
                                            selectedExistingHighlight = null
                                        }
                                    )
                                }

                                GlassIconButton(
                                    iconName = "close",
                                    contentDescription = I18n.t("Tutup", "Close", lang),
                                    size = 32.dp,
                                    iconSize = 15.dp,
                                    onClick = {
                                        selectionRange = null
                                        selectedExistingHighlight = null
                                    }
                                )
                            }
                        }
                    }
                }
            }

            // Floating Search Match Bar
            if (searchQuery.isNotBlank() && searchMatches.isNotEmpty()) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .navigationBarsPadding()
                        .padding(bottom = if (hudControlsVisible) 168.dp else 22.dp)
                ) {
                    GlassSurface(
                        cornerRadius = 999.dp,
                        elevated = true,
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            KataKecilIcon(name = "search", size = 16.dp, tint = palette.accent)
                            Text(
                                text = "\"$searchQuery\" · ${activeSearchMatchIndex + 1}/${searchMatches.size}",
                                color = palette.textPrimary,
                                fontFamily = KataKecilFonts.Ui,
                                fontSize = 13.sp,
                                fontWeight = FontWeight.Medium
                            )
                            GlassIconButton(
                                iconName = "left",
                                contentDescription = "Sebelumnya",
                                size = 32.dp,
                                iconSize = 15.dp,
                                onClick = { onStepSearchMatch(-1) }
                            )
                            GlassIconButton(
                                iconName = "chevron",
                                contentDescription = "Berikutnya",
                                size = 32.dp,
                                iconSize = 15.dp,
                                onClick = { onStepSearchMatch(1) }
                            )
                            GlassIconButton(
                                iconName = "close",
                                contentDescription = "Tutup pencarian",
                                size = 32.dp,
                                iconSize = 15.dp,
                                onClick = onClearSearch
                            )
                        }
                    }
                }
            }

            // Floating Read Aloud (.tts-mini) Bar
            if (ttsState.isPlaying || ttsState.isPaused) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .navigationBarsPadding()
                        .padding(bottom = if (hudControlsVisible) 168.dp else 22.dp, start = 16.dp, end = 16.dp)
                ) {
                    GlassSurface(
                        cornerRadius = 999.dp,
                        elevated = true,
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp)
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            KataKecilIcon(name = "speaker", size = 18.dp, tint = palette.accent)
                            Text(
                                text = I18n.t(
                                    "Paragraf ${ttsState.paragraphIndex + 1}/${ttsState.totalParagraphs.coerceAtLeast(1)}",
                                    "Paragraph ${ttsState.paragraphIndex + 1}/${ttsState.totalParagraphs.coerceAtLeast(1)}",
                                    lang
                                ),
                                color = palette.textPrimary,
                                fontFamily = KataKecilFonts.Ui,
                                fontSize = 12.5.sp,
                                fontWeight = FontWeight.SemiBold
                            )
                            GlassIconButton(
                                iconName = "left",
                                contentDescription = "Paragraf sebelumnya",
                                size = 34.dp,
                                iconSize = 16.dp,
                                onClick = onTtsPrev
                            )
                            GlassIconButton(
                                iconName = if (ttsState.isPlaying) "pause" else "play",
                                contentDescription = if (ttsState.isPlaying) "Jeda" else "Putar",
                                size = 36.dp,
                                iconSize = 17.dp,
                                active = true,
                                onClick = onTtsPlayPause
                            )
                            GlassIconButton(
                                iconName = "chevron",
                                contentDescription = "Paragraf berikutnya",
                                size = 34.dp,
                                iconSize = 16.dp,
                                onClick = onTtsNext
                            )
                            GlassIconButton(
                                iconName = "close",
                                contentDescription = "Berhenti",
                                size = 32.dp,
                                iconSize = 15.dp,
                                onClick = onTtsStop
                            )
                        }
                    }
                }
            }

            // Top & Bottom HUD Controls Overlay
            AnimatedVisibility(
                visible = hudControlsVisible,
                enter = fadeIn(tween(180)) + slideInVertically(tween(200)) { -it / 2 },
                exit = fadeOut(tween(160)) + slideOutVertically(tween(160)) { -it / 2 },
                modifier = Modifier.align(Alignment.TopCenter)
            ) {
                GlassSurface(
                    cornerRadius = 999.dp,
                    elevated = true,
                    contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                    modifier = Modifier
                        .statusBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 10.dp)
                        .fillMaxWidth()
                ) {
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier.fillMaxWidth()
                    ) {
                        GlassIconButton(
                            iconName = "back",
                            contentDescription = I18n.t("Kembali ke Pustaka", "Back to Library", lang),
                            onClick = onBackToLibrary
                        )

                        Column(
                            horizontalAlignment = Alignment.CenterHorizontally,
                            modifier = Modifier
                                .weight(1f)
                                .padding(horizontal = 10.dp)
                        ) {
                            Text(
                                text = book.title,
                                color = palette.textPrimary,
                                fontFamily = KataKecilFonts.Ui,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 12.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = chapter?.navigationTitle ?: "",
                                color = palette.textSecondary,
                                fontFamily = KataKecilFonts.Ui,
                                fontSize = 11.5.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }

                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            GlassIconButton(
                                iconName = "bookmark",
                                contentDescription = I18n.t("Markah halaman", "Bookmark page", lang),
                                active = isCurrentPageBookmarked,
                                onClick = {
                                    val snippet = displayedPage.text
                                        .replace(Regex("\\s+"), " ")
                                        .take(90)
                                    onTogglePageBookmark(
                                        currentChapterIndex,
                                        displayedPageIndex,
                                        displayedPage.start,
                                        snippet
                                    )
                                }
                            )
                            GlassIconButton(
                                iconName = "search",
                                contentDescription = I18n.t("Cari di episode", "Search in episode", lang),
                                onClick = onOpenSearchDialog
                            )
                            GlassIconButton(
                                iconName = "list",
                                contentDescription = I18n.t("Buku Ini", "This Book", lang),
                                onClick = onOpenThisBookSheet
                            )
                        }
                    }
                }
            }

            AnimatedVisibility(
                visible = hudControlsVisible,
                enter = fadeIn(tween(180)) + slideInVertically(tween(200)) { it / 2 },
                exit = fadeOut(tween(160)) + slideOutVertically(tween(160)) { it / 2 },
                modifier = Modifier.align(Alignment.BottomCenter)
            ) {
                GlassSurface(
                    cornerRadius = 28.dp,
                    elevated = true,
                    contentPadding = PaddingValues(horizontal = 18.dp, vertical = 14.dp),
                    modifier = Modifier
                        .navigationBarsPadding()
                        .padding(horizontal = 16.dp, vertical = 12.dp)
                        .fillMaxWidth()
                ) {
                    Column(modifier = Modifier.fillMaxWidth()) {
                        // Page Scrubber Row
                        if (settings.readingMode == "pages" && pages.size > 1) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(10.dp)
                            ) {
                                Text(
                                    text = "${displayedPageIndex + 1}",
                                    color = palette.textSecondary,
                                    fontFamily = KataKecilFonts.Ui,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                                Slider(
                                    value = displayedPageIndex.toFloat(),
                                    onValueChange = { raw ->
                                        if (scrubberPreviewPage == null) { onTtsStop(); selectionRange = null; selectedExistingHighlight = null }
                                        scrubberPreviewPage = raw.roundToInt().coerceIn(0, pages.lastIndex)
                                    },
                                    onValueChangeFinished = {
                                        val committed = (scrubberPreviewPage ?: currentPageIndex)
                                            .coerceIn(0, pages.lastIndex)
                                        scrubberPreviewPage = null
                                        val slice = pages[committed]
                                        onPositionChanged(currentChapterIndex, slice.start, committed, pages.size)
                                    },
                                    valueRange = 0f..(pages.lastIndex.coerceAtLeast(1)).toFloat(),
                                    colors = SliderDefaults.colors(
                                        thumbColor = palette.accent,
                                        activeTrackColor = palette.accent
                                    ),
                                    modifier = Modifier.weight(1f)
                                )
                                Text(
                                    text = "${pages.size}",
                                    color = palette.textSecondary,
                                    fontFamily = KataKecilFonts.Ui,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.SemiBold
                                )
                            }
                            Spacer(modifier = Modifier.height(6.dp))
                        }

                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically
                        ) {
                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                GlassIconButton(
                                    iconName = "left",
                                    contentDescription = I18n.t("Episode sebelumnya", "Previous episode", lang),
                                    onClick = {
                                        if (currentChapterIndex > 0) {
                                            onSwitchEpisode(currentChapterIndex - 1, 0)
                                        }
                                    }
                                )
                                GlassIconButton(
                                    iconName = "chevron",
                                    contentDescription = I18n.t("Episode berikutnya", "Next episode", lang),
                                    onClick = {
                                        if (currentChapterIndex + 1 < chapters.size) {
                                            onSwitchEpisode(currentChapterIndex + 1, 0)
                                        }
                                    }
                                )
                            }

                            Text(
                                text = I18n.t(
                                    "Episode ${currentChapterIndex + 1} dari ${chapters.size.coerceAtLeast(1)}",
                                    "Episode ${currentChapterIndex + 1} of ${chapters.size.coerceAtLeast(1)}",
                                    lang
                                ),
                                color = palette.textSecondary,
                                fontFamily = KataKecilFonts.Ui,
                                fontSize = 12.5.sp,
                                fontWeight = FontWeight.Medium
                            )

                            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                GlassIconButton(
                                    iconName = "textSize",
                                    contentDescription = I18n.t("Tampilan Baca", "Reading Appearance", lang),
                                    onClick = onOpenAppearanceSheet
                                )
                                GlassIconButton(
                                    iconName = "sparkle",
                                    contentDescription = I18n.t("Alat Baca", "Reading Tools", lang),
                                    onClick = onOpenReadingToolsSheet
                                )
                            }
                        }
                    }
                }
            }

            if (pages.isEmpty() && chapterText.isNotEmpty()) {
                Box(Modifier.fillMaxSize().background(palette.readingPaper).pointerInput(Unit) { detectTapGestures(onTap = {}) }, contentAlignment = Alignment.Center) {
                    id.karisyono.katakecil.ui.components.LoadingWordmark()
                }
            }

            // Note Editor Dialog when adding/editing a note from selection
            val activeNoteTarget = noteDraftTarget
            if (activeNoteTarget != null) {
                NoteEditorDialog(
                    selectedText = activeNoteTarget.third,
                    initialNote = selectedExistingHighlight?.noteText ?: "",
                    initialColor = selectedExistingHighlight?.color ?: "amber",
                    lang = lang,
                    onDismiss = { noteDraftTarget = null },
                    onSave = { color, note ->
                        onCreateHighlight(
                            activeNoteTarget.first,
                            activeNoteTarget.second,
                            activeNoteTarget.third,
                            color,
                            note
                        )
                        noteDraftTarget = null
                        selectionRange = null
                        selectedExistingHighlight = null
                    }
                )
            }
        }
    }
}

private fun handlePageTap(
    fracX: Float,
    tapNavigation: Boolean,
    hudVisible: Boolean,
    hasSelection: Boolean,
    onClearSelection: () -> Unit,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onToggleHud: () -> Unit
) {
    if (hasSelection) {
        onClearSelection()
        return
    }
    if (hudVisible) {
        onToggleHud()
        return
    }
    if (tapNavigation) {
        when {
            fracX < 0.22f -> onPrev()
            fracX > 0.78f -> onNext()
            else -> onToggleHud()
        }
    } else {
        onToggleHud()
    }
}

@Composable
private fun ChapterHeadingBlock(chapter: Chapter, fontFamily: androidx.compose.ui.text.font.FontFamily) {
    val palette = LocalKataKecilPalette.current
    Column(modifier = Modifier.fillMaxWidth(), horizontalAlignment = Alignment.CenterHorizontally) {
        if (chapter.arc.isNotBlank()) {
            Text(
                text = chapter.arc.uppercase(),
                color = palette.accent,
                fontFamily = KataKecilFonts.Ui,
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp,
                letterSpacing = 1.4.sp
            )
            Spacer(modifier = Modifier.height(4.dp))
        }
        if (chapter.chapterLabel.isNotBlank() &&
            !chapter.chapterLabel.equals(chapter.title, ignoreCase = true)
        ) {
            Text(
                text = chapter.chapterLabel,
                color = palette.readingMuted,
                fontFamily = KataKecilFonts.Ui,
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.5.sp
            )
            Spacer(modifier = Modifier.height(2.dp))
        }
        Text(
            text = chapter.title,
            color = palette.readingText,
            fontFamily = fontFamily,
            fontWeight = FontWeight.Medium,
            fontSize = 22.sp,
            textAlign = TextAlign.Center,
            lineHeight = 30.sp
        )
    }
}

/**
 * Renders the page text with inline highlights, search matches, TTS paragraph highlight,
 * and custom 420ms long-press word/range selection with draggable handles.
 */
@Composable
private fun SelectableChapterPageText(
    pageSlice: PageSlice,
    baseTextStyle: TextStyle,
    paragraphIndentEm: Float,
    paragraphGap: Int,
    sourceText: String,
    annotations: List<AnnotationItem>,
    searchMatches: List<SearchMatch>,
    activeSearchMatchIndex: Int,
    ttsHighlightRange: IntRange?,
    selectionRange: IntRange?,
    onSelectionChanged: (IntRange?, AnnotationItem?) -> Unit,
    onTapZone: (Float) -> Unit
) {
    val palette = LocalKataKecilPalette.current
    val sliceText = pageSlice.text
    val sliceStart = pageSlice.start
    val sliceEnd = pageSlice.end
    var textLayoutResult by remember { mutableStateOf<TextLayoutResult?>(null) }

    val pageHighlights = remember(annotations, pageSlice) {
        annotations.filter {
            it.type == "highlight" &&
                it.chapterIndex == pageSlice.chapterIndex &&
                (it.endOffset ?: 0) > sliceStart &&
                (it.startOffset ?: 0) < sliceEnd
        }
    }

    val annotatedText = remember(
        sliceText,
        sliceStart,
        pageHighlights,
        searchMatches,
        activeSearchMatchIndex,
        ttsHighlightRange,
        selectionRange,
        palette.isDark,
        paragraphIndentEm, paragraphGap, sourceText
    ) {
        buildAnnotatedString {
            append(readingTextLayout(sliceText, sourceText, sliceStart, paragraphIndentEm, paragraphGap))

            // 1. Saved highlights
            for (hl in pageHighlights) {
                val hs = ((hl.startOffset ?: 0) - sliceStart).coerceIn(0, sliceText.length)
                val he = ((hl.endOffset ?: 0) - sliceStart).coerceIn(hs, sliceText.length)
                if (he > hs) {
                    addStyle(
                        SpanStyle(background = KataKecilThemeTokens.highlightColor(hl.color, palette.isDark)),
                        hs,
                        he
                    )
                }
            }

            // 2. Active TTS paragraph highlight
            if (ttsHighlightRange != null && ttsHighlightRange.first >= 0) {
                val ts = (ttsHighlightRange.first - sliceStart).coerceIn(0, sliceText.length)
                val te = (ttsHighlightRange.last - sliceStart).coerceIn(ts, sliceText.length)
                if (te > ts) {
                    addStyle(
                        SpanStyle(background = palette.accent.copy(alpha = 0.22f)),
                        ts,
                        te
                    )
                }
            }

            // 3. Search matches
            searchMatches.forEachIndexed { idx, match ->
                if (match.end > sliceStart && match.start < sliceEnd) {
                    val ms = (match.start - sliceStart).coerceIn(0, sliceText.length)
                    val me = (match.end - sliceStart).coerceIn(ms, sliceText.length)
                    if (me > ms) {
                        val isActive = idx == activeSearchMatchIndex
                        addStyle(
                            SpanStyle(
                                background = if (isActive) Color(0xCCEE9B00) else Color(0x66E9C46A),
                                color = if (isActive) Color.Black else Color.Unspecified
                            ),
                            ms,
                            me
                        )
                    }
                }
            }

            // 4. Active user text selection
            if (selectionRange != null) {
                val ss = (selectionRange.first - sliceStart).coerceIn(0, sliceText.length)
                val se = (selectionRange.last + 1 - sliceStart).coerceIn(ss, sliceText.length)
                if (se > ss) {
                    addStyle(
                        SpanStyle(background = palette.accent.copy(alpha = 0.32f)),
                        ss,
                        se
                    )
                }
            }
        }
    }

    Box(modifier = Modifier.fillMaxWidth()) {
        Text(
            text = annotatedText,
            style = baseTextStyle,
            onTextLayout = { textLayoutResult = it },
            modifier = Modifier
                .fillMaxWidth()
                .pointerInput(sliceText, sliceStart, pageHighlights) {
                    detectTapGestures(
                        onTap = { pos ->
                            val layout = textLayoutResult
                            if (layout != null) {
                                val localOffset = layout.getOffsetForPosition(pos)
                                val globalOffset = sliceStart + localOffset
                                val tappedHighlight = pageHighlights.firstOrNull { hl ->
                                    val s = hl.startOffset ?: 0
                                    val e = hl.endOffset ?: 0
                                    globalOffset in s until e
                                }
                                if (tappedHighlight != null) {
                                    val s = tappedHighlight.startOffset ?: globalOffset
                                    val e = (tappedHighlight.endOffset ?: (s + 1)) - 1
                                    onSelectionChanged(s..e, tappedHighlight)
                                    return@detectTapGestures
                                }
                            }
                            val fracX = if (size.width > 0) pos.x / size.width.toFloat() else 0.5f
                            onTapZone(fracX)
                        },
                        onLongPress = { pos ->
                            val layout = textLayoutResult ?: return@detectTapGestures
                            val localOffset = layout.getOffsetForPosition(pos).coerceIn(0, sliceText.length)
                            val wordBounds = findWordBoundsAt(sliceText, localOffset)
                            val globalStart = sliceStart + wordBounds.first
                            val globalEnd = sliceStart + wordBounds.last
                            val matchingHl = pageHighlights.firstOrNull { hl ->
                                val s = hl.startOffset ?: -1
                                val e = hl.endOffset ?: -1
                                globalStart >= s && globalEnd < e
                            }
                            onSelectionChanged(globalStart..globalEnd, matchingHl)
                        }
                    )
                }
                .pointerInput(sliceText, sliceStart, selectionRange) {
                    if (selectionRange != null) {
                        detectDragGestures { change, _ ->
                            val layout = textLayoutResult ?: return@detectDragGestures
                            change.consume()
                            val localOffset = layout.getOffsetForPosition(change.position).coerceIn(0, sliceText.length)
                            val globalOffset = sliceStart + localOffset
                            val anchorStart = selectionRange.first
                            val newRange = if (globalOffset >= anchorStart) {
                                anchorStart..globalOffset
                            } else {
                                globalOffset..selectionRange.last
                            }
                            onSelectionChanged(newRange, null)
                        }
                    }
                }
        )

        // Draw custom selection drag handles when selection is active on this page
        val layout = textLayoutResult
        if (selectionRange != null && layout != null && sliceText.isNotEmpty()) {
            val localStart = (selectionRange.first - sliceStart).coerceIn(0, sliceText.length - 1)
            val localEnd = (selectionRange.last - sliceStart).coerceIn(localStart, sliceText.length - 1)
            val startBox = runCatching { layout.getBoundingBox(localStart) }.getOrNull()
            val endBox = runCatching { layout.getBoundingBox(localEnd) }.getOrNull()

            if (startBox != null && endBox != null) {
                Canvas(modifier = Modifier.matchParentSize()) {
                    val handleRadius = 6.dp.toPx()
                    drawCircle(
                        color = palette.accent,
                        radius = handleRadius,
                        center = Offset(startBox.left, startBox.bottom + handleRadius)
                    )
                    drawCircle(
                        color = palette.accent,
                        radius = handleRadius,
                        center = Offset(endBox.right, endBox.bottom + handleRadius)
                    )
                }
            }
        }
    }
}

private fun findWordBoundsAt(text: String, offset: Int): IntRange {
    if (text.isEmpty()) return 0..0
    val safe = offset.coerceIn(0, text.lastIndex)
    var start = safe
    while (start > 0 && !text[start - 1].isWhitespace()) {
        start--
    }
    var end = safe
    while (end < text.lastIndex && !text[end + 1].isWhitespace()) {
        end++
    }
    return start..end
}
