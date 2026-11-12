package id.karisyono.katakecil.ui

import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.net.Uri
import android.provider.OpenableColumns
import android.util.Base64
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import id.karisyono.katakecil.core.i18n.I18n
import id.karisyono.katakecil.core.model.AnnotationItem
import id.karisyono.katakecil.core.model.BackupPreview
import id.karisyono.katakecil.core.model.BookMeta
import id.karisyono.katakecil.core.model.Chapter
import id.karisyono.katakecil.core.model.DeviceSettings
import id.karisyono.katakecil.core.model.ImportEpubPreview
import id.karisyono.katakecil.core.model.ReadingProgress
import id.karisyono.katakecil.core.model.SearchMatch
import id.karisyono.katakecil.core.model.TtsCheckpoint
import id.karisyono.katakecil.core.theme.KataKecilTheme
import id.karisyono.katakecil.data.epub.EpubParser
import id.karisyono.katakecil.data.remote.PublishedReaderClient
import id.karisyono.katakecil.data.remote.PublisherClient
import id.karisyono.katakecil.data.storage.BackupManager
import id.karisyono.katakecil.data.storage.KataKecilStore
import id.karisyono.katakecil.domain.reader.EpisodeSearchEngine
import id.karisyono.katakecil.domain.reader.ReadAloudController
import id.karisyono.katakecil.domain.reader.TextAnchorEngine
import id.karisyono.katakecil.ui.components.GlassToastOverlay
import id.karisyono.katakecil.ui.library.LibraryScreen
import id.karisyono.katakecil.ui.publisher.PublisherScreen
import id.karisyono.katakecil.ui.reader.EpisodeSearchDialog
import id.karisyono.katakecil.ui.reader.ReadAloudSheetDialog
import id.karisyono.katakecil.ui.reader.ReaderScreen
import id.karisyono.katakecil.ui.reader.ReadingAppearanceSheetDialog
import id.karisyono.katakecil.ui.reader.ReadingToolsSheetDialog
import id.karisyono.katakecil.ui.reader.SpeedReadingDialog
import id.karisyono.katakecil.ui.reader.ThisBookSheetDialog
import id.karisyono.katakecil.ui.reader.WordToolsDialog
import id.karisyono.katakecil.ui.settings.ImportEpubPreviewDialog
import id.karisyono.katakecil.ui.settings.RestoreBackupPreviewDialog
import id.karisyono.katakecil.ui.settings.SettingsScreen
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.io.ByteArrayOutputStream
import java.time.Instant
import java.util.UUID
import kotlin.math.min
import kotlin.math.roundToInt

enum class AppScreen {
    LIBRARY,
    READER,
    SETTINGS,
    PUBLISHER
}

@Composable
fun KataKecilApp(
    store: KataKecilStore,
    incomingEpubFlow: StateFlow<Pair<String, ByteArray>?>,
    onConsumeIncomingEpub: () -> Unit,
    onApplyWindowState: (settings: DeviceSettings, isReadingScreen: Boolean, isDistractionFree: Boolean) -> Unit
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()

    val settings by store.settings.collectAsState()
    val progressMap by store.progressMap.collectAsState()
    val allAnnotations by store.annotations.collectAsState()
    val localBooks by store.localBooks.collectAsState()
    val incomingEpub by incomingEpubFlow.collectAsState()

    val publishedClient = remember { PublishedReaderClient() }
    val publisherClient = remember { PublisherClient() }

    var currentScreen by remember { mutableStateOf(AppScreen.LIBRARY) }
    var publishedBooks by remember { mutableStateOf(store.loadPublishedCatalogCache()) }
    var isLoadingCatalog by remember { mutableStateOf(false) }
    var catalogError by remember { mutableStateOf<String?>(null) }
    var selectedBookIndex by remember { mutableIntStateOf(0) }

    // Active Reader State
    var activeBook by remember { mutableStateOf<BookMeta?>(null) }
    var activeChapters by remember { mutableStateOf<List<Chapter>>(emptyList()) }
    var currentChapterIndex by remember { mutableIntStateOf(0) }
    var currentCharOffset by remember { mutableIntStateOf(0) }
    var currentPageIndex by remember { mutableIntStateOf(0) }
    var currentTotalPages by remember { mutableIntStateOf(1) }
    var isLoadingEpisode by remember { mutableStateOf(false) }
    var hudControlsVisible by remember { mutableStateOf(false) }

    // Reader Dialogs / Sheets State
    var showThisBookSheet by remember { mutableStateOf(false) }
    var showAppearanceSheet by remember { mutableStateOf(false) }
    var showReadingToolsSheet by remember { mutableStateOf(false) }
    var showSearchDialog by remember { mutableStateOf(false) }
    var showSpeedReaderDialog by remember { mutableStateOf(false) }
    var showReadAloudSheet by remember { mutableStateOf(false) }
    var wordToolsSelection by remember { mutableStateOf<String?>(null) }

    // In-episode Search State
    var searchQuery by remember { mutableStateOf("") }
    var searchMatches by remember { mutableStateOf<List<SearchMatch>>(emptyList()) }
    var activeSearchMatchIndex by remember { mutableIntStateOf(0) }

    // Import & Backup Preview Dialogs
    var importPreview by remember { mutableStateOf<ImportEpubPreview?>(null) }
    var restorePreview by remember { mutableStateOf<BackupPreview?>(null) }
    var coverTargetBook by remember { mutableStateOf<BookMeta?>(null) }
    var pendingSaveBytes by remember { mutableStateOf<ByteArray?>(null) }

    // Toast notification
    var toastMessage by remember { mutableStateOf<String?>(null) }
    fun showToast(msg: String) {
        scope.launch {
            toastMessage = msg
            delay(2800)
            if (toastMessage == msg) {
                toastMessage = null
            }
        }
    }

    // Combined Library List (Published + Local Personal EPUBs)
    val allBooks = remember(publishedBooks, localBooks) {
        publishedBooks + localBooks
    }

    // Read Aloud TTS Controller
    var switchEpisodeInternal: (Int, Int, Boolean) -> Unit by remember {
        mutableStateOf({ _, _, _ -> })
    }

    val readAloudController = remember {
        ReadAloudController(
            context = context,
            onParagraphChanged = { chIdx, charOff ->
                currentChapterIndex = chIdx
                currentCharOffset = charOff
                val book = activeBook
                if (book != null) {
                    val existing = store.getProgress(book.id) ?: ReadingProgress(bookId = book.id)
                    store.saveProgress(
                        existing.copy(
                            chapterIndex = chIdx,
                            charOffset = charOff,
                            tts = TtsCheckpoint(chIdx, charOff)
                        )
                    )
                }
            },
            onEpisodeCompleted = { finishedCh ->
                if (finishedCh + 1 < activeChapters.size) {
                    switchEpisodeInternal(finishedCh + 1, 0, true)
                }
            }
        )
    }
    val ttsState by readAloudController.state.collectAsState()

    DisposableEffect(Unit) {
        onDispose {
            readAloudController.shutdown()
        }
    }

    // Apply orientation, wakeLock, and fullscreen system bars to Activity window
    LaunchedEffect(settings.orientation, settings.wakeLock, currentScreen, hudControlsVisible) {
        onApplyWindowState(
            settings,
            currentScreen == AppScreen.READER,
            currentScreen == AppScreen.READER && !hudControlsVisible
        )
    }

    // Refresh published catalog
    fun refreshCatalog() {
        scope.launch {
            isLoadingCatalog = true
            catalogError = null
            runCatching {
                publishedClient.fetchCatalog()
            }.onSuccess { fetched ->
                publishedBooks = fetched
                store.savePublishedCatalogCache(fetched)
            }.onFailure { err ->
                catalogError = err.message ?: "Tidak dapat terhubung ke katalog."
            }
            isLoadingCatalog = false
        }
    }

    LaunchedEffect(Unit) {
        refreshCatalog()
    }

    // Load or switch episode inside Reader
    switchEpisodeInternal = { targetChapterIdx, targetCharOffset, autoResumeTts ->
        val book = activeBook
        if (book != null && targetChapterIdx in activeChapters.indices) {
            scope.launch {
                isLoadingEpisode = true
                searchQuery = ""
                searchMatches = emptyList()
                runCatching {
                    val updatedChapters = if (book.source == "local") {
                        activeChapters
                    } else {
                        publishedClient.loadEpisode(book, targetChapterIdx)
                    }
                    activeChapters = updatedChapters
                    val ch = updatedChapters[targetChapterIdx]

                    // Relocate annotations for this chapter using TextAnchorEngine
                    val bookAnns = store.getAnnotationsForBook(book.id)
                    val relocated = bookAnns.map { item ->
                        if (item.chapterIndex == targetChapterIdx) {
                            TextAnchorEngine.relocateAnnotation(item, ch)
                        } else item
                    }
                    if (relocated != bookAnns) {
                        store.updateBookAnnotations(book.id, relocated)
                    }

                    currentChapterIndex = targetChapterIdx
                    val resolvedOffset = if (targetCharOffset == Int.MAX_VALUE) {
                        (ch.text.length - 1).coerceAtLeast(0)
                    } else {
                        targetCharOffset.coerceIn(0, ch.text.length)
                    }
                    currentCharOffset = resolvedOffset

                    if (autoResumeTts && ch.text.isNotBlank()) {
                        readAloudController.startReading(
                            chapterIndex = targetChapterIdx,
                            chapterText = ch.text,
                            startCharOffset = 0,
                            rate = settings.ttsRate,
                            voiceId = settings.ttsVoice,
                            languageTag = settings.ttsLanguage
                        )
                    }
                }.onFailure { err ->
                    showToast(err.message ?: "Gagal memuat episode.")
                }
                isLoadingEpisode = false
            }
        }
    }

    fun openBook(book: BookMeta) {
        scope.launch {
            activeBook = book
            currentScreen = AppScreen.READER
            hudControlsVisible = false
            isLoadingEpisode = true
            searchQuery = ""
            searchMatches = emptyList()
            readAloudController.stop()

            runCatching {
                val chapters = if (book.source == "local") {
                    store.loadLocalBookRecord(book.id)?.chapters
                        ?: throw IllegalStateException("Data EPUB lokal tidak ditemukan.")
                } else {
                    publishedClient.openBookManifest(book)
                }
                activeChapters = chapters
                val savedProgress = store.getProgress(book.id)
                val startCh = (savedProgress?.chapterIndex ?: 0).coerceIn(0, (chapters.size - 1).coerceAtLeast(0))
                val loadedChapters = if (book.source == "local") {
                    chapters
                } else {
                    publishedClient.loadEpisode(book, startCh)
                }
                activeChapters = loadedChapters
                val activeCh = loadedChapters[startCh]
                val relocatedProgress = savedProgress?.let {
                    if (it.chapterIndex == startCh) {
                        TextAnchorEngine.relocateReadingProgress(it, activeCh)
                    } else it
                }
                currentChapterIndex = startCh
                currentCharOffset = (relocatedProgress?.charOffset ?: 0).coerceIn(0, activeCh.text.length)
            }.onFailure { err ->
                showToast(err.message ?: "Gagal membuka buku.")
                currentScreen = AppScreen.LIBRARY
            }
            isLoadingEpisode = false
        }
    }

    // Lifecycle observer: pause TTS on background, validate publication revision on resume
    DisposableEffect(lifecycleOwner, activeBook, currentScreen) {
        val observer = LifecycleEventObserver { _, event ->
            when (event) {
                Lifecycle.Event.ON_PAUSE, Lifecycle.Event.ON_STOP -> {
                    if (ttsState.isPlaying) {
                        readAloudController.pause()
                    }
                }
                Lifecycle.Event.ON_RESUME -> {
                    val book = activeBook
                    if (currentScreen == AppScreen.READER && book != null && book.source == "published") {
                        scope.launch {
                            val latest = publishedClient.validatePublication(book.id, book.revision)
                            if (latest != null && latest.revision.isNotBlank() && latest.revision != book.revision) {
                                showToast(
                                    I18n.t(
                                        "Edisi buku telah diperbarui oleh penulis. Memuat ulang…",
                                        "Book edition was updated by the author. Reloading…",
                                        settings.uiLanguage
                                    )
                                )
                                openBook(latest)
                            }
                        }
                    }
                }
                else -> {}
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose {
            lifecycleOwner.lifecycle.removeObserver(observer)
        }
    }

    // Handle incoming EPUB file from Android Intent (ACTION_VIEW / ACTION_SEND)
    LaunchedEffect(incomingEpub) {
        val pair = incomingEpub ?: return@LaunchedEffect
        onConsumeIncomingEpub()
        val (fileName, bytes) = pair
        scope.launch {
            runCatching {
                withContext(Dispatchers.Default) {
                    val record = EpubParser.parseLocalEpub(bytes, fileName)
                    val exists = localBooks.any { it.id == record.meta.id }
                    ImportEpubPreview(
                        fileName = fileName,
                        sizeBytes = bytes.size.toLong(),
                        rawBytes = bytes,
                        record = record,
                        alreadyExists = exists
                    )
                }
            }.onSuccess { preview ->
                importPreview = preview
            }.onFailure { err ->
                showToast(err.message ?: "File EPUB tidak valid.")
            }
        }
    }

    // Android Storage Access Framework Launchers
    val saveDocumentLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.CreateDocument("*/*")
    ) { uri: Uri? ->
        val bytes = pendingSaveBytes
        pendingSaveBytes = null
        if (uri != null && bytes != null) {
            scope.launch(Dispatchers.IO) {
                runCatching {
                    context.contentResolver.openOutputStream(uri)?.use { it.write(bytes) }
                }.onSuccess {
                    showToast(I18n.t("File berhasil disimpan.", "File saved successfully.", settings.uiLanguage))
                }.onFailure {
                    showToast(it.message ?: "Gagal menyimpan file.")
                }
            }
        }
    }

    val openEpubLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    val name = queryDisplayName(context, uri) ?: "book.epub"
                    val bytes = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                        ?: throw IllegalArgumentException("Tidak dapat membaca file EPUB.")
                    val record = EpubParser.parseLocalEpub(bytes, name)
                    val exists = localBooks.any { it.id == record.meta.id }
                    ImportEpubPreview(
                        fileName = name,
                        sizeBytes = bytes.size.toLong(),
                        rawBytes = bytes,
                        record = record,
                        alreadyExists = exists
                    )
                }
            }.onSuccess { preview ->
                importPreview = preview
            }.onFailure { err ->
                showToast(err.message ?: "Gagal membaca file EPUB.")
            }
        }
    }

    val openBackupLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            runCatching {
                withContext(Dispatchers.IO) {
                    val raw = context.contentResolver.openInputStream(uri)
                        ?.bufferedReader(Charsets.UTF_8)
                        ?.use { it.readText() }
                        ?: throw IllegalArgumentException("File cadangan kosong.")
                    BackupManager.previewBackup(raw)
                }
            }.onSuccess { preview ->
                restorePreview = preview
            }.onFailure { err ->
                showToast(err.message ?: "File cadangan KataKecil tidak valid.")
            }
        }
    }

    val replaceCoverLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        val targetBook = coverTargetBook
        coverTargetBook = null
        if (uri == null || targetBook == null) return@rememberLauncherForActivityResult
        scope.launch {
            runCatching {
                val dataUrl = withContext(Dispatchers.IO) {
                    val raw = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                        ?: throw IllegalArgumentException("Tidak dapat membaca gambar sampul.")
                    if (raw.size > 5 * 1024 * 1024) {
                        throw IllegalArgumentException("Ukuran gambar sampul melebihi batas 5 MB.")
                    }
                    fitCoverBitmapToDataUrl(raw)
                }
                store.updateLocalBookCover(targetBook.id, dataUrl)
            }.onSuccess {
                showToast(I18n.t("Sampul buku diperbarui.", "Book cover updated.", settings.uiLanguage))
            }.onFailure { err ->
                showToast(err.message ?: "Gagal memperbarui sampul.")
            }
        }
    }

    // Back navigation handler matching src/platform/navigation.ts
    BackHandler(enabled = currentScreen != AppScreen.LIBRARY || hudControlsVisible) {
        when {
            currentScreen == AppScreen.READER && hudControlsVisible -> {
                hudControlsVisible = false
            }
            currentScreen == AppScreen.READER -> {
                readAloudController.stop()
                currentScreen = AppScreen.LIBRARY
            }
            currentScreen == AppScreen.PUBLISHER -> {
                currentScreen = AppScreen.SETTINGS
            }
            currentScreen == AppScreen.SETTINGS -> {
                currentScreen = AppScreen.LIBRARY
            }
        }
    }

    KataKecilTheme(settings = settings) {
        Box(modifier = Modifier.fillMaxSize()) {
            when (currentScreen) {
                AppScreen.LIBRARY -> {
                    LibraryScreen(
                        books = allBooks,
                        progressMap = progressMap,
                        settings = settings,
                        isLoading = isLoadingCatalog,
                        errorMessage = catalogError,
                        selectedIndex = selectedBookIndex,
                        onSelectIndex = { selectedBookIndex = it },
                        onOpenBook = ::openBook,
                        onImportEpubClick = {
                            openEpubLauncher.launch(
                                arrayOf("application/epub+zip", "application/octet-stream", "*/*")
                            )
                        },
                        onOpenSettingsClick = { currentScreen = AppScreen.SETTINGS },
                        onRefreshCatalog = ::refreshCatalog
                    )
                }

                AppScreen.READER -> {
                    val book = activeBook
                    if (book != null) {
                        val bookAnnotations = remember(allAnnotations, book.id) {
                            allAnnotations.filter { it.bookId == book.id }
                        }
                        ReaderScreen(
                            book = book,
                            chapters = activeChapters,
                            currentChapterIndex = currentChapterIndex,
                            currentCharOffset = currentCharOffset,
                            annotations = bookAnnotations,
                            settings = settings,
                            isLoadingEpisode = isLoadingEpisode,
                            hudControlsVisible = hudControlsVisible,
                            searchQuery = searchQuery,
                            searchMatches = searchMatches,
                            activeSearchMatchIndex = activeSearchMatchIndex,
                            ttsState = ttsState,
                            onToggleHudControls = { hudControlsVisible = it },
                            onPositionChanged = { chIdx, charOff, pageIdx, totalPgs ->
                                currentChapterIndex = chIdx
                                currentCharOffset = charOff
                                currentPageIndex = pageIdx
                                currentTotalPages = totalPgs

                                val ch = activeChapters.getOrNull(chIdx)
                                val totalChs = activeChapters.size.coerceAtLeast(1)
                                val chProgress = if (totalPgs > 1) {
                                    pageIdx.toDouble() / (totalPgs - 1).toDouble()
                                } else 1.0
                                val overallPct = (((chIdx.toDouble() + chProgress) / totalChs.toDouble()) * 100.0)
                                    .coerceIn(1.0, 100.0)
                                val anchor = if (ch != null && ch.text.isNotEmpty()) {
                                    val end = min(ch.text.length, charOff + 48)
                                    if (end > charOff) {
                                        TextAnchorEngine.makeAnchor(ch.id, ch.text, charOff, end, ch.contentHash)
                                    } else null
                                } else null

                                store.saveProgress(
                                    ReadingProgress(
                                        bookId = book.id,
                                        chapterIndex = chIdx,
                                        charOffset = charOff,
                                        pageIndex = pageIdx,
                                        totalPages = totalPgs,
                                        totalChapters = totalChs,
                                        percentage = overallPct,
                                        anchor = anchor,
                                        updatedAt = Instant.now().toString()
                                    )
                                )
                            },
                            onSwitchEpisode = { chIdx, charOff ->
                                switchEpisodeInternal(chIdx, charOff, false)
                            },
                            onBackToLibrary = {
                                readAloudController.stop()
                                currentScreen = AppScreen.LIBRARY
                            },
                            onCreateHighlight = { startOff, endOff, selectedTxt, colorName, noteTxt ->
                                val ch = activeChapters.getOrNull(currentChapterIndex)
                                val anchor = if (ch != null) {
                                    TextAnchorEngine.makeAnchor(
                                        episodeId = ch.id,
                                        text = ch.text,
                                        start = startOff,
                                        end = endOff,
                                        sourceHash = ch.contentHash
                                    )
                                } else null
                                val item = AnnotationItem(
                                    id = "hl_${UUID.randomUUID()}",
                                    bookId = book.id,
                                    type = "highlight",
                                    chapterIndex = currentChapterIndex,
                                    pageIndex = currentPageIndex,
                                    charOffset = startOff,
                                    startOffset = startOff,
                                    endOffset = endOff,
                                    selectedText = selectedTxt,
                                    noteText = noteTxt,
                                    color = colorName,
                                    anchor = anchor
                                )
                                store.saveAnnotation(item)
                                showToast(
                                    if (!noteTxt.isNullOrBlank()) {
                                        I18n.t("Catatan disimpan.", "Note saved.", settings.uiLanguage)
                                    } else {
                                        I18n.t("Sorotan disimpan.", "Highlight saved.", settings.uiLanguage)
                                    }
                                )
                            },
                            onDeleteAnnotation = { id ->
                                store.deleteAnnotation(id)
                                showToast(I18n.t("Catatan dihapus.", "Annotation deleted.", settings.uiLanguage))
                            },
                            onTogglePageBookmark = { chIdx, pageIdx, charOff, snippet ->
                                val existingBm = bookAnnotations.firstOrNull {
                                    it.type == "bookmark" &&
                                        it.chapterIndex == chIdx &&
                                        it.pageIndex == pageIdx
                                }
                                if (existingBm != null) {
                                    store.deleteAnnotation(existingBm.id)
                                    showToast(I18n.t("Markah dihapus.", "Bookmark removed.", settings.uiLanguage))
                                } else {
                                    val ch = activeChapters.getOrNull(chIdx)
                                    val anchor = if (ch != null && ch.text.isNotEmpty()) {
                                        val end = min(ch.text.length, charOff + 48)
                                        TextAnchorEngine.makeAnchor(ch.id, ch.text, charOff, end, ch.contentHash)
                                    } else null
                                    val bm = AnnotationItem(
                                        id = "bm_${UUID.randomUUID()}",
                                        bookId = book.id,
                                        type = "bookmark",
                                        chapterIndex = chIdx,
                                        pageIndex = pageIdx,
                                        charOffset = charOff,
                                        label = snippet.ifBlank { "Halaman ${pageIdx + 1}" }.take(120),
                                        color = "amber",
                                        anchor = anchor
                                    )
                                    store.saveAnnotation(bm)
                                    showToast(I18n.t("Markah disimpan.", "Bookmark saved.", settings.uiLanguage))
                                }
                            },
                            onOpenThisBookSheet = { showThisBookSheet = true },
                            onOpenAppearanceSheet = { showAppearanceSheet = true },
                            onOpenReadingToolsSheet = { showReadingToolsSheet = true },
                            onOpenSearchDialog = { showSearchDialog = true },
                            onOpenWordTools = { text -> wordToolsSelection = text },
                            onStepSearchMatch = { delta ->
                                if (searchMatches.isNotEmpty()) {
                                    val nextIdx = ((activeSearchMatchIndex + delta) % searchMatches.size + searchMatches.size) % searchMatches.size
                                    activeSearchMatchIndex = nextIdx
                                    currentCharOffset = searchMatches[nextIdx].start
                                }
                            },
                            onClearSearch = {
                                searchQuery = ""
                                searchMatches = emptyList()
                            },
                            onTtsPlayPause = {
                                if (ttsState.isPlaying) {
                                    readAloudController.pause()
                                } else if (ttsState.isPaused) {
                                    readAloudController.resume()
                                } else {
                                    val ch = activeChapters.getOrNull(currentChapterIndex)
                                    if (ch != null) {
                                        readAloudController.startReading(
                                            chapterIndex = currentChapterIndex,
                                            chapterText = ch.text,
                                            startCharOffset = currentCharOffset,
                                            rate = settings.ttsRate,
                                            voiceId = settings.ttsVoice,
                                            languageTag = settings.ttsLanguage
                                        )
                                    }
                                }
                            },
                            onTtsPrev = { readAloudController.previousParagraph() },
                            onTtsNext = { readAloudController.nextParagraph() },
                            onTtsStop = { readAloudController.stop() }
                        )
                    }
                }

                AppScreen.SETTINGS -> {
                    SettingsScreen(
                        settings = settings,
                        localBooks = localBooks,
                        progressMap = progressMap,
                        annotations = allAnnotations,
                        storageBytesUsed = store.getStorageSummaryBytes(),
                        onUpdateSettings = { store.updateSettings(it) },
                        onBack = { currentScreen = AppScreen.LIBRARY },
                        onSaveBackupClick = {
                            val json = BackupManager.createBackupJson(
                                settings = settings,
                                progress = progressMap.values,
                                annotations = allAnnotations
                            )
                            pendingSaveBytes = json.toByteArray(Charsets.UTF_8)
                            saveDocumentLauncher.launch("katakecil-backup.json")
                        },
                        onRestoreBackupClick = {
                            openBackupLauncher.launch(arrayOf("application/json", "text/plain", "*/*"))
                        },
                        onExportNotesClick = {
                            val json = BackupManager.createNotesExportJson(allAnnotations)
                            pendingSaveBytes = json.toByteArray(Charsets.UTF_8)
                            saveDocumentLauncher.launch("katakecil-catatan.json")
                        },
                        onImportEpubClick = {
                            openEpubLauncher.launch(
                                arrayOf("application/epub+zip", "application/octet-stream", "*/*")
                            )
                        },
                        onOpenLocalBook = ::openBook,
                        onReplaceLocalBookCover = { book ->
                            coverTargetBook = book
                            replaceCoverLauncher.launch(arrayOf("image/*"))
                        },
                        onResetLocalBookCover = { book ->
                            store.updateLocalBookCover(book.id, "")
                            showToast(I18n.t("Sampul asli dikembalikan.", "Original cover restored.", settings.uiLanguage))
                        },
                        onDeleteLocalBook = { book ->
                            store.deleteLocalBook(book.id)
                            showToast(I18n.t("EPUB dihapus dari perangkat.", "EPUB removed from device.", settings.uiLanguage))
                        },
                        onOpenPublisherStudio = {
                            currentScreen = AppScreen.PUBLISHER
                        },
                        onShowToast = ::showToast
                    )
                }

                AppScreen.PUBLISHER -> {
                    PublisherScreen(
                        publisherClient = publisherClient,
                        lang = settings.uiLanguage,
                        onBack = { currentScreen = AppScreen.SETTINGS },
                        onExportPublisherEpub = { fileName, bytes ->
                            pendingSaveBytes = bytes
                            saveDocumentLauncher.launch(fileName)
                        },
                        onPublishCompleted = ::refreshCatalog,
                        onShowToast = ::showToast
                    )
                }
            }

            // Reader Active Sheets & Dialogs
            val book = activeBook
            if (currentScreen == AppScreen.READER && book != null) {
                val bookAnnotations = allAnnotations.filter { it.bookId == book.id }
                val activeChapter = activeChapters.getOrNull(currentChapterIndex)

                if (showThisBookSheet) {
                    ThisBookSheetDialog(
                        bookTitle = book.title,
                        chapters = activeChapters,
                        currentChapterIndex = currentChapterIndex,
                        annotations = bookAnnotations,
                        lang = settings.uiLanguage,
                        onDismiss = { showThisBookSheet = false },
                        onSelectChapter = { idx ->
                            switchEpisodeInternal(idx, 0, false)
                        },
                        onJumpToAnnotation = { item ->
                            val targetOff = item.startOffset ?: item.charOffset ?: 0
                            if (item.chapterIndex == currentChapterIndex) {
                                currentCharOffset = targetOff
                            } else {
                                switchEpisodeInternal(item.chapterIndex, targetOff, false)
                            }
                        },
                        onUpdateAnnotation = { updated ->
                            store.saveAnnotation(updated)
                        },
                        onDeleteAnnotation = { id ->
                            store.deleteAnnotation(id)
                        },
                        onExportNotesClick = {
                            val json = BackupManager.createNotesExportJson(bookAnnotations)
                            pendingSaveBytes = json.toByteArray(Charsets.UTF_8)
                            saveDocumentLauncher.launch("katakecil-catatan.json")
                        }
                    )
                }

                if (showAppearanceSheet) {
                    ReadingAppearanceSheetDialog(
                        settings = settings,
                        onUpdateSettings = { store.updateSettings(it) },
                        onDismiss = { showAppearanceSheet = false }
                    )
                }

                if (showReadingToolsSheet) {
                    ReadingToolsSheetDialog(
                        chapter = activeChapter,
                        currentPageIndex = currentPageIndex,
                        totalPages = currentTotalPages,
                        lang = settings.uiLanguage,
                        onDismiss = { showReadingToolsSheet = false },
                        onOpenSearch = { showSearchDialog = true },
                        onOpenSpeedReader = { showSpeedReaderDialog = true },
                        onOpenReadAloud = {
                            showReadAloudSheet = true
                            if (!ttsState.isPlaying && !ttsState.isPaused && activeChapter != null) {
                                readAloudController.startReading(
                                    chapterIndex = currentChapterIndex,
                                    chapterText = activeChapter.text,
                                    startCharOffset = currentCharOffset,
                                    rate = settings.ttsRate,
                                    voiceId = settings.ttsVoice,
                                    languageTag = settings.ttsLanguage
                                )
                            }
                        },
                        onOpenWordTools = {
                            wordToolsSelection = activeChapter?.text?.take(60) ?: ""
                        },
                        onGoToPage = { pageIdx ->
                            val approxOffset = if (currentTotalPages > 1 && activeChapter != null) {
                                ((pageIdx.toDouble() / currentTotalPages.toDouble()) * activeChapter.text.length).roundToInt()
                            } else 0
                            currentCharOffset = approxOffset
                        }
                    )
                }

                if (showSearchDialog && activeChapter != null) {
                    EpisodeSearchDialog(
                        initialQuery = searchQuery,
                        matches = searchMatches,
                        lang = settings.uiLanguage,
                        onSearchQueryChange = { q ->
                            searchQuery = q
                            searchMatches = EpisodeSearchEngine.searchInEpisode(
                                text = activeChapter.text,
                                query = q,
                                chapterIndex = currentChapterIndex
                            )
                            activeSearchMatchIndex = 0
                        },
                        onSelectMatch = { idx ->
                            activeSearchMatchIndex = idx
                            searchMatches.getOrNull(idx)?.let { m ->
                                currentCharOffset = m.start
                                hudControlsVisible = false
                            }
                        },
                        onDismiss = { showSearchDialog = false }
                    )
                }

                if (showSpeedReaderDialog && activeChapter != null) {
                    SpeedReadingDialog(
                        chapterTitle = activeChapter.navigationTitle,
                        chapterText = activeChapter.text,
                        startCharOffset = currentCharOffset,
                        wpm = settings.speedWpm,
                        lang = settings.uiLanguage,
                        onUpdateWpm = { newWpm ->
                            store.updateSettings { it.copy(speedWpm = newWpm) }
                        },
                        onSyncOffset = { off ->
                            currentCharOffset = off
                        },
                        onNextEpisode = {
                            if (currentChapterIndex + 1 < activeChapters.size) {
                                switchEpisodeInternal(currentChapterIndex + 1, 0, false)
                            } else {
                                showSpeedReaderDialog = false
                            }
                        },
                        onDismiss = { showSpeedReaderDialog = false }
                    )
                }

                if (showReadAloudSheet) {
                    ReadAloudSheetDialog(
                        ttsState = ttsState,
                        lang = settings.uiLanguage,
                        onPlayPause = {
                            if (ttsState.isPlaying) {
                                readAloudController.pause()
                            } else if (ttsState.isPaused) {
                                readAloudController.resume()
                            } else if (activeChapter != null) {
                                readAloudController.startReading(
                                    chapterIndex = currentChapterIndex,
                                    chapterText = activeChapter.text,
                                    startCharOffset = currentCharOffset,
                                    rate = settings.ttsRate,
                                    voiceId = settings.ttsVoice,
                                    languageTag = settings.ttsLanguage
                                )
                            }
                        },
                        onPrev = { readAloudController.previousParagraph() },
                        onNext = { readAloudController.nextParagraph() },
                        onStop = { readAloudController.stop() },
                        onRateChange = { r ->
                            store.updateSettings { it.copy(ttsRate = r) }
                            readAloudController.setRate(r)
                        },
                        onVoiceSelect = { voiceId, langTag ->
                            store.updateSettings { it.copy(ttsVoice = voiceId, ttsLanguage = langTag) }
                            readAloudController.setVoice(voiceId, langTag)
                        },
                        onDismiss = { showReadAloudSheet = false }
                    )
                }

                val activeWordSelection = wordToolsSelection
                if (activeWordSelection != null) {
                    WordToolsDialog(
                        initialSelection = activeWordSelection,
                        bookLanguage = book.language,
                        uiLanguage = settings.uiLanguage,
                        onDismiss = { wordToolsSelection = null }
                    )
                }
            }

            // Global Import EPUB Preview Dialog
            val activeImportPreview = importPreview
            if (activeImportPreview != null) {
                ImportEpubPreviewDialog(
                    preview = activeImportPreview,
                    lang = settings.uiLanguage,
                    onDismiss = { importPreview = null },
                    onConfirmImport = { openImmediately ->
                        val record = activeImportPreview.record
                        store.saveLocalBook(record)
                        importPreview = null
                        showToast(
                            I18n.t(
                                "“${record.meta.title}” berhasil diimpor.",
                                "“${record.meta.title}” imported successfully.",
                                settings.uiLanguage
                            )
                        )
                        if (openImmediately) {
                            openBook(record.meta)
                        }
                    }
                )
            }

            // Global Restore Backup Preview Dialog
            val activeRestorePreview = restorePreview
            if (activeRestorePreview != null) {
                RestoreBackupPreviewDialog(
                    preview = activeRestorePreview,
                    lang = settings.uiLanguage,
                    onDismiss = { restorePreview = null },
                    onConfirmRestore = { restoreAppearance ->
                        runCatching {
                            store.restoreBackup(activeRestorePreview.payload, restoreAppearance)
                        }.onSuccess {
                            showToast(
                                I18n.t(
                                    "Cadangan berhasil dipulihkan.",
                                    "Backup restored successfully.",
                                    settings.uiLanguage
                                )
                            )
                        }.onFailure { err ->
                            showToast(err.message ?: "Gagal memulihkan cadangan.")
                        }
                        restorePreview = null
                    }
                )
            }

            GlassToastOverlay(message = toastMessage)
        }
    }
}

private fun queryDisplayName(context: android.content.Context, uri: Uri): String? {
    return runCatching {
        context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
            val idx = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
            if (idx >= 0 && c.moveToFirst()) c.getString(idx) else null
        }
    }.getOrNull()
}

/**
 * Port of cover image normalization in dist/local-books.js:
 * Fits a user-selected cover image onto a 600x900 (#faf9f5) canvas and encodes as JPEG data URL.
 */
private fun fitCoverBitmapToDataUrl(rawBytes: ByteArray): String {
    val src = BitmapFactory.decodeByteArray(rawBytes, 0, rawBytes.size)
        ?: throw IllegalArgumentException("Format gambar sampul tidak didukung.")
    val targetW = 600
    val targetH = 900
    val outBitmap = Bitmap.createBitmap(targetW, targetH, Bitmap.Config.ARGB_8888)
    val canvas = Canvas(outBitmap)
    canvas.drawColor(android.graphics.Color.parseColor("#FAF9F5"))

    val scale = maxOf(targetW.toFloat() / src.width.toFloat(), targetH.toFloat() / src.height.toFloat())
    val scaledW = (src.width * scale).roundToInt()
    val scaledH = (src.height * scale).roundToInt()
    val left = (targetW - scaledW) / 2f
    val top = (targetH - scaledH) / 2f
    val scaledBmp = Bitmap.createScaledBitmap(src, scaledW, scaledH, true)
    canvas.drawBitmap(scaledBmp, left, top, Paint(Paint.FILTER_BITMAP_FLAG))

    val baos = ByteArrayOutputStream()
    outBitmap.compress(Bitmap.CompressFormat.JPEG, 88, baos)
    val b64 = Base64.encodeToString(baos.toByteArray(), Base64.NO_WRAP)
    return "data:image/jpeg;base64,$b64"
}
