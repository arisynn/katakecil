package id.karisyono.katakecil.ui.components

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.graphics.Bitmap
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.view.PixelCopy
import android.view.Window
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.*
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.BlurEffect
import androidx.compose.ui.graphics.TileMode
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInWindow
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.IntOffset
import androidx.compose.ui.unit.IntSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.window.DialogProperties
import androidx.compose.ui.window.DialogWindowProvider
import androidx.compose.ui.window.Dialog as AndroidDialog
import id.karisyono.katakecil.R
import id.karisyono.katakecil.core.theme.KataKecilFonts
import id.karisyono.katakecil.core.theme.LocalKataKecilPalette
import kotlin.math.roundToInt

/** The web's CSS-pixel geometry maps to dp, and its text sizes to accessible sp. */
object WebUi {
    val PageInset = 24.dp
    val PanelInset = 20.dp
    val PanelRadius = 24.dp
    val ControlRadius = 12.dp
}

private data class BackdropFrame(val bitmap: Bitmap, val windowWidth: Int, val windowHeight: Int)
private val LocalBackdrop = staticCompositionLocalOf<BackdropFrame?> { null }
private val LocalPanelHeight = staticCompositionLocalOf { Dp.Infinity }

private fun Context.activity(): Activity? = when (this) {
    is Activity -> this
    is ContextWrapper -> baseContext.activity()
    else -> null
}

@Composable
fun webPanelBodyHeight(): Dp = LocalPanelHeight.current * .5f

@Composable
fun webPanelHeight(header: Dp = 112.dp): Dp =
    minOf(LocalPanelHeight.current - 24.dp, webPanelBodyHeight() + header)

/** One window, one scrim, one RAM-only snapshot of our own underlying window. */
@Composable
fun WebDialog(
    onDismissRequest: () -> Unit,
    properties: DialogProperties = DialogProperties(),
    content: @Composable () -> Unit
) {
    val context = LocalContext.current
    val view = LocalView.current
    val palette = LocalKataKecilPalette.current
    val sourceWindow: Window? = (view.parent as? DialogWindowProvider)?.window ?: context.activity()?.window
    var frame by remember { mutableStateOf<BackdropFrame?>(null) }
    DisposableEffect(sourceWindow, palette.glassBlurDp > 0f) {
        var active = true
        if (Build.VERSION.SDK_INT >= 31 && palette.glassBlurDp > 0f && sourceWindow != null) {
            val width = sourceWindow.decorView.width
            val height = sourceWindow.decorView.height
            if (width > 0 && height > 0) {
                val scale = minOf(1f, 720f / width)
                val bitmap = Bitmap.createBitmap((width * scale).roundToInt().coerceAtLeast(1), (height * scale).roundToInt().coerceAtLeast(1), Bitmap.Config.ARGB_8888)
                runCatching {
                    PixelCopy.request(sourceWindow, bitmap, { result ->
                        if (active && result == PixelCopy.SUCCESS) frame = BackdropFrame(bitmap, width, height)
                        else bitmap.recycle()
                    }, Handler(Looper.getMainLooper()))
                }.onFailure { bitmap.recycle() }
            }
        }
        onDispose { active = false; frame = null }
    }
    AndroidDialog(
        onDismissRequest = onDismissRequest,
        properties = DialogProperties(
            dismissOnBackPress = properties.dismissOnBackPress,
            dismissOnClickOutside = properties.dismissOnClickOutside,
            securePolicy = properties.securePolicy,
            usePlatformDefaultWidth = false,
            decorFitsSystemWindows = false
        )
    ) {
        val dialogView = LocalView.current
        SideEffect {
            (dialogView.parent as? DialogWindowProvider)?.window?.let {
                it.setDimAmount(0f)
                it.setWindowAnimations(R.style.WebPanelAnimation)
                it.setSoftInputMode(android.view.WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE)
            }
        }
        BoxWithConstraints(
            Modifier.fillMaxSize().background(androidx.compose.ui.graphics.Color.Black.copy(alpha = .28f))
                .imePadding().navigationBarsPadding()
                .clickable(remember { MutableInteractionSource() }, indication = null) { onDismissRequest() },
            contentAlignment = Alignment.BottomCenter
        ) {
            CompositionLocalProvider(LocalPanelHeight provides maxHeight, LocalBackdrop provides frame) { content() }
        }
    }
}

/** Blur the sampled backdrop only; foreground labels and icons are drawn afterwards. */
@Composable
fun GlassBackdrop(modifier: Modifier = Modifier) {
    val frame = LocalBackdrop.current ?: return
    val palette = LocalKataKecilPalette.current
    if (Build.VERSION.SDK_INT < 31 || palette.glassBlurDp <= 0f) return
    val density = LocalDensity.current
    val radius = with(density) { palette.glassBlurDp.dp.toPx() }
    var origin by remember { mutableStateOf(Offset.Zero) }
    val image = remember(frame) { frame.bitmap.asImageBitmap() }
    Canvas(modifier.onGloballyPositioned { origin = it.positionInWindow() }.graphicsLayer {
        renderEffect = BlurEffect(radius, radius, TileMode.Clamp)
    }) {
        val sx = image.width.toFloat() / frame.windowWidth
        val sy = image.height.toFloat() / frame.windowHeight
        val x = (origin.x * sx).roundToInt().coerceIn(0, image.width - 1)
        val y = (origin.y * sy).roundToInt().coerceIn(0, image.height - 1)
        drawImage(image,
            srcOffset = IntOffset(x, y),
            srcSize = IntSize((size.width * sx).roundToInt().coerceIn(1, image.width - x), (size.height * sy).roundToInt().coerceIn(1, image.height - y)),
            dstSize = IntSize(size.width.roundToInt(), size.height.roundToInt()))
    }
}

@Composable
fun WebPageHeading(title: String, backLabel: String? = null, onBack: (() -> Unit)? = null, actions: @Composable RowScope.() -> Unit = {}) {
    val palette = LocalKataKecilPalette.current
    Column(Modifier.fillMaxWidth()) {
        Spacer(Modifier.height(35.dp))
        Row(Modifier.fillMaxWidth().heightIn(min = 52.dp), verticalAlignment = Alignment.CenterVertically) {
            Text(title, Modifier.weight(1f), color = palette.textPrimary, fontFamily = KataKecilFonts.Ui,
                fontSize = 27.sp, fontWeight = FontWeight(650), letterSpacing = (-1.3).sp)
            if (backLabel != null && onBack != null) {
                Row(Modifier.clickable(onClick = onBack).padding(horizontal = 8.dp, vertical = 12.dp), verticalAlignment = Alignment.CenterVertically) {
                    KataKecilIcon("left", tint = palette.accent, size = 18.dp)
                    Spacer(Modifier.width(5.dp))
                    Text(backLabel, color = palette.accent, fontFamily = KataKecilFonts.Ui, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                }
            }
            actions()
        }
        Spacer(Modifier.height(24.dp))
    }
}

@Composable
fun WebBottomSheet(
    title: String,
    onDismiss: () -> Unit,
    closeLabel: String = "Close",
    headerContent: @Composable ColumnScope.() -> Unit = {},
    footer: @Composable ColumnScope.() -> Unit = {},
    content: @Composable ColumnScope.() -> Unit
) {
    val palette = LocalKataKecilPalette.current
    WebDialog(onDismissRequest = onDismiss) {
        GlassSurface(cornerRadius = WebUi.PanelRadius, elevated = true,
            contentPadding = PaddingValues(WebUi.PanelInset),
            modifier = Modifier.widthIn(max = 640.dp).fillMaxWidth().heightIn(max = webPanelHeight(160.dp))) {
            Column(Modifier.fillMaxWidth()) {
                Row(Modifier.fillMaxWidth().heightIn(min = 44.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text(title, Modifier.weight(1f), color = palette.textPrimary, fontFamily = KataKecilFonts.Ui, fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
                    GlassIconButton("close", closeLabel, onDismiss)
                }
                headerContent()
                Column(Modifier.fillMaxWidth().heightIn(max = webPanelBodyHeight()).verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(14.dp), content = content)
                footer()
            }
        }
    }
}
