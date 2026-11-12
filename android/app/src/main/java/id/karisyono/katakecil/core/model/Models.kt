package id.karisyono.katakecil.core.model

import kotlinx.serialization.Serializable
import java.util.UUID

@Serializable
data class DeviceSettings(
    val deviceId: String = "dev_${UUID.randomUUID()}",
    val uiLanguage: String = "id",
    val uiLanguageChosen: Boolean = false,
    val uiLanguageDefaultVersion: Int = 2,
    val themeMode: String = "light",
    val accentColor: String = "#54756c",
    val fontFamily: String = "Lora",
    val fontSize: Int = 19,
    val lineHeight: Float = 1.6f,
    val fontWeight: Int = 400,
    val paragraphSpacing: Int = 6,
    val letterSpacing: Float = 0f,
    val paragraphIndent: Float = 1.5f,
    val textAlign: String = "justify",
    val marginHorizontal: Int = 24,
    val marginVertical: Int = 22,
    val readerWidth: Int = 720,
    val readingMode: String = "pages",
    val readerTheme: String = "follow",
    val spreadMode: String = "single",
    val pageAnimation: String = "fade",
    val contentPosition: String = "top",
    val brightness: Int = 100,
    val tapNavigation: Boolean = true,
    val wakeLock: Boolean = false,
    val orientation: String = "auto",
    val customTextColor: String = "#28302b",
    val customBackgroundColor: String = "#faf9f5",
    val speedWpm: Int = 250,
    val ttsRate: Float = 1.0f,
    val ttsVoice: String = "",
    val ttsLanguage: String = "id-ID",
    val glassTransparency: Int = 75,
    val glassBlur: Int = 20,
    val ambientIntensity: Int = 60,
    val globalThemeVersion: Int = 2,
    val comfortDefaultsVersion: Int = 2,
    val paragraphIndentVersion: Int = 2,
    val updatedAt: String = ""
)

@Serializable
data class TextQuoteAnchor(
    val episodeId: String,
    val exact: String,
    val prefix: String = "",
    val suffix: String = "",
    val start: Int,
    val end: Int,
    val sourceHash: String? = null
)

@Serializable
data class TtsCheckpoint(
    val chapterIndex: Int,
    val charOffset: Int
)

@Serializable
data class ReadingProgress(
    val bookId: String,
    val chapterIndex: Int = 0,
    val charOffset: Int = 0,
    val pageIndex: Int = 0,
    val totalPages: Int = 1,
    val totalChapters: Int = 1,
    val percentage: Double = 0.0,
    val anchor: TextQuoteAnchor? = null,
    val needsReview: Boolean = false,
    val legacySourceAnchor: Boolean = false,
    val tts: TtsCheckpoint? = null,
    val updatedAt: String = ""
)

@Serializable
data class AnnotationItem(
    val id: String,
    val bookId: String,
    val type: String, // "highlight" or "bookmark"
    val chapterIndex: Int,
    val pageIndex: Int? = null,
    val charOffset: Int? = null,
    val startOffset: Int? = null,
    val endOffset: Int? = null,
    val selectedText: String? = null,
    val noteText: String? = null,
    val label: String? = null,
    val color: String = "amber", // "amber", "emerald", "sapphire", "rose"
    val anchor: TextQuoteAnchor? = null,
    val needsReview: Boolean = false,
    val legacySourceAnchor: Boolean = false,
    val createdAt: String = "",
    val updatedAt: String = ""
)

@Serializable
data class AnnotationTombstone(
    val id: String,
    val bookId: String = "",
    val deletedAt: String
)

@Serializable
data class Chapter(
    val index: Int = 0,
    val id: String,
    val title: String,
    val navigationTitle: String = title,
    val chapterLabel: String = "",
    val arc: String = "",
    val href: String = "",
    val text: String = "",
    val paragraphs: List<String> = emptyList(),
    val contentHash: String = "",
    val length: Int = text.length
)

@Serializable
data class BookMeta(
    val id: String,
    val title: String,
    val author: String = "Penulis Tidak Diketahui",
    val language: String = "id",
    val coverUrl: String = "",
    val revision: String = "",
    val sectionIds: List<String> = emptyList(),
    val source: String = "published", // "published" or "local"
    val chapterCount: Int = 0,
    val customCoverDataUrl: String = "",
    val originalCoverDataUrl: String = "",
    val sizeBytes: Long = 0L,
    val parserRevision: Int = 8,
    val sha256: String = "",
    val importedAt: String = "",
    val updatedAt: String = ""
) {
    val effectiveCover: String
        get() = when {
            customCoverDataUrl.isNotBlank() -> customCoverDataUrl
            coverUrl.isNotBlank() -> coverUrl
            originalCoverDataUrl.isNotBlank() -> originalCoverDataUrl
            else -> ""
        }
}

@Serializable
data class LocalBookRecord(
    val meta: BookMeta,
    val chapters: List<Chapter>
)

data class PageSlice(
    val pageIndex: Int,
    val chapterIndex: Int,
    val start: Int,
    val end: Int,
    val text: String
)

data class SearchMatch(
    val index: Int,
    val start: Int,
    val end: Int,
    val matchText: String,
    val snippet: String,
    val pageIndex: Int = 0
)

data class DictionaryDefinition(
    val definition: String,
    val example: String = ""
)

data class DictionaryMeaning(
    val partOfSpeech: String,
    val definitions: List<DictionaryDefinition>
)

data class DictionaryResult(
    val word: String,
    val phonetic: String = "",
    val language: String = "id",
    val meanings: List<DictionaryMeaning> = emptyList(),
    val sourceLabel: String = "",
    val licenseLabel: String = "",
    val sourceUrl: String = ""
)

data class TranslationResult(
    val sourceText: String,
    val translatedText: String,
    val sourceLanguage: String,
    val targetLanguage: String,
    val providerLabel: String = "MyMemory"
)

data class UpdateReleaseInfo(
    val status: String, // "up-to-date", "update-available", "ahead", "no-releases"
    val currentVersion: String,
    val currentVersionCode: Int,
    val latestVersion: String = "",
    val latestTag: String = "",
    val releaseTitle: String = "",
    val releaseNotes: String = "",
    val publishedAt: String = "",
    val prerelease: Boolean = false,
    val assetName: String = "",
    val assetUrl: String = "",
    val assetSize: Long = 0L,
    val expectedSha256: String = "",
    val checksumUrl: String = "",
    val htmlUrl: String = ""
)

data class DownloadedUpdateState(
    val filePath: String,
    val fileName: String,
    val version: String,
    val versionCode: Int,
    val sha256: String,
    val canInstallPackages: Boolean
)

@Serializable
data class BackupPayload(
    val format: String = "katakecil-backup",
    val schemaVersion: Int = 2,
    val exportedAt: String,
    val preferences: Map<String, kotlinx.serialization.json.JsonElement> = emptyMap(),
    val progress: List<ReadingProgress> = emptyList(),
    val annotations: List<AnnotationItem> = emptyList()
)

data class BackupPreview(
    val rawJson: String,
    val payload: BackupPayload,
    val annotationCount: Int,
    val progressCount: Int,
    val hasPreferences: Boolean
)

data class ImportEpubPreview(
    val fileName: String,
    val sizeBytes: Long,
    val rawBytes: ByteArray,
    val record: LocalBookRecord,
    val alreadyExists: Boolean
)
