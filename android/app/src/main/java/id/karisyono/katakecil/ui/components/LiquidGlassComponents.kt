package id.karisyono.katakecil.ui.components

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Base64
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInVertically
import androidx.compose.animation.slideOutVertically
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.imageResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.karisyono.katakecil.ui.components.WebDialog as Dialog
import id.karisyono.katakecil.R
import id.karisyono.katakecil.core.theme.CoverColors
import id.karisyono.katakecil.core.theme.KataKecilFonts
import id.karisyono.katakecil.core.theme.KataKecilThemeTokens
import id.karisyono.katakecil.core.theme.LocalKataKecilPalette
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.ConcurrentHashMap
import kotlin.math.PI
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.hypot
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sin

/**
 * Stationary ambient radial wash behind Library, Settings, and Dialogs (dist/ambient.css).
 * Never applied to the reading paper surface itself.
 */
@Composable
fun AmbientBackground(
    modifier: Modifier = Modifier,
    tintColor: Color? = null,
    content: @Composable BoxScope.() -> Unit
) {
    val palette = LocalKataKecilPalette.current
    val activeTint = tintColor ?: palette.accent
    val intensity = palette.ambientIntensity.coerceIn(0f, 1f)

    Box(
        modifier = modifier
            .fillMaxSize()
            .background(palette.background)
    ) {
        if (intensity > 0.01f) {
            Canvas(modifier = Modifier.fillMaxSize()) {
                val w = size.width
                val h = size.height
                val radius1 = maxOf(w, h) * 0.68f
                val radius2 = maxOf(w, h) * 0.62f
                val alpha1 = (if (palette.isDark) 0.18f else 0.22f) * intensity
                val alpha2 = (if (palette.isDark) 0.08f else 0.10f) * intensity

                drawCircle(
                    brush = Brush.radialGradient(
                        colors = listOf(activeTint.copy(alpha = alpha1), Color.Transparent),
                        center = Offset(w * 0.10f, h * 0.08f),
                        radius = radius1
                    ),
                    radius = radius1,
                    center = Offset(w * 0.10f, h * 0.08f)
                )
                drawCircle(
                    brush = Brush.radialGradient(
                        colors = listOf(palette.accent.copy(alpha = alpha2), Color.Transparent),
                        center = Offset(w * 0.90f, h * 0.92f),
                        radius = radius2
                    ),
                    radius = radius2,
                    center = Offset(w * 0.90f, h * 0.92f)
                )
            }
        }
        content()
    }
}

/**
 * Liquid Glass container with specular top/bottom bevel rim, inner frost, and configurable transparency.
 */
@Composable
fun GlassSurface(
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 22.dp,
    elevated: Boolean = false,
    contentPadding: PaddingValues = PaddingValues(0.dp),
    content: @Composable BoxScope.() -> Unit
) {
    val palette = LocalKataKecilPalette.current
    val shape = RoundedCornerShape(cornerRadius)
    val baseAlpha = palette.glassFillAlpha
    val baseSurface = palette.background
    val topSpecular = if (palette.isDark) {
        Color.White.copy(alpha = 0.22f)
    } else {
        Color.White.copy(alpha = 0.22f)
    }
    val bottomRim = if (palette.isDark) {
        Color.White.copy(alpha = 0.07f)
    } else {
        Color.Black.copy(alpha = 0.08f)
    }

    Box(
        modifier = modifier
            .shadow(
                elevation = if (elevated) 8.dp else 3.dp,
                shape = shape,
                ambientColor = Color.Black.copy(alpha = 0.16f),
                spotColor = Color.Black.copy(alpha = 0.18f)
            )
            .clip(shape)
            .background(
                brush = Brush.verticalGradient(
                    colors = listOf(
                        baseSurface.copy(alpha = (baseAlpha + 0.06f).coerceAtMost(0.98f)),
                        baseSurface.copy(alpha = baseAlpha)
                    )
                )
            )
            .border(
                width = 1.dp,
                brush = Brush.verticalGradient(listOf(topSpecular, bottomRim)),
                shape = shape
            )
            .pointerInput(Unit) { detectTapGestures(onTap = {}) }
    ) {
        GlassBackdrop(Modifier.matchParentSize())
        Box(Modifier.matchParentSize().background(Brush.verticalGradient(listOf(baseSurface.copy(alpha = baseAlpha), baseSurface.copy(alpha = baseAlpha)))))
        Box(Modifier.padding(contentPadding), content = content)
    }
}

@Composable
fun GlassIconButton(
    iconName: String,
    contentDescription: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: Dp = 42.dp,
    iconSize: Dp = 20.dp,
    active: Boolean = false,
    tint: Color? = null
) {
    val palette = LocalKataKecilPalette.current
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed) 0.965f else 1f,
        animationSpec = spring(dampingRatio = 0.65f, stiffness = 600f),
        label = "iconPressScale"
    )
    val effectiveTint = tint ?: if (active) palette.accent else palette.textPrimary

    Box(
        modifier = modifier
            .size(size)
            .scale(scale)
            .clip(CircleShape)
            .background(if (active) palette.accent.copy(alpha = .10f) else Color.Transparent)
            .clickable(
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            ),
        contentAlignment = Alignment.Center
    ) {
        KataKecilIcon(
            name = iconName,
            size = iconSize,
            tint = effectiveTint
        )
    }
}

@Composable
fun GlassPillButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    leadingIcon: String? = null,
    primary: Boolean = false,
    enabled: Boolean = true
) {
    val palette = LocalKataKecilPalette.current
    val interactionSource = remember { MutableInteractionSource() }
    val isPressed by interactionSource.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (isPressed && enabled) 0.96f else 1f,
        animationSpec = spring(dampingRatio = 0.7f, stiffness = 600f),
        label = "pillScale"
    )
    val shape = RoundedCornerShape(12.dp)
    val bgBrush = if (primary) {
        Brush.verticalGradient(
            listOf(
                palette.accent.copy(alpha = if (enabled) 0.96f else 0.45f),
                palette.accent.copy(alpha = if (enabled) 0.84f else 0.38f)
            )
        )
    } else {
        val fillAlpha = 0f
        Brush.verticalGradient(
            listOf(
                palette.surfaceElevated.copy(alpha = fillAlpha),
                palette.surface.copy(alpha = fillAlpha)
            )
        )
    }
    val contentColor = if (primary) {
        Color.White.copy(alpha = if (enabled) 1f else 0.6f)
    } else {
        palette.textPrimary.copy(alpha = if (enabled) 1f else 0.45f)
    }

    Row(
        modifier = modifier
            .scale(scale)
            .shadow(if (primary) 8.dp else 3.dp, shape)
            .clip(shape)
            .background(bgBrush)
            .border(
                width = 1.dp,
                color = if (primary) {
                    Color.White.copy(alpha = 0.28f)
                } else if (palette.isDark) {
                    Color.White.copy(alpha = 0.16f)
                } else {
                    Color.White.copy(alpha = 0.7f)
                },
                shape = shape
            )
            .clickable(
                enabled = enabled,
                interactionSource = interactionSource,
                indication = null,
                onClick = onClick
            )
            .heightIn(min = 44.dp).padding(horizontal = 16.dp, vertical = 9.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.Center
    ) {
        if (leadingIcon != null) {
            KataKecilIcon(
                name = leadingIcon,
                size = 17.dp,
                tint = contentColor
            )
            Spacer(modifier = Modifier.width(8.dp))
        }
        Text(
            text = text,
            color = contentColor,
            fontFamily = KataKecilFonts.Ui,
            fontWeight = FontWeight.SemiBold,
            fontSize = 12.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis
        )
    }
}

/**
 * Port of dist/glass-tabs.js:
 * Interactive Liquid Glass tab switcher with a draggable refractive pill lens that stretches with velocity.
 */
@Composable
fun <T> LiquidGlassTabs(
    tabs: List<Pair<T, String>>,
    selectedTab: T,
    onTabSelected: (T) -> Unit,
    modifier: Modifier = Modifier
) {
    if (tabs.isEmpty()) return
    val palette = LocalKataKecilPalette.current
    val selectedIndex = tabs.indexOfFirst { it.first == selectedTab }.coerceAtLeast(0)
    var dragFraction by remember { mutableStateOf<Float?>(null) }
    var dragVelocityStretch by remember { mutableFloatStateOf(0f) }

    val targetFraction = dragFraction ?: selectedIndex.toFloat()
    val animatedFraction by animateFloatAsState(
        targetValue = targetFraction,
        animationSpec = spring(dampingRatio = 0.72f, stiffness = 480f),
        label = "tabLensFraction"
    )
    val stretchX by animateFloatAsState(
        targetValue = 1f + min(0.14f, kotlin.math.abs(dragVelocityStretch) * 0.008f),
        animationSpec = spring(dampingRatio = 0.6f, stiffness = 500f),
        label = "lensStretchX"
    )

    BoxWithConstraints(
        modifier = modifier
            .fillMaxWidth()
            .height(44.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(
                palette.surface.copy(alpha = (palette.glassFillAlpha + 0.08f).coerceIn(0.18f, 0.88f))
            )
            .border(
                1.dp,
                if (palette.isDark) Color.White.copy(alpha = 0.14f) else Color.Black.copy(alpha = 0.08f),
                RoundedCornerShape(999.dp)
            )
            .padding(4.dp)
    ) {
        val tabCount = tabs.size
        val slotWidth = maxWidth / tabCount

        // Refractive active lens pill
        Box(
            modifier = Modifier
                .offset(x = slotWidth * animatedFraction)
                .width(slotWidth)
                .fillMaxHeight()
                .graphicsLayer {
                    scaleX = stretchX
                    scaleY = 2f - stretchX
                }
                .shadow(4.dp, RoundedCornerShape(999.dp))
                .clip(RoundedCornerShape(999.dp))
                .background(
                    Brush.verticalGradient(
                        listOf(
                            palette.accent.copy(alpha = 0.92f),
                            palette.accent.copy(alpha = 0.80f)
                        )
                    )
                )
                .border(1.dp, Color.White.copy(alpha = 0.34f), RoundedCornerShape(999.dp))
        )

        Row(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(tabCount) {
                    detectDragGestures(
                        onDragStart = { offset ->
                            val frac = ((offset.x / size.width) * tabCount - 0.5f)
                                .coerceIn(0f, (tabCount - 1).toFloat())
                            dragFraction = frac
                        },
                        onDrag = { change, dragAmount ->
                            change.consume()
                            dragVelocityStretch = dragAmount.x
                            val pos = change.position.x
                            val frac = ((pos / size.width) * tabCount - 0.5f)
                                .coerceIn(0f, (tabCount - 1).toFloat())
                            dragFraction = frac
                        },
                        onDragEnd = {
                            val settled = (dragFraction ?: selectedIndex.toFloat())
                                .roundToInt()
                                .coerceIn(0, tabCount - 1)
                            dragFraction = null
                            dragVelocityStretch = 0f
                            onTabSelected(tabs[settled].first)
                        },
                        onDragCancel = {
                            dragFraction = null
                            dragVelocityStretch = 0f
                        }
                    )
                },
            verticalAlignment = Alignment.CenterVertically
        ) {
            tabs.forEachIndexed { idx, (tabValue, label) ->
                val isSelected = idx == (dragFraction?.roundToInt() ?: selectedIndex)
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null
                        ) {
                            onTabSelected(tabValue)
                        },
                    contentAlignment = Alignment.Center
                ) {
                    Text(
                        text = label,
                        color = if (isSelected) Color.White else palette.textSecondary,
                        fontFamily = KataKecilFonts.Ui,
                        fontWeight = if (isSelected) FontWeight.SemiBold else FontWeight.Medium,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

/**
 * Port of dist/loading-logo.js & dist/loading-logo.css:
 *Slices the KataKecil wordmark into 9 horizontal letter strips ([0, 16, 28.5, 37, 50, 61, 73.3, 85.5, 90, 100]%)
 * with a staggered vertical wave animation (3.2s cycle, 0.13s delay step) + 3 bouncing dots.
 */
@Composable
fun LoadingWordmark(
    modifier: Modifier = Modifier,
    caption: String = ""
) {
    val palette = LocalKataKecilPalette.current
    val wordmarkRes = if (palette.isDark) {
        R.drawable.katakecil_wordmark_cream
    } else {
        R.drawable.katakecil_wordmark
    }
    val imageBitmap = ImageBitmap.imageResource(wordmarkRes)
    val stops = remember {
        floatArrayOf(0f, 0.16f, 0.285f, 0.37f, 0.50f, 0.61f, 0.733f, 0.855f, 0.90f, 1.0f)
    }

    val infiniteTransition = rememberInfiniteTransition(label = "loadingWave")
    val phase by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 3200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart
        ),
        label = "wavePhase"
    )

    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Canvas(
            modifier = Modifier
                .width(196.dp)
                .height(54.dp)
        ) {
            val srcW = imageBitmap.width
            val srcH = imageBitmap.height
            val dstW = size.width
            val dstH = size.height

            for (i in 0 until (stops.size - 1)) {
                val startRatio = stops[i]
                val endRatio = stops[i + 1]
                val stripPhase = ((phase - (i * 0.13f / 3.2f)) % 1f + 1f) % 1f
                val wave = sin(stripPhase * 2f * PI.toFloat())
                val offsetY = wave * 4.5f.dp.toPx()

                val srcX = (startRatio * srcW).roundToInt().coerceIn(0, srcW - 1)
                val srcEndX = (endRatio * srcW).roundToInt().coerceIn(srcX + 1, srcW)
                val dstX = (startRatio * dstW).roundToInt()
                val dstEndX = (endRatio * dstW).roundToInt()

                drawImage(
                    image = imageBitmap,
                    srcOffset = IntOffset(srcX, 0),
                    srcSize = IntSize(srcEndX - srcX, srcH),
                    dstOffset = IntOffset(dstX, offsetY.roundToInt()),
                    dstSize = IntSize((dstEndX - dstX).coerceAtLeast(1), dstH.roundToInt())
                )
            }
        }

        Spacer(modifier = Modifier.height(10.dp))

        Row(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            for (dotIdx in 0..2) {
                val dotPhase = ((phase * 2f - dotIdx * 0.18f) % 1f + 1f) % 1f
                val bounce = sin(dotPhase * PI.toFloat()).coerceAtLeast(0f)
                Box(
                    modifier = Modifier
                        .offset(y = (-bounce * 4f).dp)
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(palette.accent.copy(alpha = 0.45f + bounce * 0.55f))
                )
            }
        }

        if (caption.isNotBlank()) {
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = caption,
                color = palette.textSecondary,
                fontFamily = KataKecilFonts.Ui,
                fontSize = 13.sp,
                fontWeight = FontWeight.Medium
            )
        }
    }
}

object CoverBitmapCache {
    private val memoryCache = ConcurrentHashMap<String, Bitmap>()
    private val colorCache = ConcurrentHashMap<String, Color>()

    fun getCachedColor(key: String): Color? = colorCache[key]

    suspend fun loadBitmapAndColor(
        context: android.content.Context,
        coverUrl: String
    ): Pair<Bitmap?, Color> = withContext(Dispatchers.IO) {
        if (coverUrl.isBlank()) return@withContext null to CoverColors.DefaultCoverColor
        memoryCache[coverUrl]?.let { bmp ->
            val col = colorCache[coverUrl] ?: CoverColors.extractDominantColor(bmp)
            return@withContext bmp to col
        }

        val bitmap: Bitmap? = try {
            when {
                coverUrl.startsWith("data:image/", ignoreCase = true) -> {
                    val b64 = coverUrl.substringAfter("base64,", "")
                    if (b64.isNotEmpty()) {
                        val bytes = Base64.decode(b64, Base64.DEFAULT)
                        BitmapFactory.decodeByteArray(bytes, 0, bytes.size)
                    } else null
                }
                coverUrl.startsWith("http://", true) || coverUrl.startsWith("https://", true) -> {
                    val cacheDir = File(context.cacheDir, "cover_cache").apply { mkdirs() }
                    val fileKey = coverUrl.hashCode().toUInt().toString(16)
                    val diskFile = File(cacheDir, "cov_$fileKey.bin")
                    val bytes = if (diskFile.exists() && diskFile.length() > 0L) {
                        diskFile.readBytes()
                    } else {
                        val conn = (URL(coverUrl).openConnection() as HttpURLConnection).apply {
                            connectTimeout = 10_000
                            readTimeout = 15_000
                        }
                        if (conn.responseCode in 200..299) {
                            conn.inputStream.use { it.readBytes() }.also {
                                runCatching { diskFile.writeBytes(it) }
                            }
                        } else null
                    }
                    bytes?.let { BitmapFactory.decodeByteArray(it, 0, it.size) }
                }
                else -> {
                    val assetPath = coverUrl
                        .removePrefix("./")
                        .removePrefix("/")
                        .removePrefix("assets/")
                    runCatching {
                        context.assets.open(assetPath).use { BitmapFactory.decodeStream(it) }
                    }.getOrNull()
                }
            }
        } catch (_: Throwable) {
            null
        }

        val color = CoverColors.extractDominantColor(bitmap)
        if (bitmap != null) {
            memoryCache[coverUrl] = bitmap
            colorCache[coverUrl] = color
        }
        bitmap to color
    }
}

@Composable
fun BookCoverView(
    title: String,
    author: String,
    coverUrl: String,
    modifier: Modifier = Modifier,
    cornerRadius: Dp = 4.dp,
    onDominantColorExtracted: (Color) -> Unit = {}
) {
    val context = LocalContext.current
    val palette = LocalKataKecilPalette.current
    var bitmap by remember(coverUrl) { mutableStateOf<Bitmap?>(null) }

    LaunchedEffect(coverUrl) {
        val (bmp, col) = CoverBitmapCache.loadBitmapAndColor(context, coverUrl)
        bitmap = bmp
        onDominantColorExtracted(col)
    }

    val shape = RoundedCornerShape(cornerRadius)
    Box(
        modifier = modifier
            .clip(shape)
            .background(
                Brush.linearGradient(
                    colors = listOf(
                        if (bitmap == null) palette.accent.copy(alpha = .88f) else Color.Transparent,
                        if (bitmap == null) Color(0xFF283845) else Color.Transparent
                    )
                )
            )
            .border(
                width = 1.dp,
                color = Color.Transparent,
                shape = shape
            )
    ) {
        val currentBitmap = bitmap
        if (currentBitmap != null) {
            Image(
                bitmap = currentBitmap.asImageBitmap(),
                contentDescription = title,
                contentScale = ContentScale.Fit,
                modifier = Modifier.fillMaxSize()
            )
        } else {
            // Generic artistic cover matching dist/ui.js genericCover
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(18.dp),
                verticalArrangement = Arrangement.SpaceBetween
            ) {
                Text(
                    text = "KATAKECIL",
                    color = Color.White.copy(alpha = 0.65f),
                    fontFamily = KataKecilFonts.Ui,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 2.sp
                )
                Column {
                    Text(
                        text = title,
                        color = Color.White,
                        fontFamily = KataKecilFonts.Ui,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 18.sp,
                        lineHeight = 23.sp,
                        maxLines = 4,
                        overflow = TextOverflow.Ellipsis
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        text = author,
                        color = Color.White.copy(alpha = 0.8f),
                        fontFamily = KataKecilFonts.Ui,
                        fontSize = 12.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }
        }
    }
}

/**
 * Interactive HSV Color Wheel + Brightness + Hex Input dialog (port of dist/app-popups.js).
 */
@Composable
fun ColorWheelPickerDialog(
    title: String,
    initialHex: String,
    onDismiss: () -> Unit,
    onColorSelected: (String) -> Unit
) {
    val palette = LocalKataKecilPalette.current
    val initialColor = KataKecilThemeTokens.parseHexColor(initialHex, palette.accent)
    val hsv = remember(initialHex) {
        val arr = FloatArray(3)
        android.graphics.Color.RGBToHSV(
            (initialColor.red * 255).toInt(),
            (initialColor.green * 255).toInt(),
            (initialColor.blue * 255).toInt(),
            arr
        )
        arr
    }
    var hue by remember { mutableFloatStateOf(hsv[0]) }
    var saturation by remember { mutableFloatStateOf(hsv[1]) }
    var value by remember { mutableFloatStateOf(hsv[2].coerceAtLeast(0.15f)) }
    var hexInput by remember { mutableStateOf(initialHex) }

    fun updateFromHsv(h: Float, s: Float, v: Float) {
        val argb = android.graphics.Color.HSVToColor(floatArrayOf(h, s, v))
        val c = Color(argb)
        hexInput = KataKecilThemeTokens.colorToHex(c)
    }

    Dialog(onDismissRequest = onDismiss) {
        GlassSurface(
            cornerRadius = 26.dp,
            elevated = true,
            contentPadding = PaddingValues(20.dp),
            modifier = Modifier.fillMaxWidth()
        ) {
            Column(
                horizontalAlignment = Alignment.CenterHorizontally,
                modifier = Modifier.fillMaxWidth()
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(
                        text = title,
                        color = palette.textPrimary,
                        fontFamily = KataKecilFonts.Ui,
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

                Spacer(modifier = Modifier.height(16.dp))

                // HSV Color Wheel Canvas
                Box(
                    modifier = Modifier.size(190.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Canvas(
                        modifier = Modifier
                            .fillMaxSize()
                            .pointerInput(Unit) {
                                detectTapGestures { pos ->
                                    val cx = size.width / 2f
                                    val cy = size.height / 2f
                                    val dx = pos.x - cx
                                    val dy = pos.y - cy
                                    val r = min(cx, cy)
                                    val dist = min(1f, hypot(dx, dy) / r)
                                    val deg = ((atan2(dy, dx) * 180f / PI.toFloat()) + 360f) % 360f
                                    hue = deg
                                    saturation = dist
                                    updateFromHsv(hue, saturation, value)
                                }
                            }
                            .pointerInput(Unit) {
                                detectDragGestures { change, _ ->
                                    change.consume()
                                    val cx = size.width / 2f
                                    val cy = size.height / 2f
                                    val dx = change.position.x - cx
                                    val dy = change.position.y - cy
                                    val r = min(cx, cy)
                                    val dist = min(1f, hypot(dx, dy) / r)
                                    val deg = ((atan2(dy, dx) * 180f / PI.toFloat()) + 360f) % 360f
                                    hue = deg
                                    saturation = dist
                                    updateFromHsv(hue, saturation, value)
                                }
                            }
                    ) {
                        val radius = size.minDimension / 2f
                        val center = Offset(size.width / 2f, size.height / 2f)
                        val sweepColors = listOf(
                            Color.Red, Color.Yellow, Color.Green,
                            Color.Cyan, Color.Blue, Color.Magenta, Color.Red
                        )
                        drawCircle(
                            brush = Brush.sweepGradient(sweepColors, center),
                            radius = radius,
                            center = center
                        )
                        drawCircle(
                            brush = Brush.radialGradient(
                                listOf(Color.White, Color.Transparent),
                                center = center,
                                radius = radius
                            ),
                            radius = radius,
                            center = center
                        )

                        val rad = (hue * PI / 180.0).toFloat()
                        val thumbX = center.x + cos(rad) * saturation * radius
                        val thumbY = center.y + sin(rad) * saturation * radius
                        val currentColor = KataKecilThemeTokens.parseHexColor(hexInput, palette.accent)
                        drawCircle(
                            color = currentColor,
                            radius = 11.dp.toPx(),
                            center = Offset(thumbX, thumbY)
                        )
                        drawCircle(
                            color = Color.White,
                            radius = 11.dp.toPx(),
                            center = Offset(thumbX, thumbY),
                            style = Stroke(width = 2.5.dp.toPx())
                        )
                    }
                }

                Spacer(modifier = Modifier.height(12.dp))

                // Value / Brightness slider
                Slider(
                    value = value,
                    onValueChange = {
                        value = it
                        updateFromHsv(hue, saturation, value)
                    },
                    valueRange = 0.08f..1f,
                    colors = SliderDefaults.colors(
                        thumbColor = palette.accent,
                        activeTrackColor = palette.accent
                    ),
                    modifier = Modifier.fillMaxWidth()
                )

                Spacer(modifier = Modifier.height(8.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    val previewColor = KataKecilThemeTokens.parseHexColor(hexInput, palette.accent)
                    Box(
                        modifier = Modifier
                            .size(44.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(previewColor)
                            .border(1.dp, palette.border, RoundedCornerShape(12.dp))
                    )
                    OutlinedTextField(
                        value = hexInput,
                        onValueChange = { next ->
                            hexInput = next
                        },
                        singleLine = true,
                        modifier = Modifier.weight(1f),
                        label = { Text("HEX (#RRGGBB)") }
                    )
                }

                Spacer(modifier = Modifier.height(16.dp))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.End
                ) {
                    GlassPillButton(
                        text = "Batal",
                        onClick = onDismiss
                    )
                    Spacer(modifier = Modifier.width(10.dp))
                    GlassPillButton(
                        text = "Simpan",
                        primary = true,
                        onClick = {
                            val normalized = if (hexInput.startsWith("#")) hexInput else "#$hexInput"
                            val validColor = KataKecilThemeTokens.parseHexColor(normalized, initialColor)
                            onColorSelected(KataKecilThemeTokens.colorToHex(validColor))
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun GlassToastOverlay(
    message: String?,
    modifier: Modifier = Modifier
) {
    val palette = LocalKataKecilPalette.current
    Box(
        modifier = modifier
            .fillMaxSize()
            .padding(bottom = 28.dp, start = 20.dp, end = 20.dp),
        contentAlignment = Alignment.BottomCenter
    ) {
        AnimatedVisibility(
            visible = !message.isNullOrBlank(),
            enter = fadeIn(tween(180)) + slideInVertically(tween(220, easing = FastOutSlowInEasing)) { it / 2 },
            exit = fadeOut(tween(180)) + slideOutVertically(tween(180)) { it / 2 }
        ) {
            GlassSurface(
                cornerRadius = 999.dp,
                elevated = true,
                contentPadding = PaddingValues(horizontal = 20.dp, vertical = 12.dp)
            ) {
                Text(
                    text = message ?: "",
                    color = palette.textPrimary,
                    fontFamily = KataKecilFonts.Ui,
                    fontWeight = FontWeight.Medium,
                    fontSize = 13.5.sp,
                    textAlign = TextAlign.Center
                )
            }
        }
    }
}
