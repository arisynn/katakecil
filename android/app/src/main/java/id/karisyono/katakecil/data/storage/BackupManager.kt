package id.karisyono.katakecil.data.storage

import id.karisyono.katakecil.core.model.AnnotationItem
import id.karisyono.katakecil.core.model.BackupPayload
import id.karisyono.katakecil.core.model.BackupPreview
import id.karisyono.katakecil.core.model.DeviceSettings
import id.karisyono.katakecil.core.model.ReadingProgress
import id.karisyono.katakecil.core.model.TextQuoteAnchor
import id.karisyono.katakecil.core.model.TtsCheckpoint
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.JsonPrimitive
import kotlinx.serialization.json.booleanOrNull
import kotlinx.serialization.json.buildJsonArray
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.doubleOrNull
import kotlinx.serialization.json.floatOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import java.time.Instant

/**
 * Port of src/platform/backup.ts & dist/device-backup.js.
 * Supports KataKecil Backup Schema v2 and legacy Schema v1 annotation exports.
 */
object BackupManager {
    const val BACKUP_MAX_BYTES = 8 * 1024 * 1024 // 8 MB

    private val SAFE_ID_REGEX = Regex("^[a-zA-Z0-9][a-zA-Z0-9_.:-]*$")
    private val HEX_64_REGEX = Regex("^[a-fA-F0-9]{64}$")
    private val HEX_COLOR_REGEX = Regex("^#[a-fA-F0-9]{6}$")

    private val ALLOWED_PREFERENCE_KEYS = setOf(
        "ambientIntensity", "glassTransparency", "glassBlur",
        "uiLanguage", "uiLanguageChosen", "uiLanguageDefaultVersion",
        "themeMode", "accentColor", "fontFamily", "fontSize", "lineHeight",
        "fontWeight", "paragraphSpacing", "letterSpacing", "paragraphIndent",
        "textAlign", "marginHorizontal", "marginVertical", "readerWidth",
        "readingMode", "readerTheme", "spreadMode", "pageAnimation",
        "contentPosition", "brightness", "tapNavigation", "wakeLock",
        "orientation", "customTextColor", "customBackgroundColor",
        "speedWpm", "ttsRate", "ttsVoice", "ttsLanguage",
        "globalThemeVersion", "comfortDefaultsVersion", "paragraphIndentVersion"
    )

    private val ENUM_PREFS = mapOf(
        "uiLanguage" to setOf("id", "en"),
        "themeMode" to setOf("light", "dark", "system", "auto-sensor", "sepia", "paper", "green", "custom"),
        "fontFamily" to setOf("Lora", "Plus Jakarta Sans", "DM Sans", "Georgia", "system", "monospace"),
        "readingMode" to setOf("pages", "scroll"),
        "readerTheme" to setOf("follow", "light", "dark", "sepia", "paper", "green", "custom"),
        "spreadMode" to setOf("single", "double"),
        "pageAnimation" to setOf("none", "fade", "slide"),
        "contentPosition" to setOf("top", "center"),
        "textAlign" to setOf("left", "justify", "center", "right"),
        "orientation" to setOf("auto", "portrait", "landscape")
    )

    private val prettyJson = Json {
        prettyPrint = true
        encodeDefaults = true
        ignoreUnknownKeys = true
    }

    private fun fail(): Nothing = throw IllegalArgumentException("Invalid KataKecil backup.")

    private fun isSafeId(value: String?): Boolean {
        if (value.isNullOrEmpty() || value.length > 200) return false
        if (value == "__proto__" || value == "prototype" || value == "constructor") return false
        return SAFE_ID_REGEX.matches(value)
    }

    private fun isValidTimestamp(value: String?): Boolean {
        if (value.isNullOrBlank() || value.length > 40) return false
        return try {
            Instant.parse(value)
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun parseAnchor(obj: JsonObject): TextQuoteAnchor {
        val episodeId = obj["episodeId"]?.jsonPrimitive?.contentOrNull ?: fail()
        val exact = obj["exact"]?.jsonPrimitive?.contentOrNull ?: fail()
        val prefix = obj["prefix"]?.jsonPrimitive?.contentOrNull ?: ""
        val suffix = obj["suffix"]?.jsonPrimitive?.contentOrNull ?: ""
        val start = obj["start"]?.jsonPrimitive?.intOrNull ?: fail()
        val end = obj["end"]?.jsonPrimitive?.intOrNull ?: fail()
        val sourceHash = obj["sourceHash"]?.jsonPrimitive?.contentOrNull

        if (episodeId.isEmpty() || episodeId.length > 1000) fail()
        if (exact.isEmpty() || exact.length > 4000) fail()
        if (prefix.length > 1000 || suffix.length > 1000) fail()
        if (start < 0 || end <= start || end > 100_000_000) fail()
        if (end - start != exact.length) fail()
        if (sourceHash != null && !HEX_64_REGEX.matches(sourceHash)) fail()

        return TextQuoteAnchor(
            episodeId = episodeId,
            exact = exact,
            prefix = prefix,
            suffix = suffix,
            start = start,
            end = end,
            sourceHash = sourceHash?.lowercase()
        )
    }

    private fun parseProgress(obj: JsonObject): ReadingProgress {
        val bookId = obj["bookId"]?.jsonPrimitive?.contentOrNull ?: fail()
        if (!isSafeId(bookId)) fail()
        val chapterIndex = obj["chapterIndex"]?.jsonPrimitive?.intOrNull ?: fail()
        if (chapterIndex < 0 || chapterIndex > 100_000_000) fail()

        val percentage = obj["percentage"]?.jsonPrimitive?.doubleOrNull ?: fail()
        if (!percentage.isFinite() || percentage < 0.0 || percentage > 100.0) fail()

        val charOffset = obj["charOffset"]?.jsonPrimitive?.intOrNull ?: 0
        val pageIndex = obj["pageIndex"]?.jsonPrimitive?.intOrNull ?: 0
        val totalPages = obj["totalPages"]?.jsonPrimitive?.intOrNull ?: 1
        val totalChapters = obj["totalChapters"]?.jsonPrimitive?.intOrNull ?: 1
        if (charOffset < 0 || pageIndex < 0 || totalPages < 0 || totalChapters < 0) fail()

        val updatedAt = obj["updatedAt"]?.jsonPrimitive?.contentOrNull ?: ""
        if (updatedAt.isNotEmpty() && !isValidTimestamp(updatedAt)) fail()

        val anchor = (obj["anchor"] as? JsonObject)?.let { parseAnchor(it) }
        val needsReview = obj["needsReview"]?.jsonPrimitive?.booleanOrNull ?: false
        val legacySourceAnchor = obj["legacySourceAnchor"]?.jsonPrimitive?.booleanOrNull ?: false

        val ttsObj = obj["tts"] as? JsonObject
        val tts = if (ttsObj != null) {
            val ttsCh = ttsObj["chapterIndex"]?.jsonPrimitive?.intOrNull
            val ttsOff = ttsObj["charOffset"]?.jsonPrimitive?.intOrNull
            if (ttsCh != null && ttsOff != null && ttsCh >= 0 && ttsOff >= 0) {
                TtsCheckpoint(ttsCh, ttsOff)
            } else null
        } else null

        return ReadingProgress(
            bookId = bookId,
            chapterIndex = chapterIndex,
            charOffset = charOffset,
            pageIndex = pageIndex,
            totalPages = totalPages,
            totalChapters = totalChapters,
            percentage = percentage,
            anchor = anchor,
            needsReview = needsReview,
            legacySourceAnchor = legacySourceAnchor,
            tts = tts,
            updatedAt = updatedAt
        )
    }

    private fun parseAnnotation(obj: JsonObject): AnnotationItem {
        val id = obj["id"]?.jsonPrimitive?.contentOrNull ?: fail()
        val bookId = obj["bookId"]?.jsonPrimitive?.contentOrNull ?: fail()
        if (!isSafeId(id) || !isSafeId(bookId)) fail()

        val type = obj["type"]?.jsonPrimitive?.contentOrNull ?: fail()
        if (type != "highlight" && type != "bookmark") fail()

        val chapterIndex = obj["chapterIndex"]?.jsonPrimitive?.intOrNull ?: fail()
        if (chapterIndex < 0 || chapterIndex > 100_000_000) fail()

        val color = obj["color"]?.jsonPrimitive?.contentOrNull ?: fail()
        if (color !in setOf("amber", "emerald", "sapphire", "rose")) fail()

        val pageIndex = obj["pageIndex"]?.jsonPrimitive?.intOrNull
        val charOffset = obj["charOffset"]?.jsonPrimitive?.intOrNull
        val startOffset = obj["startOffset"]?.jsonPrimitive?.intOrNull
        val endOffset = obj["endOffset"]?.jsonPrimitive?.intOrNull

        if (type == "highlight") {
            if (startOffset == null || endOffset == null || startOffset < 0 || endOffset <= startOffset) {
                fail()
            }
        }

        val selectedText = obj["selectedText"]?.jsonPrimitive?.contentOrNull
        if (selectedText != null && selectedText.length > 4000) fail()

        val noteText = obj["noteText"]?.jsonPrimitive?.contentOrNull
        if (noteText != null && noteText.length > 10000) fail()

        val label = obj["label"]?.jsonPrimitive?.contentOrNull
        if (label != null && label.length > 200) fail()

        val createdAt = obj["createdAt"]?.jsonPrimitive?.contentOrNull ?: ""
        val updatedAt = obj["updatedAt"]?.jsonPrimitive?.contentOrNull ?: ""
        if (createdAt.isNotEmpty() && !isValidTimestamp(createdAt)) fail()
        if (updatedAt.isNotEmpty() && !isValidTimestamp(updatedAt)) fail()

        val anchor = (obj["anchor"] as? JsonObject)?.let { parseAnchor(it) }
        val needsReview = obj["needsReview"]?.jsonPrimitive?.booleanOrNull ?: false
        val legacySourceAnchor = obj["legacySourceAnchor"]?.jsonPrimitive?.booleanOrNull ?: false

        return AnnotationItem(
            id = id,
            bookId = bookId,
            type = type,
            chapterIndex = chapterIndex,
            pageIndex = pageIndex,
            charOffset = charOffset,
            startOffset = startOffset,
            endOffset = endOffset,
            selectedText = selectedText,
            noteText = noteText,
            label = label,
            color = color,
            anchor = anchor,
            needsReview = needsReview,
            legacySourceAnchor = legacySourceAnchor,
            createdAt = createdAt,
            updatedAt = updatedAt
        )
    }

    private fun validatePreferences(obj: JsonObject?): Map<String, JsonElement> {
        if (obj == null) fail()
        val result = mutableMapOf<String, JsonElement>()
        for ((key, value) in obj.entries) {
            if (key !in ALLOWED_PREFERENCE_KEYS) continue
            val prim = value as? JsonPrimitive ?: fail()
            if (prim.isString) {
                val s = prim.content
                if (s.length > 300) fail()
            } else if (prim.booleanOrNull == null) {
                val d = prim.doubleOrNull ?: fail()
                if (!d.isFinite() || kotlin.math.abs(d) > 10000.0) fail()
            }
            result[key] = prim
        }

        for ((key, maxVal) in listOf("glassTransparency" to 100, "glassBlur" to 40, "ambientIntensity" to 100)) {
            result[key]?.let { el ->
                val v = (el as? JsonPrimitive)?.doubleOrNull ?: fail()
                if (v < 0.0 || v > maxVal.toDouble()) fail()
            }
        }

        for ((key, allowedSet) in ENUM_PREFS) {
            result[key]?.let { el ->
                val v = (el as? JsonPrimitive)?.contentOrNull ?: fail()
                if (v !in allowedSet) fail()
            }
        }

        for (colorKey in listOf("accentColor", "customTextColor", "customBackgroundColor")) {
            result[colorKey]?.let { el ->
                val v = (el as? JsonPrimitive)?.contentOrNull ?: fail()
                if (!HEX_COLOR_REGEX.matches(v)) fail()
            }
        }

        return result
    }

    fun parseBackup(rawJson: String): BackupPayload {
        if (rawJson.toByteArray(Charsets.UTF_8).size > BACKUP_MAX_BYTES) {
            throw IllegalArgumentException("Backup is larger than 8 MB.")
        }
        val root = try {
            Json.parseToJsonElement(rawJson) as? JsonObject ?: fail()
        } catch (_: Exception) {
            fail()
        }

        val format = root["format"]?.jsonPrimitive?.contentOrNull
        val schemaVer = root["schemaVersion"]?.jsonPrimitive?.intOrNull
        val exportedAt = root["exportedAt"]?.jsonPrimitive?.contentOrNull ?: Instant.now().toString()
        val annotationsArr = root["annotations"] as? JsonArray ?: fail()

        val isV2 = format == "katakecil-backup" && schemaVer == 2
        val isV1 = format == null && schemaVer != 2 && (isValidTimestamp(root["exportedAt"]?.jsonPrimitive?.contentOrNull) || schemaVer == 1)
        if (!isV2 && !isV1) fail()

        if (annotationsArr.size > 20_000) fail()
        val progressArr = if (isV2) {
            (root["progress"] as? JsonArray ?: fail()).also {
                if (it.size > 5_000) fail()
            }
        } else {
            JsonArray(emptyList())
        }

        val annotations = annotationsArr.map { el ->
            parseAnnotation(el as? JsonObject ?: fail())
        }
        val progress = progressArr.map { el ->
            parseProgress(el as? JsonObject ?: fail())
        }

        if (annotations.map { it.id }.toSet().size != annotations.size) fail()
        if (progress.map { it.bookId }.toSet().size != progress.size) fail()

        val preferences = if (isV2) {
            validatePreferences(root["preferences"] as? JsonObject)
        } else {
            emptyMap()
        }

        return BackupPayload(
            format = "katakecil-backup",
            schemaVersion = if (isV2) 2 else 1,
            exportedAt = exportedAt,
            preferences = preferences,
            progress = progress,
            annotations = annotations
        )
    }

    fun previewBackup(rawJson: String): BackupPreview {
        val payload = parseBackup(rawJson)
        return BackupPreview(
            rawJson = rawJson,
            payload = payload,
            annotationCount = payload.annotations.size,
            progressCount = payload.progress.size,
            hasPreferences = payload.preferences.isNotEmpty()
        )
    }

    fun settingsToPreferenceMap(settings: DeviceSettings): Map<String, JsonElement> {
        return buildJsonObject {
            put("ambientIntensity", settings.ambientIntensity)
            put("glassTransparency", settings.glassTransparency)
            put("glassBlur", settings.glassBlur)
            put("uiLanguage", settings.uiLanguage)
            put("uiLanguageChosen", settings.uiLanguageChosen)
            put("uiLanguageDefaultVersion", settings.uiLanguageDefaultVersion)
            put("themeMode", settings.themeMode)
            put("accentColor", settings.accentColor)
            put("fontFamily", settings.fontFamily)
            put("fontSize", settings.fontSize)
            put("lineHeight", settings.lineHeight)
            put("fontWeight", settings.fontWeight)
            put("paragraphSpacing", settings.paragraphSpacing)
            put("letterSpacing", settings.letterSpacing)
            put("paragraphIndent", settings.paragraphIndent)
            put("textAlign", settings.textAlign)
            put("marginHorizontal", settings.marginHorizontal)
            put("marginVertical", settings.marginVertical)
            put("readerWidth", settings.readerWidth)
            put("readingMode", settings.readingMode)
            put("readerTheme", settings.readerTheme)
            put("spreadMode", settings.spreadMode)
            put("pageAnimation", settings.pageAnimation)
            put("contentPosition", settings.contentPosition)
            put("brightness", settings.brightness)
            put("tapNavigation", settings.tapNavigation)
            put("wakeLock", settings.wakeLock)
            put("orientation", settings.orientation)
            put("customTextColor", settings.customTextColor)
            put("customBackgroundColor", settings.customBackgroundColor)
            put("speedWpm", settings.speedWpm)
            put("ttsRate", settings.ttsRate)
            put("ttsVoice", settings.ttsVoice)
            put("ttsLanguage", settings.ttsLanguage)
            put("globalThemeVersion", settings.globalThemeVersion)
            put("comfortDefaultsVersion", settings.comfortDefaultsVersion)
            put("paragraphIndentVersion", settings.paragraphIndentVersion)
        }
    }

    fun applyPreferencesToSettings(current: DeviceSettings, prefs: Map<String, JsonElement>): DeviceSettings {
        if (prefs.isEmpty()) return current
        fun str(k: String, def: String) = prefs[k]?.jsonPrimitive?.contentOrNull ?: def
        fun int(k: String, def: Int) = prefs[k]?.jsonPrimitive?.intOrNull ?: def
        fun flt(k: String, def: Float) = prefs[k]?.jsonPrimitive?.floatOrNull ?: def
        fun bool(k: String, def: Boolean) = prefs[k]?.jsonPrimitive?.booleanOrNull ?: def

        return current.copy(
            ambientIntensity = int("ambientIntensity", current.ambientIntensity).coerceIn(0, 100),
            glassTransparency = int("glassTransparency", current.glassTransparency).coerceIn(0, 100),
            glassBlur = int("glassBlur", current.glassBlur).coerceIn(0, 40),
            uiLanguage = str("uiLanguage", current.uiLanguage),
            uiLanguageChosen = bool("uiLanguageChosen", current.uiLanguageChosen),
            uiLanguageDefaultVersion = int("uiLanguageDefaultVersion", current.uiLanguageDefaultVersion),
            themeMode = str("themeMode", current.themeMode),
            accentColor = str("accentColor", current.accentColor),
            fontFamily = str("fontFamily", current.fontFamily),
            fontSize = int("fontSize", current.fontSize).coerceIn(14, 28),
            lineHeight = flt("lineHeight", current.lineHeight).coerceIn(1.2f, 2.2f),
            fontWeight = int("fontWeight", current.fontWeight).coerceIn(400, 700),
            paragraphSpacing = int("paragraphSpacing", current.paragraphSpacing).coerceIn(0, 28),
            letterSpacing = flt("letterSpacing", current.letterSpacing).coerceIn(-0.03f, 0.12f),
            paragraphIndent = flt("paragraphIndent", current.paragraphIndent).coerceIn(0f, 3f),
            textAlign = str("textAlign", current.textAlign),
            marginHorizontal = int("marginHorizontal", current.marginHorizontal).coerceIn(12, 64),
            marginVertical = int("marginVertical", current.marginVertical).coerceIn(12, 72),
            readerWidth = int("readerWidth", current.readerWidth).coerceIn(520, 920),
            readingMode = str("readingMode", current.readingMode),
            readerTheme = str("readerTheme", current.readerTheme),
            spreadMode = str("spreadMode", current.spreadMode),
            pageAnimation = str("pageAnimation", current.pageAnimation),
            contentPosition = str("contentPosition", current.contentPosition),
            brightness = int("brightness", current.brightness).coerceIn(35, 100),
            tapNavigation = bool("tapNavigation", current.tapNavigation),
            wakeLock = bool("wakeLock", current.wakeLock),
            orientation = str("orientation", current.orientation),
            customTextColor = str("customTextColor", current.customTextColor),
            customBackgroundColor = str("customBackgroundColor", current.customBackgroundColor),
            speedWpm = int("speedWpm", current.speedWpm).coerceIn(100, 600),
            ttsRate = flt("ttsRate", current.ttsRate).coerceIn(0.5f, 2.0f),
            ttsVoice = str("ttsVoice", current.ttsVoice),
            ttsLanguage = str("ttsLanguage", current.ttsLanguage),
            globalThemeVersion = int("globalThemeVersion", current.globalThemeVersion),
            comfortDefaultsVersion = int("comfortDefaultsVersion", current.comfortDefaultsVersion),
            paragraphIndentVersion = int("paragraphIndentVersion", current.paragraphIndentVersion),
            updatedAt = Instant.now().toString()
        )
    }

    fun createBackupJson(
        settings: DeviceSettings,
        progress: Collection<ReadingProgress>,
        annotations: List<AnnotationItem>
    ): String {
        val payload = BackupPayload(
            format = "katakecil-backup",
            schemaVersion = 2,
            exportedAt = Instant.now().toString(),
            preferences = settingsToPreferenceMap(settings),
            progress = progress.toList(),
            annotations = annotations
        )
        val raw = prettyJson.encodeToString(BackupPayload.serializer(), payload)
        parseBackup(raw) // Verify round-trip validity
        return raw
    }

    fun createNotesExportJson(annotations: List<AnnotationItem>): String {
        val obj = buildJsonObject {
            put("schemaVersion", 1)
            put("exportedAt", Instant.now().toString())
            put("annotations", buildJsonArray {
                for (item in annotations) {
                    add(prettyJson.encodeToJsonElement(AnnotationItem.serializer(), item))
                }
            })
        }
        return prettyJson.encodeToString(JsonObject.serializer(), obj)
    }
}
