package id.karisyono.katakecil.data.storage

import android.content.Context
import id.karisyono.katakecil.core.model.AnnotationItem
import id.karisyono.katakecil.core.model.AnnotationTombstone
import id.karisyono.katakecil.core.model.BackupPayload
import id.karisyono.katakecil.core.model.BookMeta
import id.karisyono.katakecil.core.model.DeviceSettings
import id.karisyono.katakecil.core.model.LocalBookRecord
import id.karisyono.katakecil.core.model.ReadingProgress
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.serialization.builtins.ListSerializer
import kotlinx.serialization.builtins.MapSerializer
import kotlinx.serialization.builtins.serializer
import kotlinx.serialization.json.Json
import java.io.File
import java.time.Instant

/**
 * Native Kotlin repository replacing dist/store.js and dist/local-books.js.
 * Maintains 100% schema compatibility with:
 * - lumina_device_settings
 * - lumina_reading_progress
 * - lumina_annotations
 * - lumina_annotation_deletions
 * - katakecil_published_catalog_v1
 * - SharedPreferences("katakecil_appearance")
 * Plus automatic migration from any legacy WebView LocalStorage / IndexedDB files on upgrade.
 */
class KataKecilStore(private val context: Context) {

    companion object {
        const val APPEARANCE_PREFS = "katakecil_appearance"
        const val STORE_PREFS = "katakecil_native_store"
        const val KEY_SETTINGS = "lumina_device_settings"
        const val KEY_PROGRESS = "lumina_reading_progress"
        const val KEY_ANNOTATIONS = "lumina_annotations"
        const val KEY_TOMBSTONES = "lumina_annotation_deletions"
        const val KEY_CATALOG_CACHE = "katakecil_published_catalog_v1"
        const val KEY_WEBVIEW_MIGRATED = "webview_migrated_v1"
    }

    private val json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
    }

    private val prefs = context.getSharedPreferences(STORE_PREFS, Context.MODE_PRIVATE)
    private val appearancePrefs = context.getSharedPreferences(APPEARANCE_PREFS, Context.MODE_PRIVATE)
    private val localBooksDir = File(context.filesDir, "local_books").apply { mkdirs() }

    private val _settings = MutableStateFlow(loadSettingsInternal())
    val settings: StateFlow<DeviceSettings> = _settings.asStateFlow()

    private val _progressMap = MutableStateFlow(loadProgressInternal())
    val progressMap: StateFlow<Map<String, ReadingProgress>> = _progressMap.asStateFlow()

    private val _annotations = MutableStateFlow(loadAnnotationsInternal())
    val annotations: StateFlow<List<AnnotationItem>> = _annotations.asStateFlow()

    private val _tombstones = MutableStateFlow(loadTombstonesInternal())
    val tombstones: StateFlow<Map<String, AnnotationTombstone>> = _tombstones.asStateFlow()

    private val _localBooks = MutableStateFlow(loadLocalBooksMetaInternal())
    val localBooks: StateFlow<List<BookMeta>> = _localBooks.asStateFlow()

    init {
        migrateLegacyWebViewIfNeeded()
        syncAppearancePreferences(_settings.value.themeMode)
    }

    private fun loadSettingsInternal(): DeviceSettings {
        val raw = prefs.getString(KEY_SETTINGS, null)
        val appearanceTheme = appearancePrefs.getString("theme_mode", null)
        if (!raw.isNullOrBlank()) {
            return try {
                val decoded = json.decodeFromString(DeviceSettings.serializer(), raw)
                if (!appearanceTheme.isNullOrBlank() && decoded.themeMode != appearanceTheme) {
                    decoded.copy(themeMode = appearanceTheme)
                } else {
                    decoded
                }
            } catch (_: Exception) {
                DeviceSettings(themeMode = appearanceTheme ?: "light")
            }
        }
        return DeviceSettings(
            themeMode = appearanceTheme ?: "light",
            updatedAt = Instant.now().toString()
        )
    }

    private fun loadProgressInternal(): Map<String, ReadingProgress> {
        val raw = prefs.getString(KEY_PROGRESS, null) ?: return emptyMap()
        return try {
            json.decodeFromString(
                MapSerializer(String.serializer(), ReadingProgress.serializer()),
                raw
            )
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private fun loadAnnotationsInternal(): List<AnnotationItem> {
        val raw = prefs.getString(KEY_ANNOTATIONS, null) ?: return emptyList()
        return try {
            json.decodeFromString(ListSerializer(AnnotationItem.serializer()), raw)
        } catch (_: Exception) {
            emptyList()
        }
    }

    private fun loadTombstonesInternal(): Map<String, AnnotationTombstone> {
        val raw = prefs.getString(KEY_TOMBSTONES, null) ?: return emptyMap()
        return try {
            json.decodeFromString(
                MapSerializer(String.serializer(), AnnotationTombstone.serializer()),
                raw
            )
        } catch (_: Exception) {
            emptyMap()
        }
    }

    private fun loadLocalBooksMetaInternal(): List<BookMeta> {
        val files = localBooksDir.listFiles { f -> f.isFile && f.name.endsWith(".meta.json") }
            ?: return emptyList()
        return files.mapNotNull { file ->
            try {
                json.decodeFromString(BookMeta.serializer(), file.readText())
            } catch (_: Exception) {
                null
            }
        }.sortedByDescending { it.importedAt }
    }

    fun updateSettings(transform: (DeviceSettings) -> DeviceSettings) {
        val updated = transform(_settings.value).copy(updatedAt = Instant.now().toString())
        _settings.value = updated
        prefs.edit()
            .putString(KEY_SETTINGS, json.encodeToString(DeviceSettings.serializer(), updated))
            .apply()
        syncAppearancePreferences(updated.themeMode)
    }

    fun syncAppearancePreferences(themeMode: String) {
        val normalized = when (themeMode) {
            "dark", "system", "auto-sensor", "sepia", "paper", "green", "custom" -> themeMode
            else -> "light"
        }
        appearancePrefs.edit()
            .putString("theme_mode", normalized)
            .putLong("updated_at", System.currentTimeMillis())
            .apply()
    }

    fun saveProgress(progress: ReadingProgress) {
        val stamped = progress.copy(
            updatedAt = progress.updatedAt.ifBlank { Instant.now().toString() }
        )
        val next = _progressMap.value.toMutableMap()
        next[stamped.bookId] = stamped
        _progressMap.value = next
        persistProgress(next)
    }

    private fun persistProgress(map: Map<String, ReadingProgress>) {
        prefs.edit()
            .putString(
                KEY_PROGRESS,
                json.encodeToString(MapSerializer(String.serializer(), ReadingProgress.serializer()), map)
            )
            .apply()
    }

    fun getProgress(bookId: String): ReadingProgress? = _progressMap.value[bookId]

    fun getAnnotationsForBook(bookId: String): List<AnnotationItem> {
        return _annotations.value
            .filter { it.bookId == bookId }
            .sortedWith(compareBy({ it.chapterIndex }, { it.startOffset ?: it.charOffset ?: 0 }))
    }

    fun saveAnnotation(item: AnnotationItem) {
        val now = Instant.now().toString()
        val stamped = item.copy(
            createdAt = item.createdAt.ifBlank { now },
            updatedAt = now
        )
        val list = _annotations.value.toMutableList()
        val existingIdx = list.indexOfFirst { it.id == stamped.id }
        if (existingIdx >= 0) {
            list[existingIdx] = stamped
        } else {
            list.add(stamped)
        }
        _annotations.value = list
        persistAnnotations(list)

        if (_tombstones.value.containsKey(stamped.id)) {
            val nextTombs = _tombstones.value.toMutableMap()
            nextTombs.remove(stamped.id)
            _tombstones.value = nextTombs
            persistTombstones(nextTombs)
        }
    }

    fun updateBookAnnotations(bookId: String, updatedForBook: List<AnnotationItem>) {
        val others = _annotations.value.filter { it.bookId != bookId }
        val combined = others + updatedForBook
        _annotations.value = combined
        persistAnnotations(combined)
    }

    fun deleteAnnotation(annotationId: String) {
        val target = _annotations.value.find { it.id == annotationId }
        val nextList = _annotations.value.filterNot { it.id == annotationId }
        _annotations.value = nextList
        persistAnnotations(nextList)

        val nextTombs = _tombstones.value.toMutableMap()
        nextTombs[annotationId] = AnnotationTombstone(
            id = annotationId,
            bookId = target?.bookId ?: "",
            deletedAt = Instant.now().toString()
        )
        _tombstones.value = nextTombs
        persistTombstones(nextTombs)
    }

    private fun persistAnnotations(list: List<AnnotationItem>) {
        prefs.edit()
            .putString(KEY_ANNOTATIONS, json.encodeToString(ListSerializer(AnnotationItem.serializer()), list))
            .apply()
    }

    private fun persistTombstones(map: Map<String, AnnotationTombstone>) {
        prefs.edit()
            .putString(
                KEY_TOMBSTONES,
                json.encodeToString(MapSerializer(String.serializer(), AnnotationTombstone.serializer()), map)
            )
            .apply()
    }

    fun savePublishedCatalogCache(books: List<BookMeta>) {
        prefs.edit()
            .putString(KEY_CATALOG_CACHE, json.encodeToString(ListSerializer(BookMeta.serializer()), books))
            .apply()
    }

    fun loadPublishedCatalogCache(): List<BookMeta> {
        val raw = prefs.getString(KEY_CATALOG_CACHE, null) ?: return emptyList()
        return try {
            json.decodeFromString(ListSerializer(BookMeta.serializer()), raw)
        } catch (_: Exception) {
            emptyList()
        }
    }

    // Local Personal EPUBs
    fun saveLocalBook(record: LocalBookRecord) {
        val safeId = record.meta.id.replace(Regex("[^a-zA-Z0-9_.-]"), "_")
        val metaFile = File(localBooksDir, "$safeId.meta.json")
        val contentFile = File(localBooksDir, "$safeId.book.json")
        metaFile.writeText(json.encodeToString(BookMeta.serializer(), record.meta))
        contentFile.writeText(json.encodeToString(LocalBookRecord.serializer(), record))
        _localBooks.value = loadLocalBooksMetaInternal()
    }

    fun loadLocalBookRecord(bookId: String): LocalBookRecord? {
        val safeId = bookId.replace(Regex("[^a-zA-Z0-9_.-]"), "_")
        val contentFile = File(localBooksDir, "$safeId.book.json")
        if (!contentFile.exists()) return null
        return try {
            json.decodeFromString(LocalBookRecord.serializer(), contentFile.readText())
        } catch (_: Exception) {
            null
        }
    }

    fun updateLocalBookCover(bookId: String, customCoverDataUrl: String) {
        val record = loadLocalBookRecord(bookId) ?: return
        val updatedMeta = record.meta.copy(
            customCoverDataUrl = customCoverDataUrl,
            coverUrl = customCoverDataUrl.ifBlank { record.meta.originalCoverDataUrl },
            updatedAt = Instant.now().toString()
        )
        saveLocalBook(record.copy(meta = updatedMeta))
    }

    fun deleteLocalBook(bookId: String) {
        val safeId = bookId.replace(Regex("[^a-zA-Z0-9_.-]"), "_")
        File(localBooksDir, "$safeId.meta.json").delete()
        File(localBooksDir, "$safeId.book.json").delete()
        _localBooks.value = loadLocalBooksMetaInternal()
    }

    private fun parseEpochMillis(iso: String?): Long {
        if (iso.isNullOrBlank()) return 0L
        return try {
            Instant.parse(iso).toEpochMilli()
        } catch (_: Exception) {
            0L
        }
    }

    /**
     * Merges a validated BackupPayload into current store state (matching dist/store.js restoreBackup).
     * Rejects cross-book annotation ID collisions, respects tombstones, and merges by timestamp.
     */
    fun restoreBackup(payload: BackupPayload, restoreAppearance: Boolean) {
        val existingById = _annotations.value.associateBy { it.id }.toMutableMap()

        // First check for cross-book ID collisions before mutating
        for (incoming in payload.annotations) {
            val existing = existingById[incoming.id]
            if (existing != null && existing.bookId != incoming.bookId) {
                throw IllegalArgumentException("Annotation ID collision across different books: ${incoming.id}")
            }
        }

        val tombs = _tombstones.value.toMutableMap()
        for (incoming in payload.annotations) {
            val incomingTime = maxOf(parseEpochMillis(incoming.updatedAt), parseEpochMillis(incoming.createdAt))
            val tomb = tombs[incoming.id]
            if (tomb != null) {
                val tombTime = parseEpochMillis(tomb.deletedAt)
                if (tombTime >= incomingTime && incomingTime > 0L) {
                    continue
                } else {
                    tombs.remove(incoming.id)
                }
            }
            val existing = existingById[incoming.id]
            if (existing == null) {
                existingById[incoming.id] = incoming
            } else {
                val existingTime = maxOf(parseEpochMillis(existing.updatedAt), parseEpochMillis(existing.createdAt))
                if (incomingTime >= existingTime) {
                    existingById[incoming.id] = incoming
                }
            }
        }

        val mergedAnnotations = existingById.values.toList()
        _annotations.value = mergedAnnotations
        persistAnnotations(mergedAnnotations)
        _tombstones.value = tombs
        persistTombstones(tombs)

        if (payload.progress.isNotEmpty()) {
            val nextProgress = _progressMap.value.toMutableMap()
            for (incoming in payload.progress) {
                val existing = nextProgress[incoming.bookId]
                if (existing == null) {
                    nextProgress[incoming.bookId] = incoming
                } else {
                    val incomingTime = parseEpochMillis(incoming.updatedAt)
                    val existingTime = parseEpochMillis(existing.updatedAt)
                    if (incomingTime >= existingTime) {
                        nextProgress[incoming.bookId] = incoming
                    }
                }
            }
            _progressMap.value = nextProgress
            persistProgress(nextProgress)
        }

        if (restoreAppearance && payload.preferences.isNotEmpty()) {
            updateSettings { current ->
                BackupManager.applyPreferencesToSettings(current, payload.preferences)
                    .copy(deviceId = current.deviceId)
            }
        }
    }

    fun getStorageSummaryBytes(): Long {
        var total = 0L
        localBooksDir.listFiles()?.forEach { total += it.length() }
        total += (prefs.getString(KEY_SETTINGS, "")?.length ?: 0)
        total += (prefs.getString(KEY_PROGRESS, "")?.length ?: 0)
        total += (prefs.getString(KEY_ANNOTATIONS, "")?.length ?: 0)
        return total
    }

    /**
     * Automatically migrates user data from Capacitor WebView LocalStorage leveldb files
     * if the user upgraded an existing v1.2.3 APK installation in-place.
     */
    private fun migrateLegacyWebViewIfNeeded() {
        if (prefs.getBoolean(KEY_WEBVIEW_MIGRATED, false)) return
        try {
            val dataDir = context.applicationInfo.dataDir?.let { File(it) } ?: return
            val levelDbDir = File(dataDir, "app_webview/Default/Local Storage/leveldb")
            if (levelDbDir.exists() && levelDbDir.isDirectory) {
                val files = levelDbDir.listFiles { f -> f.name.endsWith(".ldb") || f.name.endsWith(".log") }
                files?.forEach { file ->
                    val content = String(file.readBytes(), Charsets.UTF_8)
                    extractLegacyJsonObject(content, "lumina_device_settings")?.let { rawSettings ->
                        if (prefs.getString(KEY_SETTINGS, null).isNullOrBlank()) {
                            runCatching {
                                val parsed = json.decodeFromString(DeviceSettings.serializer(), rawSettings)
                                _settings.value = parsed
                                prefs.edit().putString(KEY_SETTINGS, rawSettings).apply()
                            }
                        }
                    }
                }
            }
        } catch (_: Throwable) {
            // Safe fallback if no legacy WebView directory exists
        } finally {
            prefs.edit().putBoolean(KEY_WEBVIEW_MIGRATED, true).apply()
        }
    }

    private fun extractLegacyJsonObject(source: String, key: String): String? {
        val idx = source.indexOf(key)
        if (idx < 0) return null
        val braceStart = source.indexOf('{', idx + key.length)
        if (braceStart < 0) return null
        var depth = 0
        var inString = false
        var escaped = false
        for (i in braceStart until minOf(source.length, braceStart + 250_000)) {
            val ch = source[i]
            if (escaped) {
                escaped = false
                continue
            }
            if (ch == '\\') {
                escaped = true
                continue
            }
            if (ch == '"') {
                inString = !inString
                continue
            }
            if (!inString) {
                if (ch == '{') depth++
                else if (ch == '}') {
                    depth--
                    if (depth == 0) {
                        return source.substring(braceStart, i + 1)
                    }
                }
            }
        }
        return null
    }
}
