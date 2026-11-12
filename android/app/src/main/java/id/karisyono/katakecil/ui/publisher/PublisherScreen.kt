package id.karisyono.katakecil.ui.publisher

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import id.karisyono.katakecil.ui.components.WebTextField as OutlinedTextField
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
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import id.karisyono.katakecil.core.i18n.I18n
import id.karisyono.katakecil.core.theme.KataKecilFonts
import id.karisyono.katakecil.core.theme.LocalKataKecilPalette
import id.karisyono.katakecil.data.remote.PublisherClient
import id.karisyono.katakecil.ui.components.AmbientBackground
import id.karisyono.katakecil.ui.components.BookCoverView
import id.karisyono.katakecil.ui.components.GlassIconButton
import id.karisyono.katakecil.ui.components.GlassPillButton
import id.karisyono.katakecil.ui.components.GlassSurface
import id.karisyono.katakecil.ui.components.LiquidGlassTabs
import id.karisyono.katakecil.ui.components.LoadingWordmark
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID

/**
 * Complete Native Jetpack Compose Publisher Studio Screen (port of dist/publisher.js,
 * dist/publisher-client.js, and dist/publisher-import.js).
 */
@Composable
fun PublisherScreen(
    publisherClient: PublisherClient,
    lang: String,
    onBack: () -> Unit,
    onExportPublisherEpub: (fileName: String, bytes: ByteArray) -> Unit,
    onPublishCompleted: () -> Unit,
    onShowToast: (String) -> Unit
) {
    val context = LocalContext.current
    val palette = LocalKataKecilPalette.current
    val scope = rememberCoroutineScope()

    var isSignedIn by remember { mutableStateOf(publisherClient.isAuthenticated) }
    var authTab by remember { mutableStateOf("login") }
    var emailInput by remember { mutableStateOf("") }
    var passwordInput by remember { mutableStateOf("") }
    var passwordVisible by remember { mutableStateOf(false) }
    var publisherKeyInput by remember { mutableStateOf("") }

    var isBusy by remember { mutableStateOf(false) }
    var errorMessage by remember { mutableStateOf<String?>(null) }
    var books by remember { mutableStateOf<List<PublisherClient.PublisherBookSummary>>(emptyList()) }
    var activeBookDetail by remember { mutableStateOf<PublisherClient.PublisherBookDetail?>(null) }
    var importedParts by remember { mutableStateOf<List<PublisherClient.ImportedChapterPart>>(emptyList()) }
    var firstImmediateCount by remember { mutableIntStateOf(1) }
    var intervalDays by remember { mutableIntStateOf(1) }

    fun loadBooksList() {
        scope.launch {
            isBusy = true
            errorMessage = null
            runCatching {
                publisherClient.fetchBooks()
            }.onSuccess {
                books = it
            }.onFailure {
                errorMessage = it.message ?: "Gagal memuat daftar buku Publisher."
            }
            isBusy = false
        }
    }

    val chapterFilePicker = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.OpenDocument()
    ) { uri: Uri? ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            isBusy = true
            errorMessage = null
            runCatching {
                val (name, bytes) = withContext(Dispatchers.IO) {
                    val cursor = context.contentResolver.query(uri, null, null, null, null)
                    var displayName = "update.txt"
                    cursor?.use { c ->
                        val idx = c.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME)
                        if (idx >= 0 && c.moveToFirst()) {
                            displayName = c.getString(idx) ?: displayName
                        }
                    }
                    val raw = context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                        ?: throw IllegalArgumentException("Tidak dapat membaca file yang dipilih.")
                    displayName to raw
                }
                val parts = publisherClient.importChapterBytes(name, bytes)
                val detail = activeBookDetail
                if (detail != null) {
                    importedParts = publisherClient.matchUpdates(parts, detail.sections)
                } else {
                    // Create a new draft book from the imported file
                    val newBook = PublisherClient.PublisherBookSummary(
                        id = UUID.randomUUID().toString(),
                        title = name.substringBeforeLast('.').replace('_', ' '),
                        author = "Karisyono",
                        language = "id",
                        status = "ongoing"
                    )
                    activeBookDetail = PublisherClient.PublisherBookDetail(
                        book = newBook,
                        sections = emptyList()
                    )
                    importedParts = parts.map { it.copy(target = "new") }
                }
            }.onFailure {
                errorMessage = it.message ?: "Gagal memproses file bab."
            }
            isBusy = false
        }
    }

    LaunchedEffect(isSignedIn) {
        if (isSignedIn) {
            loadBooksList()
        }
    }

    AmbientBackground {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .statusBarsPadding()
                .padding(horizontal = 24.dp, vertical = 8.dp)
        ) {
            id.karisyono.katakecil.ui.components.WebPageHeading("Publisher",
                if (activeBookDetail == null) I18n.t("Pengaturan", "Settings", lang) else I18n.t("Buku", "Books", lang), {
                    if (activeBookDetail != null) { activeBookDetail = null; importedParts = emptyList() } else onBack()
                })
            if (isSignedIn && activeBookDetail == null) {
                Row(Modifier.fillMaxWidth().padding(bottom = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    GlassPillButton(I18n.t("Unggah EPUB", "Upload EPUB", lang), { activeBookDetail = null; chapterFilePicker.launch(arrayOf("application/epub+zip", "application/octet-stream")) }, Modifier.weight(1f), leadingIcon = "upload", primary = true, enabled = !isBusy)
                    GlassIconButton("refresh", I18n.t("Segarkan", "Refresh", lang), { if (!isBusy) loadBooksList() })
                    GlassIconButton("back", I18n.t("Keluar", "Sign out", lang), { if (!isBusy) scope.launch { publisherClient.logout(); isSignedIn = false; activeBookDetail = null; books = emptyList() } })
                }
            }

            if (errorMessage != null) {
                GlassSurface(
                    cornerRadius = 16.dp,
                    contentPadding = PaddingValues(12.dp),
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 12.dp)
                ) {
                    Text(
                        text = errorMessage ?: "",
                        color = Color(0xFFE76F51),
                        fontFamily = KataKecilFonts.Ui,
                        fontSize = 13.sp
                    )
                }
            }

            when {
                isBusy -> {
                    Box(
                        modifier = Modifier.fillMaxSize(),
                        contentAlignment = Alignment.Center
                    ) {
                        LoadingWordmark()
                    }
                }

                !isSignedIn -> {
                    GlassSurface(
                        cornerRadius = 26.dp,
                        elevated = true,
                        contentPadding = PaddingValues(22.dp),
                        modifier = Modifier.fillMaxWidth().weight(1f, fill = false)
                    ) {
                        Column(
                            modifier = Modifier.fillMaxWidth().verticalScroll(rememberScrollState()),
                            verticalArrangement = Arrangement.spacedBy(14.dp)
                        ) {
                            LiquidGlassTabs(
                                tabs = listOf(
                                    "login" to I18n.t("Masuk", "Sign In", lang),
                                    "signup" to I18n.t("Daftar", "Sign Up", lang),
                                    "recover" to I18n.t("Pemulihan", "Recover", lang),
                                    "key" to "Key"
                                ),
                                selectedTab = authTab,
                                onTabSelected = { authTab = it }
                            )

                            if (authTab == "key") {
                                OutlinedTextField(
                                    value = publisherKeyInput,
                                    onValueChange = { publisherKeyInput = it },
                                    singleLine = true,
                                    visualTransformation = PasswordVisualTransformation(),
                                    label = { Text("Publisher Key") },
                                    modifier = Modifier.fillMaxWidth()
                                )
                                GlassPillButton(
                                    text = I18n.t("Masuk dengan Kunci", "Sign in with Key", lang),
                                    leadingIcon = "lock",
                                    primary = true,
                                    modifier = Modifier.fillMaxWidth(),
                                    onClick = {
                                        scope.launch {
                                            isBusy = true
                                            errorMessage = null
                                            runCatching {
                                                publisherClient.loginWithKey(publisherKeyInput)
                                            }.onSuccess {
                                                isSignedIn = true
                                            }.onFailure {
                                                errorMessage = it.message
                                            }
                                            isBusy = false
                                        }
                                    }
                                )
                            } else {
                                OutlinedTextField(
                                    value = emailInput,
                                    onValueChange = { emailInput = it },
                                    singleLine = true,
                                    label = { Text("Email") },
                                    modifier = Modifier.fillMaxWidth()
                                )

                                if (authTab != "recover") {
                                    OutlinedTextField(
                                        value = passwordInput,
                                        onValueChange = { passwordInput = it },
                                        singleLine = true,
                                        visualTransformation = if (passwordVisible) androidx.compose.ui.text.input.VisualTransformation.None else PasswordVisualTransformation(),
                                        trailingIcon = { GlassIconButton(if (passwordVisible) "eyeOff" else "eye", I18n.t("Tampilkan/sembunyikan kata sandi", "Show/hide password", lang), { passwordVisible = !passwordVisible }, size = 36.dp, iconSize = 18.dp) },
                                        label = { Text(I18n.t("Kata sandi", "Password", lang)) },
                                        modifier = Modifier.fillMaxWidth()
                                    )
                                }

                                GlassPillButton(
                                    text = when (authTab) {
                                        "signup" -> I18n.t("Daftar Akun Publisher", "Create Publisher Account", lang)
                                        "recover" -> I18n.t("Kirim Tautan Pemulihan", "Send Recovery Link", lang)
                                        else -> I18n.t("Masuk ke Studio", "Sign In to Studio", lang)
                                    },
                                    primary = true,
                                    modifier = Modifier.fillMaxWidth(),
                                    onClick = {
                                        scope.launch {
                                            isBusy = true
                                            errorMessage = null
                                            runCatching {
                                                when (authTab) {
                                                    "signup" -> {
                                                        val hasSession = publisherClient.signUp(emailInput, passwordInput)
                                                        if (hasSession) {
                                                            isSignedIn = true
                                                        } else {
                                                            onShowToast("Periksa email Anda untuk konfirmasi pendaftaran.")
                                                        }
                                                    }
                                                    "recover" -> {
                                                        publisherClient.recoverPassword(emailInput)
                                                        onShowToast("Email pemulihan kata sandi telah dikirim.")
                                                    }
                                                    else -> {
                                                        publisherClient.loginWithPassword(emailInput, passwordInput)
                                                        isSignedIn = true
                                                    }
                                                }
                                            }.onFailure {
                                                errorMessage = it.message
                                            }
                                            isBusy = false
                                        }
                                    }
                                )
                            }
                        }
                    }
                }

                activeBookDetail != null -> {
                    val detail = activeBookDetail!!
                    Column(
                        modifier = Modifier
                            .fillMaxSize()
                            .verticalScroll(rememberScrollState()),
                        verticalArrangement = Arrangement.spacedBy(14.dp)
                    ) {
                        GlassSurface(
                            cornerRadius = 24.dp,
                            contentPadding = PaddingValues(18.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                OutlinedTextField(
                                    value = detail.book.title,
                                    onValueChange = { next ->
                                        activeBookDetail = detail.copy(book = detail.book.copy(title = next))
                                    },
                                    singleLine = true,
                                    label = { Text(I18n.t("Judul Buku", "Book Title", lang)) },
                                    modifier = Modifier.fillMaxWidth()
                                )
                                OutlinedTextField(
                                    value = detail.book.author,
                                    onValueChange = { next ->
                                        activeBookDetail = detail.copy(book = detail.book.copy(author = next))
                                    },
                                    singleLine = true,
                                    label = { Text(I18n.t("Penulis", "Author", lang)) },
                                    modifier = Modifier.fillMaxWidth()
                                )

                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    GlassPillButton(
                                        text = "Ongoing",
                                        primary = detail.book.status == "ongoing",
                                        onClick = {
                                            activeBookDetail = detail.copy(
                                                book = detail.book.copy(status = "ongoing")
                                            )
                                        }
                                    )
                                    GlassPillButton(
                                        text = I18n.t("Tamat (Completed)", "Completed", lang),
                                        primary = detail.book.status == "completed",
                                        onClick = {
                                            activeBookDetail = detail.copy(
                                                book = detail.book.copy(status = "completed")
                                            )
                                        }
                                    )
                                }

                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    GlassPillButton(
                                        text = I18n.t("Impor Bab (EPUB/TXT/MD/HTML)", "Import Chapters", lang),
                                        leadingIcon = "upload",
                                        primary = true,
                                        onClick = {
                                            chapterFilePicker.launch(arrayOf("*/*"))
                                        }
                                    )
                                    GlassPillButton(
                                        text = I18n.t("Unduh EPUB", "Download EPUB", lang),
                                        leadingIcon = "download",
                                        onClick = {
                                            scope.launch {
                                                isBusy = true
                                                runCatching {
                                                    publisherClient.downloadPublisherEpub(detail.book.id)
                                                }.onSuccess { bytes ->
                                                    onExportPublisherEpub("${detail.book.title}.epub", bytes)
                                                }.onFailure {
                                                    errorMessage = it.message
                                                }
                                                isBusy = false
                                            }
                                        }
                                    )
                                }
                            }
                        }

                        if (importedParts.isNotEmpty()) {
                            GlassSurface(
                                cornerRadius = 24.dp,
                                contentPadding = PaddingValues(18.dp),
                                modifier = Modifier.fillMaxWidth()
                            ) {
                                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                    Text(
                                        text = "${importedParts.size} Bab Siap Dipublikasikan",
                                        color = palette.accent,
                                        fontFamily = KataKecilFonts.Ui,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 13.5.sp
                                    )

                                    if (detail.book.status == "ongoing") {
                                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                                            OutlinedTextField(
                                                value = "$firstImmediateCount",
                                                onValueChange = {
                                                    firstImmediateCount = (it.toIntOrNull() ?: 1).coerceIn(0, 600)
                                                },
                                                singleLine = true,
                                                label = { Text("Tayang langsung") },
                                                modifier = Modifier.weight(1f)
                                            )
                                            OutlinedTextField(
                                                value = "$intervalDays",
                                                onValueChange = {
                                                    intervalDays = (it.toIntOrNull() ?: 1).coerceIn(1, 365)
                                                },
                                                singleLine = true,
                                                label = { Text("Interval (hari)") },
                                                modifier = Modifier.weight(1f)
                                            )
                                        }
                                    }

                                    importedParts.forEachIndexed { idx, part ->
                                        Row(
                                            modifier = Modifier
                                                .fillMaxWidth()
                                                .clip(RoundedCornerShape(14.dp))
                                                .background(palette.surface.copy(alpha = 0.6f))
                                                .padding(10.dp),
                                            horizontalArrangement = Arrangement.SpaceBetween,
                                            verticalAlignment = Alignment.CenterVertically
                                        ) {
                                            Column(modifier = Modifier.weight(1f)) {
                                                Text(
                                                    text = part.title,
                                                    color = palette.textPrimary,
                                                    fontFamily = KataKecilFonts.Ui,
                                                    fontWeight = FontWeight.SemiBold,
                                                    fontSize = 13.5.sp
                                                )
                                                Text(
                                                    text = "Target: ${part.target}",
                                                    color = palette.textSecondary,
                                                    fontFamily = KataKecilFonts.Ui,
                                                    fontSize = 11.5.sp
                                                )
                                            }
                                            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                                                GlassPillButton(
                                                    text = if (part.target == "skip") "Lewati" else "Baru",
                                                    primary = part.target != "skip",
                                                    onClick = {
                                                        val mutable = importedParts.toMutableList()
                                                        val nextTarget = if (part.target == "skip") "new" else "skip"
                                                        mutable[idx] = part.copy(target = nextTarget)
                                                        importedParts = mutable
                                                    }
                                                )
                                            }
                                        }
                                    }

                                    GlassPillButton(
                                        text = I18n.t("Terbitkan Sekarang", "Publish Now", lang),
                                        leadingIcon = "cloud",
                                        primary = true,
                                        modifier = Modifier.fillMaxWidth(),
                                        onClick = {
                                            scope.launch {
                                                isBusy = true
                                                errorMessage = null
                                                runCatching {
                                                    val plan = publisherClient.planPublication(
                                                        book = detail.book,
                                                        existingSections = detail.sections,
                                                        parts = importedParts,
                                                        firstImmediateCount = firstImmediateCount,
                                                        intervalDays = intervalDays
                                                    )
                                                    publisherClient.publishBook(plan)
                                                }.onSuccess {
                                                    importedParts = emptyList()
                                                    onShowToast("Buku berhasil diterbitkan!")
                                                    onPublishCompleted()
                                                    loadBooksList()
                                                }.onFailure {
                                                    errorMessage = it.message
                                                }
                                                isBusy = false
                                            }
                                        }
                                    )
                                }
                            }
                        }

                        // Existing sections list
                        GlassSurface(
                            cornerRadius = 24.dp,
                            contentPadding = PaddingValues(18.dp),
                            modifier = Modifier.fillMaxWidth()
                        ) {
                            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                                Text(
                                    text = "${detail.sections.size} Bagian Terdaftar",
                                    color = palette.textSecondary,
                                    fontFamily = KataKecilFonts.Ui,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 13.sp
                                )
                                detail.sections.forEachIndexed { idx, sec ->
                                    Row(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .clip(RoundedCornerShape(12.dp))
                                            .background(palette.surface.copy(alpha = 0.55f))
                                            .padding(horizontal = 12.dp, vertical = 10.dp),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Column(modifier = Modifier.weight(1f)) {
                                            Text(
                                                text = "${idx + 1}. ${sec.title}",
                                                color = palette.textPrimary,
                                                fontFamily = KataKecilFonts.Ui,
                                                fontWeight = FontWeight.Medium,
                                                fontSize = 13.5.sp
                                            )
                                            if (!sec.release_at.isNullOrBlank()) {
                                                Text(
                                                    text = "Rilis: ${sec.release_at.take(16).replace('T', ' ')}",
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
                    }
                }

                else -> {
                    GlassSurface(cornerRadius = 20.dp, contentPadding = PaddingValues(14.dp), modifier = Modifier.fillMaxWidth()) {
                        LazyColumn(Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(18.dp)) {
                            items(books, key = { it.id }) { item ->
                                Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                                    BookCoverView(item.title, item.author, item.cover_url, Modifier.width(48.dp).height(74.dp), cornerRadius = 4.dp)
                                    Column(Modifier.weight(1f)) {
                                        Text(item.title, color = palette.textPrimary, fontSize = 15.sp, fontWeight = FontWeight.SemiBold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                                        Text(item.status.replaceFirstChar { it.uppercase() }, color = palette.textMuted, fontSize = 11.sp)
                                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                            GlassPillButton(I18n.t("Perbarui", "Update", lang), {
                                                scope.launch { isBusy = true; errorMessage = null
                                                    runCatching { publisherClient.fetchBookDetail(item.id) }.onSuccess { activeBookDetail = it }.onFailure { errorMessage = it.message }; isBusy = false }
                                            }, leadingIcon = "edit")
                                            GlassPillButton("EPUB", {
                                                scope.launch { isBusy = true; errorMessage = null
                                                    runCatching { publisherClient.downloadPublisherEpub(item.id) }.onSuccess { onExportPublisherEpub("${item.title}.epub", it) }.onFailure { errorMessage = it.message }; isBusy = false }
                                            }, leadingIcon = "download")
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
}
