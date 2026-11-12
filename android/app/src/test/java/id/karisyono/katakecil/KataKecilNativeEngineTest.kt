package id.karisyono.katakecil

import androidx.compose.ui.graphics.Color
import id.karisyono.katakecil.core.model.AnnotationItem
import id.karisyono.katakecil.core.model.DeviceSettings
import id.karisyono.katakecil.core.model.ReadingProgress
import id.karisyono.katakecil.core.theme.KataKecilThemeTokens
import id.karisyono.katakecil.data.epub.EpubParser
import id.karisyono.katakecil.data.storage.BackupManager
import id.karisyono.katakecil.domain.reader.EpisodeSearchEngine
import id.karisyono.katakecil.domain.reader.Paginator
import id.karisyono.katakecil.domain.reader.ReadAloudController
import id.karisyono.katakecil.domain.reader.SpeedReaderEngine
import id.karisyono.katakecil.domain.reader.TextAnchorEngine
import id.karisyono.katakecil.ui.library.ShelfCarouselMath
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertTrue
import org.junit.Test

class KataKecilNativeEngineTest {

    @Test
    fun textAnchorEngineResolvesMovedQuotesAndFlagsAmbiguousChanges() {
        val original = "Pagi itu hujan turun perlahan di halaman rumah tua. Senja datang membawa kenangan lama."
        val start = original.indexOf("rumah tua")
        val end = start + "rumah tua".length
        val anchor = TextAnchorEngine.makeAnchor(
            episodeId = "ep-1",
            text = original,
            start = start,
            end = end
        )
        assertNotNull(anchor)

        val edited = "Bab Pembuka.\n\nPagi itu hujan turun perlahan di halaman rumah tua. Senja datang membawa kenangan lama."
        val resolved = TextAnchorEngine.resolveAnchor(
            text = edited,
            anchor = anchor!!,
            currentHash = TextAnchorEngine.sha256Hex(edited)
        )
        assertTrue(resolved.moved)
        assertFalse(resolved.needsReview)
        assertEquals("rumah tua", edited.substring(resolved.start, resolved.end))
    }

    @Test
    fun backupManagerRoundTripsSchemaV2AndAcceptsSchemaV1() {
        val settings = DeviceSettings(
            themeMode = "sepia",
            accentColor = "#54756c",
            fontSize = 20,
            glassTransparency = 75,
            glassBlur = 20,
            ambientIntensity = 60
        )
        val progress = listOf(
            ReadingProgress(
                bookId = "apa-itu-rumah",
                chapterIndex = 2,
                charOffset = 140,
                pageIndex = 1,
                totalPages = 5,
                totalChapters = 10,
                percentage = 25.0,
                updatedAt = "2026-11-05T10:00:00Z"
            )
        )
        val annotations = listOf(
            AnnotationItem(
                id = "hl_1",
                bookId = "apa-itu-rumah",
                type = "highlight",
                chapterIndex = 2,
                startOffset = 10,
                endOffset = 25,
                selectedText = "kata yang indah",
                noteText = "Catatan penting",
                color = "amber",
                createdAt = "2026-11-05T10:00:00Z",
                updatedAt = "2026-11-05T10:05:00Z"
            )
        )

        val rawBackup = BackupManager.createBackupJson(settings, progress, annotations)
        val parsed = BackupManager.parseBackup(rawBackup)
        assertEquals(2, parsed.schemaVersion)
        assertEquals(1, parsed.progress.size)
        assertEquals(1, parsed.annotations.size)
        assertEquals("kata yang indah", parsed.annotations[0].selectedText)

        val rawNotesV1 = BackupManager.createNotesExportJson(annotations)
        val parsedV1 = BackupManager.parseBackup(rawNotesV1)
        assertEquals(1, parsedV1.schemaVersion)
        assertEquals(1, parsedV1.annotations.size)
    }

    @Test
    fun speedReaderEngineComputesOrpPivotAndDelays() {
        assertEquals("k", SpeedReaderEngine.focusParts("k").pivot)
        assertEquals("a", SpeedReaderEngine.focusParts("kata").pivot)
        assertEquals("m", SpeedReaderEngine.focusParts("membaca").pivot)

        val tokens = SpeedReaderEngine.tokenizeEpisode("Halo dunia. Ini paragraf pertama.\n\nParagraf kedua dimulai.")
        assertEquals(7, tokens.size)
        assertTrue(tokens[4].paragraphBreakAfter)

        val normalDelay = SpeedReaderEngine.speedWordDelayMs(tokens[0], 300)
        val sentenceDelay = SpeedReaderEngine.speedWordDelayMs(tokens[1], 300)
        val paraDelay = SpeedReaderEngine.speedWordDelayMs(tokens[4], 300)
        assertTrue(sentenceDelay > normalDelay)
        assertTrue(paraDelay > sentenceDelay)
    }

    @Test
    fun paginatorSplitsTextCleanlyOnWordBoundaries() {
        val sample = (1..40).joinToString(" ") { "Paragraf-$it memiliki kalimat cerita yang cukup panjang." }
        val pages = Paginator.paginateChapterToFit(
            chapterIndex = 0,
            text = sample,
            maxCharsHint = 300
        ) { candidate, _, _ ->
            candidate.length <= 260
        }
        assertTrue(pages.size >= 4)
        assertEquals(0, pages.first().start)
        assertEquals(sample.length, pages.last().end)
    }

    @Test
    fun episodeSearchFindsCaseInsensitiveMatches() {
        val text = "Rumah adalah tempat pulang. Di dalam rumah itu ada cerita tentang RUMAH kita."
        val matches = EpisodeSearchEngine.searchInEpisode(text, "rumah")
        assertEquals(3, matches.size)
        assertEquals(0, matches[0].start)
    }

    @Test
    fun readAloudSplitsLongParagraphsAbove4000Chars() {
        val longPara = (1..900).joinToString(" ") { "kata$it" }
        assertTrue(longPara.length > 4000)
        val chunks = ReadAloudController.splitLongParagraph(longPara, 4000)
        assertTrue(chunks.size >= 2)
        assertTrue(chunks.all { it.length <= 4000 })
    }

    @Test
    fun epubParserValidatesSafeArchivePaths() {
        assertTrue(EpubParser.isSafeArchivePath("OEBPS/Text/chapter1.xhtml"))
        assertFalse(EpubParser.isSafeArchivePath("../secret.txt"))
        assertFalse(EpubParser.isSafeArchivePath("/etc/passwd"))
        assertFalse(EpubParser.isSafeArchivePath("C:\\Windows\\win.ini"))
    }

    @Test
    fun wcagContrastValidationProtectsCustomThemeReadability() {
        val highContrast = KataKecilThemeTokens.contrastRatio(Color(0xFF1F2933), Color(0xFFF7F4EB))
        val lowContrast = KataKecilThemeTokens.contrastRatio(Color(0xFFEEEEEE), Color(0xFFF5F5F5))
        assertTrue(highContrast >= 4.5)
        assertTrue(lowContrast < 4.5)
    }

    @Test
    fun shelfCarouselRingDistanceWrapsCorrectly() {
        assertEquals(-1f, ShelfCarouselMath.ringDistance(4f, 0f, 5), 0.001f)
        assertEquals(1f, ShelfCarouselMath.ringDistance(0f, 4f, 5), 0.001f)
    }
}
