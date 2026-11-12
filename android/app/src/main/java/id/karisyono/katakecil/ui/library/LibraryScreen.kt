package id.karisyono.katakecil.ui.library

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.spring
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
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
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateMapOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.zIndex
import id.karisyono.katakecil.R
import id.karisyono.katakecil.core.i18n.I18n
import id.karisyono.katakecil.core.model.BookMeta
import id.karisyono.katakecil.core.model.DeviceSettings
import id.karisyono.katakecil.core.model.ReadingProgress
import id.karisyono.katakecil.core.theme.CoverColors
import id.karisyono.katakecil.core.theme.KataKecilFonts
import id.karisyono.katakecil.core.theme.LocalKataKecilPalette
import id.karisyono.katakecil.ui.components.AmbientBackground
import id.karisyono.katakecil.ui.components.BookCoverView
import id.karisyono.katakecil.ui.components.GlassIconButton
import id.karisyono.katakecil.ui.components.GlassPillButton
import id.karisyono.katakecil.ui.components.GlassSurface
import id.karisyono.katakecil.ui.components.LoadingWordmark
import kotlinx.coroutines.launch
import kotlin.math.abs
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sign

/**
 * Port of dist/shelf-carousel.js, dist/shelf-carousel.css, and Library view in dist/app.js.
 * Renders the layered 3D cover carousel with ring wrapping, dominant cover color glow,
 * reading status pill, and responsive portrait/landscape split-stage layout.
 */
@Composable
fun LibraryScreen(
    books: List<BookMeta>,
    progressMap: Map<String, ReadingProgress>,
    settings: DeviceSettings,
    isLoading: Boolean,
    errorMessage: String?,
    selectedIndex: Int,
    onSelectIndex: (Int) -> Unit,
    onOpenBook: (BookMeta) -> Unit,
    onImportEpubClick: () -> Unit,
    onOpenSettingsClick: () -> Unit,
    onRefreshCatalog: () -> Unit
) {
    val palette = LocalKataKecilPalette.current
    val lang = settings.uiLanguage
    val coverColors = remember { mutableStateMapOf<String, Color>() }
    val safeIndex = if (books.isEmpty()) 0 else selectedIndex.coerceIn(0, books.lastIndex)
    val activeBook = books.getOrNull(safeIndex)
    val activeCoverColor = activeBook?.let { coverColors[it.id] } ?: palette.accent

    AmbientBackground(tintColor = activeCoverColor) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 20.dp, vertical = 14.dp)
        ) {
            // Top bar with KataKecil Wordmark + Import + Settings
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Image(
                    painter = painterResource(
                        if (palette.isDark) R.drawable.katakecil_wordmark_cream else R.drawable.katakecil_wordmark
                    ),
                    contentDescription = "KataKecil",
                    contentScale = ContentScale.Fit,
                    modifier = Modifier.height(34.dp)
                )

                Row(
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    GlassIconButton(
                        iconName = "plus",
                        contentDescription = I18n.t("Impor EPUB", "Import EPUB", lang),
                        onClick = onImportEpubClick
                    )
                    GlassIconButton(
                        iconName = "sliders",
                        contentDescription = I18n.t("Pengaturan", "Settings", lang),
                        onClick = onOpenSettingsClick
                    )
                }
            }

            Spacer(modifier = Modifier.height(12.dp))

            when {
                isLoading && books.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        LoadingWordmark(
                            caption = I18n.t("Memuat pustaka…", "Loading library…", lang)
                        )
                    }
                }

                books.isEmpty() -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        GlassSurface(
                            cornerRadius = 26.dp,
                            elevated = true,
                            contentPadding = PaddingValues(28.dp),
                            modifier = Modifier.width(360.dp)
                        ) {
                            Column(
                                horizontalAlignment = Alignment.CenterHorizontally
                            ) {
                                Text(
                                    text = I18n.t("Pustaka Belum Tersedia", "Library Unavailable", lang),
                                    color = palette.textPrimary,
                                    fontFamily = KataKecilFonts.Fraunces,
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 20.sp,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    text = errorMessage ?: I18n.t(
                                        "Periksa sambungan internet untuk memuat katalog terbitan, atau impor file EPUB pribadi Anda.",
                                        "Check your connection to load the published catalog, or import a personal EPUB file.",
                                        lang
                                    ),
                                    color = palette.textSecondary,
                                    fontFamily = KataKecilFonts.DmSans,
                                    fontSize = 14.sp,
                                    textAlign = TextAlign.Center
                                )
                                Spacer(modifier = Modifier.height(20.dp))
                                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                    GlassPillButton(
                                        text = I18n.t("Muat Ulang", "Retry", lang),
                                        leadingIcon = "refresh",
                                        onClick = onRefreshCatalog
                                    )
                                    GlassPillButton(
                                        text = I18n.t("Impor EPUB", "Import EPUB", lang),
                                        leadingIcon = "plus",
                                        primary = true,
                                        onClick = onImportEpubClick
                                    )
                                }
                            }
                        }
                    }
                }

                else -> {
                    BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
                        val isWideSplit = maxWidth >= 720.dp && maxHeight >= 440.dp

                        if (isWideSplit && activeBook != null) {
                            Row(
                                modifier = Modifier
                                    .fillMaxSize()
                                    .padding(vertical = 12.dp),
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(28.dp)
                            ) {
                                Box(
                                    modifier = Modifier
                                        .weight(1.15f)
                                        .fillMaxHeight(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    ShelfCarouselStage(
                                        books = books,
                                        selectedIndex = safeIndex,
                                        activeCoverColor = activeCoverColor,
                                        onSelectIndex = onSelectIndex,
                                        onOpenBook = onOpenBook,
                                        onCoverColorResolved = { id, col -> coverColors[id] = col }
                                    )
                                }
                                Box(
                                    modifier = Modifier
                                        .weight(0.85f)
                                        .fillMaxHeight(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    ActiveBookDetailStage(
                                        book = activeBook,
                                        progress = progressMap[activeBook.id],
                                        totalBooks = books.size,
                                        selectedIndex = safeIndex,
                                        lang = lang,
                                        onSelectIndex = onSelectIndex,
                                        onOpenBook = { onOpenBook(activeBook) }
                                    )
                                }
                            }
                        } else if (activeBook != null) {
                            Column(
                                modifier = Modifier.fillMaxSize(),
                                horizontalAlignment = Alignment.CenterHorizontally,
                                verticalArrangement = Arrangement.SpaceBetween
                            ) {
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .fillMaxWidth(),
                                    contentAlignment = Alignment.Center
                                ) {
                                    ShelfCarouselStage(
                                        books = books,
                                        selectedIndex = safeIndex,
                                        activeCoverColor = activeCoverColor,
                                        onSelectIndex = onSelectIndex,
                                        onOpenBook = onOpenBook,
                                        onCoverColorResolved = { id, col -> coverColors[id] = col }
                                    )
                                }

                                ActiveBookDetailStage(
                                    book = activeBook,
                                    progress = progressMap[activeBook.id],
                                    totalBooks = books.size,
                                    selectedIndex = safeIndex,
                                    lang = lang,
                                    onSelectIndex = onSelectIndex,
                                    onOpenBook = { onOpenBook(activeBook) },
                                    modifier = Modifier.padding(bottom = 14.dp)
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ShelfCarouselStage(
    books: List<BookMeta>,
    selectedIndex: Int,
    activeCoverColor: Color,
    onSelectIndex: (Int) -> Unit,
    onOpenBook: (BookMeta) -> Unit,
    onCoverColorResolved: (String, Color) -> Unit
) {
    val count = books.size
    val isCircularRack = count >= 5
    val scope = rememberCoroutineScope()
    val positionAnim = remember { Animatable(selectedIndex.toFloat()) }

    LaunchedEffect(selectedIndex, count) {
        val current = positionAnim.value
        val target = selectedIndex.toFloat()
        val delta = if (isCircularRack) {
            ShelfCarouselMath.ringDistance(target, current, count)
        } else {
            target - current
        }
        positionAnim.animateTo(
            targetValue = current + delta,
            animationSpec = spring(
                dampingRatio = Spring.DampingRatioLowBouncy,
                stiffness = Spring.StiffnessMediumLow
            )
        )
    }

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxWidth()
            .height(340.dp)
            .pointerInput(count, selectedIndex) {
                var dragAccum = 0f
                val stepPx = 140.dp.toPx()
                detectHorizontalDragGestures(
                    onDragStart = { dragAccum = 0f },
                    onHorizontalDrag = { change, dragAmount ->
                        change.consume()
                        dragAccum += dragAmount
                        val deltaIndex = -dragAmount / stepPx
                        val nextRaw = positionAnim.value + deltaIndex
                        val clamped = if (isCircularRack) {
                            ShelfCarouselMath.wrapIndexFloat(nextRaw, count)
                        } else {
                            nextRaw.coerceIn(-0.35f, (count - 1).coerceAtLeast(0) + 0.35f)
                        }
                        scope.launch { positionAnim.snapTo(clamped) }
                    },
                    onDragEnd = {
                        val settled = if (abs(dragAccum) > stepPx * 0.22f) {
                            val dir = if (dragAccum < 0) 1 else -1
                            if (isCircularRack) {
                                ShelfCarouselMath.wrapIndex(selectedIndex + dir, count)
                            } else {
                                (selectedIndex + dir).coerceIn(0, count - 1)
                            }
                        } else {
                            val rounded = positionAnim.value.roundToInt()
                            if (isCircularRack) {
                                ShelfCarouselMath.wrapIndex(rounded, count)
                            } else {
                                rounded.coerceIn(0, count - 1)
                            }
                        }
                        onSelectIndex(settled)
                    }
                )
            },
        contentAlignment = Alignment.Center
    ) {
        val coverWidth = min(maxWidth.value * 0.52f, 206f).dp
        val coverHeight = coverWidth * 1.48f
        val stepPx = (coverWidth.value * 0.56f).dp

        // Radial glow behind the active cover
        Canvas(
            modifier = Modifier
                .size(coverWidth * 1.65f, coverHeight * 1.25f)
        ) {
            drawCircle(
                brush = Brush.radialGradient(
                    colors = listOf(
                        activeCoverColor.copy(alpha = 0.36f),
                        Color.Transparent
                    ),
                    center = Offset(size.width / 2f, size.height / 2f),
                    radius = size.minDimension * 0.56f
                ),
                radius = size.minDimension * 0.56f
            )
        }

        val currentPos = positionAnim.value
        books.forEachIndexed { idx, book ->
            val d = if (isCircularRack) {
                ShelfCarouselMath.ringDistance(idx.toFloat(), currentPos, count)
            } else {
                idx.toFloat() - currentPos
            }
            val absD = abs(d)
            if (absD <= 2.6f) {
                val offsetFactor = if (absD <= 1f) {
                    d
                } else {
                    sign(d) * (1f + (absD - 1f) * 0.62f)
                }
                val offsetX = stepPx * offsetFactor
                val offsetY = min(16f, absD * 7f).dp
                val scale = (1f - min(0.36f, absD * 0.16f)).coerceIn(0.62f, 1f)
                val alpha = (1f - min(0.72f, absD * 0.28f)).coerceIn(0.25f, 1f)

                Box(
                    modifier = Modifier
                        .zIndex(10f - absD)
                        .offset {
                            IntOffset(
                                x = offsetX.roundToPx(),
                                y = offsetY.roundToPx()
                            )
                        }
                        .graphicsLayer {
                            scaleX = scale
                            scaleY = scale
                            this.alpha = alpha
                        }
                        .size(coverWidth, coverHeight)
                        .shadow(
                            elevation = if (absD < 0.4f) 24.dp else 10.dp,
                            shape = RoundedCornerShape(18.dp),
                            spotColor = activeCoverColor.copy(alpha = 0.45f)
                        )
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {
                            if (idx == selectedIndex) {
                                onOpenBook(book)
                            } else {
                                onSelectIndex(idx)
                            }
                        }
                ) {
                    BookCoverView(
                        title = book.title,
                        author = book.author,
                        coverUrl = book.effectiveCover,
                        cornerRadius = 18.dp,
                        modifier = Modifier.fillMaxSize(),
                        onDominantColorExtracted = { col ->
                            onCoverColorResolved(book.id, col)
                        }
                    )
                }
            }
        }
    }
}

@Composable
private fun ActiveBookDetailStage(
    book: BookMeta,
    progress: ReadingProgress?,
    totalBooks: Int,
    selectedIndex: Int,
    lang: String,
    onSelectIndex: (Int) -> Unit,
    onOpenBook: () -> Unit,
    modifier: Modifier = Modifier
) {
    val palette = LocalKataKecilPalette.current
    val pct = progress?.percentage ?: 0.0
    val statusLabel = I18n.formatReadingProgressStatus(pct, lang)
    val hasStarted = pct > 0.0
    val actionLabel = if (hasStarted) {
        I18n.t("Lanjutkan membaca", "Continue reading", lang)
    } else {
        I18n.t("Baca buku", "Read book", lang)
    }

    Column(
        modifier = modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally
    ) {
        // Carousel Dots & Counter (max 5 visible dots with ring wrapping)
        if (totalBooks > 1) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                val visibleDots = min(5, totalBooks)
                val dotIndices = ShelfCarouselMath.visibleDotIndices(selectedIndex, totalBooks, visibleDots)
                for (bookIdx in dotIndices) {
                    val active = bookIdx == selectedIndex
                    Box(
                        modifier = Modifier
                            .height(7.dp)
                            .width(if (active) 22.dp else 7.dp)
                            .clip(CircleShape)
                            .background(
                                if (active) palette.accent else palette.textMuted.copy(alpha = 0.35f)
                            )
                            .clickable { onSelectIndex(bookIdx) }
                    )
                }
                if (totalBooks >= 5) {
                    Spacer(modifier = Modifier.width(4.dp))
                    Text(
                        text = "${selectedIndex + 1} / $totalBooks",
                        color = palette.textMuted,
                        fontFamily = KataKecilFonts.DmSans,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
        }

        if (book.source == "local") {
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(palette.accent.copy(alpha = 0.15f))
                    .padding(horizontal = 10.dp, vertical = 3.dp)
            ) {
                Text(
                    text = I18n.t("EPUB Pribadi", "Personal EPUB", lang),
                    color = palette.accent,
                    fontFamily = KataKecilFonts.DmSans,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.SemiBold
                )
            }
            Spacer(modifier = Modifier.height(6.dp))
        }

        Text(
            text = book.title,
            color = palette.textPrimary,
            fontFamily = KataKecilFonts.Fraunces,
            fontWeight = FontWeight.SemiBold,
            fontSize = 24.sp,
            lineHeight = 30.sp,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 16.dp)
        )

        Spacer(modifier = Modifier.height(4.dp))

        Text(
            text = book.author,
            color = palette.textSecondary,
            fontFamily = KataKecilFonts.DmSans,
            fontSize = 14.sp,
            fontWeight = FontWeight.Medium,
            textAlign = TextAlign.Center,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )

        Spacer(modifier = Modifier.height(14.dp))

        // Reading status pill with glowing indicator dot
        GlassSurface(
            cornerRadius = 999.dp,
            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 6.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Box(
                    modifier = Modifier
                        .size(8.dp)
                        .clip(CircleShape)
                        .background(
                            if (pct >= 100.0) Color(0xFF4CAF50)
                            else if (hasStarted) palette.accent
                            else palette.textMuted.copy(alpha = 0.5f)
                        )
                )
                Text(
                    text = statusLabel,
                    color = palette.textPrimary,
                    fontFamily = KataKecilFonts.DmSans,
                    fontSize = 12.5.sp,
                    fontWeight = FontWeight.Medium
                )
            }
        }

        Spacer(modifier = Modifier.height(16.dp))

        GlassPillButton(
            text = actionLabel,
            leadingIcon = "bookOpen",
            primary = true,
            onClick = onOpenBook,
            modifier = Modifier.width(230.dp)
        )
    }
}

object ShelfCarouselMath {
    fun wrapIndex(index: Int, count: Int): Int {
        if (count <= 0) return 0
        return ((index % count) + count) % count
    }

    fun wrapIndexFloat(value: Float, count: Int): Float {
        if (count <= 0) return 0f
        val c = count.toFloat()
        return ((value % c) + c) % c
    }

    fun ringDistance(target: Float, center: Float, count: Int): Float {
        if (count <= 0) return 0f
        val c = count.toFloat()
        var diff = (target - center) % c
        if (diff > c / 2f) diff -= c
        if (diff < -c / 2f) diff += c
        return diff
    }

    fun visibleDotIndices(selectedIndex: Int, totalCount: Int, maxDots: Int = 5): List<Int> {
        if (totalCount <= maxDots) return (0 until totalCount).toList()
        val half = maxDots / 2
        return (-half..half).map { offset ->
            wrapIndex(selectedIndex + offset, totalCount)
        }
    }
}
