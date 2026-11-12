package id.karisyono.katakecil

import android.content.Intent
import android.content.pm.ActivityInfo
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.OpenableColumns
import android.view.WindowManager
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.appcompat.app.AppCompatDelegate
import androidx.core.splashscreen.SplashScreen.Companion.installSplashScreen
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.lifecycle.lifecycleScope
import id.karisyono.katakecil.core.model.DeviceSettings
import id.karisyono.katakecil.data.epub.EpubParser
import id.karisyono.katakecil.data.storage.KataKecilStore
import id.karisyono.katakecil.ui.KataKecilApp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.ByteArrayOutputStream

/**
 * Pure Native Kotlin + Jetpack Compose MainActivity for KataKecil.
 * Replaces Capacitor BridgeActivity and all WebView dependencies while preserving
 * splash appearance, incoming EPUB intents, orientation lock, wake lock, and system bars.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var store: KataKecilStore
    private val _incomingEpub = MutableStateFlow<Pair<String, ByteArray>?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        applySavedNightMode()
        installSplashScreen()
        super.onCreate(savedInstanceState)

        WindowCompat.setDecorFitsSystemWindows(window, false)
        store = KataKecilStore(applicationContext)

        handleIncomingIntent(intent)

        setContent {
            KataKecilApp(
                store = store,
                incomingEpubFlow = _incomingEpub.asStateFlow(),
                onConsumeIncomingEpub = { _incomingEpub.value = null },
                onApplyWindowState = ::applyWindowAndDisplayState
            )
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        handleIncomingIntent(intent)
    }

    private fun applySavedNightMode() {
        val prefs = getSharedPreferences(KataKecilStore.APPEARANCE_PREFS, MODE_PRIVATE)
        val mode = prefs.getString("theme_mode", "light") ?: "light"
        val nightMode = when (mode) {
            "dark" -> AppCompatDelegate.MODE_NIGHT_YES
            "system", "auto-sensor" -> AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM
            else -> AppCompatDelegate.MODE_NIGHT_NO
        }
        AppCompatDelegate.setDefaultNightMode(nightMode)
    }

    private fun applyWindowAndDisplayState(
        settings: DeviceSettings,
        isReadingScreen: Boolean,
        isDistractionFree: Boolean
    ) {
        // 1. Keep Screen Awake (wakeLock) while reading
        if (isReadingScreen && settings.wakeLock) {
            window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        } else {
            window.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }

        // 2. Screen Orientation
        val targetOrientation = if (isReadingScreen) {
            when (settings.orientation) {
                "portrait" -> ActivityInfo.SCREEN_ORIENTATION_USER_PORTRAIT
                "landscape" -> ActivityInfo.SCREEN_ORIENTATION_USER_LANDSCAPE
                else -> ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            }
        } else {
            ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
        if (requestedOrientation != targetOrientation) {
            requestedOrientation = targetOrientation
        }

        // 3. System Bars & Fullscreen Reading Mode
        val controller = WindowCompat.getInsetsController(window, window.decorView)
        val isDarkTheme = settings.themeMode == "dark" ||
            (isReadingScreen && settings.readerTheme == "dark")
        controller.isAppearanceLightStatusBars = !isDarkTheme
        controller.isAppearanceLightNavigationBars = !isDarkTheme

        if (isDistractionFree) {
            controller.systemBarsBehavior =
                WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            controller.hide(WindowInsetsCompat.Type.systemBars())
        } else {
            controller.show(WindowInsetsCompat.Type.systemBars())
        }
    }

    @Suppress("DEPRECATION")
    private fun handleIncomingIntent(incoming: Intent?) {
        if (incoming == null) return
        val action = incoming.action ?: return
        val uri: Uri? = when (action) {
            Intent.ACTION_VIEW -> incoming.data
            Intent.ACTION_SEND -> {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    incoming.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
                } else {
                    incoming.getParcelableExtra(Intent.EXTRA_STREAM)
                } ?: incoming.clipData?.getItemAt(0)?.uri
            }
            else -> null
        } ?: return

        lifecycleScope.launch(Dispatchers.IO) {
            runCatching {
                val displayName = resolveDisplayName(uri) ?: "imported.epub"
                val out = ByteArrayOutputStream()
                contentResolver.openInputStream(uri)?.use { input ->
                    val buf = ByteArray(16 * 1024)
                    var total = 0
                    while (true) {
                        val read = input.read(buf)
                        if (read <= 0) break
                        total += read
                        if (total > EpubParser.MAX_EPUB_BYTES) {
                            throw IllegalArgumentException("Ukuran EPUB melebihi batas maksimal 30 MB.")
                        }
                        out.write(buf, 0, read)
                    }
                }
                val bytes = out.toByteArray()
                // Validate ZIP magic header PK\x03\x04
                if (bytes.size >= 4 &&
                    bytes[0] == 0x50.toByte() &&
                    bytes[1] == 0x4B.toByte() &&
                    bytes[2] == 0x03.toByte() &&
                    bytes[3] == 0x04.toByte()
                ) {
                    _incomingEpub.value = displayName to bytes
                }
            }
        }
    }

    private fun resolveDisplayName(uri: Uri): String? {
        return runCatching {
            contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
                val idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                if (idx >= 0 && c.moveToFirst()) c.getString(idx) else null
            } ?: uri.lastPathSegment
        }.getOrNull()
    }
}
