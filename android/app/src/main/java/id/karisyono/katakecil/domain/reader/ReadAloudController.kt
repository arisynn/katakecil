package id.karisyono.katakecil.domain.reader

import android.content.Context
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.speech.tts.Voice
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.util.Locale

/**
 * Native Kotlin implementation of src/reader/speech.ts & KataKecilDevicePlugin.java TTS logic.
 * Directly manages Android's TextToSpeech engine, splits paragraphs > 4,000 characters on word
 * boundaries while highlighting the full active paragraph on the reading page, and supports
 * voice selection, rate control, checkpointing, and automatic next-episode advancement.
 */
class ReadAloudController(
    context: Context,
    private val onParagraphChanged: (chapterIndex: Int, charOffset: Int) -> Unit = { _, _ -> },
    private val onEpisodeCompleted: (chapterIndex: Int) -> Unit = {}
) {
    companion object {
        const val MAX_TTS_CHUNK_CHARS = 4_000
    }

    data class TtsVoiceInfo(
        val id: String,
        val name: String,
        val languageTag: String,
        val isLocal: Boolean
    )

    data class ParagraphUtterance(
        val paragraphIndex: Int,
        val paragraphStartOffset: Int,
        val paragraphEndOffset: Int,
        val chunkText: String
    )

    data class TtsState(
        val isInitialized: Boolean = false,
        val isPlaying: Boolean = false,
        val isPaused: Boolean = false,
        val chapterIndex: Int = 0,
        val paragraphIndex: Int = 0,
        val totalParagraphs: Int = 0,
        val highlightStartOffset: Int = -1,
        val highlightEndOffset: Int = -1,
        val currentParagraphPreview: String = "",
        val rate: Float = 1.0f,
        val selectedVoiceId: String = "",
        val selectedLanguage: String = "id-ID",
        val availableVoices: List<TtsVoiceInfo> = emptyList()
    )

    private val appContext = context.applicationContext
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)
    private var tts: TextToSpeech? = null
    private var utterances: List<ParagraphUtterance> = emptyList()
    private var currentUtteranceIdx: Int = 0
    private var activeChapterText: String = ""

    private val _state = MutableStateFlow(TtsState())
    val state: StateFlow<TtsState> = _state.asStateFlow()

    init {
        initEngine()
    }

    private fun initEngine() {
        tts = TextToSpeech(appContext) { status ->
            if (status == TextToSpeech.SUCCESS) {
                setupListener()
                refreshVoices()
            }
        }
    }

    private fun setupListener() {
        tts?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
            override fun onStart(utteranceId: String?) {}

            override fun onDone(utteranceId: String?) {
                scope.launch {
                    advanceToNextUtterance()
                }
            }

            @Deprecated("Deprecated in Java")
            override fun onError(utteranceId: String?) {
                scope.launch {
                    advanceToNextUtterance()
                }
            }

            override fun onError(utteranceId: String?, errorCode: Int) {
                scope.launch {
                    advanceToNextUtterance()
                }
            }
        })
    }

    fun refreshVoices() {
        val engine = tts ?: return
        val voiceList = runCatching {
            engine.voices?.mapNotNull { v ->
                val locTag = v.locale?.toLanguageTag() ?: return@mapNotNull null
                TtsVoiceInfo(
                    id = v.name,
                    name = formatVoiceDisplayName(v),
                    languageTag = locTag,
                    isLocal = !v.isNetworkConnectionRequired
                )
            }?.sortedWith(
                compareByDescending<TtsVoiceInfo> { it.isLocal }
                    .thenBy { it.languageTag }
                    .thenBy { it.name }
            ) ?: emptyList()
        }.getOrDefault(emptyList())

        _state.value = _state.value.copy(
            isInitialized = true,
            availableVoices = voiceList
        )
    }

    private fun formatVoiceDisplayName(v: Voice): String {
        val langDisplay = v.locale?.displayName ?: v.locale?.toLanguageTag() ?: "Voice"
        val shortName = v.name.substringAfterLast('#').substringAfterLast('-').uppercase()
        return "$langDisplay · $shortName"
    }

    fun startReading(
        chapterIndex: Int,
        chapterText: String,
        startCharOffset: Int = 0,
        rate: Float = _state.value.rate,
        voiceId: String = _state.value.selectedVoiceId,
        languageTag: String = _state.value.selectedLanguage
    ) {
        if (chapterText.isBlank()) return
        activeChapterText = chapterText
        utterances = buildUtterancesForText(chapterText)
        if (utterances.isEmpty()) return

        val startIdx = utterances.indexOfFirst { it.paragraphEndOffset > startCharOffset }
            .let { if (it >= 0) it else 0 }
        currentUtteranceIdx = startIdx

        _state.value = _state.value.copy(
            chapterIndex = chapterIndex,
            rate = rate.coerceIn(0.5f, 2.0f),
            selectedVoiceId = voiceId,
            selectedLanguage = languageTag,
            totalParagraphs = (utterances.maxOfOrNull { it.paragraphIndex } ?: 0) + 1
        )

        speakCurrentUtterance()
    }

    private fun speakCurrentUtterance() {
        val engine = tts ?: return
        if (currentUtteranceIdx !in utterances.indices) {
            val completedChapter = _state.value.chapterIndex
            stop()
            onEpisodeCompleted(completedChapter)
            return
        }

        val item = utterances[currentUtteranceIdx]
        val s = _state.value
        engine.setSpeechRate(s.rate.coerceIn(0.5f, 2.0f))

        val targetVoice = runCatching {
            engine.voices?.firstOrNull { it.name == s.selectedVoiceId }
        }.getOrNull()

        if (targetVoice != null) {
            engine.voice = targetVoice
        } else if (s.selectedLanguage.isNotBlank()) {
            engine.language = Locale.forLanguageTag(s.selectedLanguage)
        }

        val preview = activeChapterText
            .substring(
                item.paragraphStartOffset.coerceIn(0, activeChapterText.length),
                item.paragraphEndOffset.coerceIn(0, activeChapterText.length)
            )
            .replace(Regex("\\s+"), " ")
            .trim()

        _state.value = s.copy(
            isPlaying = true,
            isPaused = false,
            paragraphIndex = item.paragraphIndex,
            highlightStartOffset = item.paragraphStartOffset,
            highlightEndOffset = item.paragraphEndOffset,
            currentParagraphPreview = preview
        )

        onParagraphChanged(s.chapterIndex, item.paragraphStartOffset)

        val params = Bundle()
        engine.speak(
            item.chunkText,
            TextToSpeech.QUEUE_FLUSH,
            params,
            "kk_utt_${s.chapterIndex}_$currentUtteranceIdx"
        )
    }

    private fun advanceToNextUtterance() {
        if (!_state.value.isPlaying) return
        currentUtteranceIdx++
        if (currentUtteranceIdx < utterances.size) {
            speakCurrentUtterance()
        } else {
            val finishedChapter = _state.value.chapterIndex
            _state.value = _state.value.copy(
                isPlaying = false,
                isPaused = false,
                highlightStartOffset = -1,
                highlightEndOffset = -1
            )
            onEpisodeCompleted(finishedChapter)
        }
    }

    fun pause() {
        tts?.stop()
        if (_state.value.isPlaying) {
            _state.value = _state.value.copy(
                isPlaying = false,
                isPaused = true
            )
        }
    }

    fun resume() {
        if (utterances.isNotEmpty() && currentUtteranceIdx in utterances.indices) {
            speakCurrentUtterance()
        }
    }

    fun stop() {
        tts?.stop()
        _state.value = _state.value.copy(
            isPlaying = false,
            isPaused = false,
            highlightStartOffset = -1,
            highlightEndOffset = -1,
            currentParagraphPreview = ""
        )
    }

    fun previousParagraph() {
        if (utterances.isEmpty()) return
        val currentPara = utterances.getOrNull(currentUtteranceIdx)?.paragraphIndex ?: 0
        val targetPara = (currentPara - 1).coerceAtLeast(0)
        val newIdx = utterances.indexOfFirst { it.paragraphIndex == targetPara }
        if (newIdx >= 0) {
            currentUtteranceIdx = newIdx
            speakCurrentUtterance()
        }
    }

    fun nextParagraph() {
        if (utterances.isEmpty()) return
        val currentPara = utterances.getOrNull(currentUtteranceIdx)?.paragraphIndex ?: 0
        val newIdx = utterances.indexOfFirst { it.paragraphIndex > currentPara }
        if (newIdx >= 0) {
            currentUtteranceIdx = newIdx
            speakCurrentUtterance()
        } else {
            val finishedChapter = _state.value.chapterIndex
            stop()
            onEpisodeCompleted(finishedChapter)
        }
    }

    fun setRate(rate: Float) {
        val clamped = rate.coerceIn(0.5f, 2.0f)
        _state.value = _state.value.copy(rate = clamped)
        if (_state.value.isPlaying) {
            speakCurrentUtterance()
        }
    }

    fun setVoice(voiceId: String, languageTag: String) {
        _state.value = _state.value.copy(
            selectedVoiceId = voiceId,
            selectedLanguage = languageTag
        )
        if (_state.value.isPlaying) {
            speakCurrentUtterance()
        }
    }

    fun shutdown() {
        runCatching {
            tts?.stop()
            tts?.shutdown()
        }
        tts = null
    }

    companion object UtteranceBuilder {
        fun buildUtterancesForText(text: String): List<ParagraphUtterance> {
            if (text.isBlank()) return emptyList()
            val result = mutableListOf<ParagraphUtterance>()
            val paraRegex = Regex("[^\\n]+(?:\\n(?!\\s*\\n)[^\\n]+)*")
            var paraIdx = 0

            for (match in paraRegex.findAll(text)) {
                val pStart = match.range.first
                val pEnd = match.range.last + 1
                val pText = match.value.trim()
                if (pText.isEmpty()) continue

                val chunks = splitLongParagraph(pText, MAX_TTS_CHUNK_CHARS)
                for (chunk in chunks) {
                    result.add(
                        ParagraphUtterance(
                            paragraphIndex = paraIdx,
                            paragraphStartOffset = pStart,
                            paragraphEndOffset = pEnd,
                            chunkText = chunk
                        )
                    )
                }
                paraIdx++
            }
            return result
        }

        fun splitLongParagraph(paragraph: String, maxChars: Int = MAX_TTS_CHUNK_CHARS): List<String> {
            if (paragraph.length <= maxChars) return listOf(paragraph)
            val chunks = mutableListOf<String>()
            var cursor = 0
            while (cursor < paragraph.length) {
                val remaining = paragraph.length - cursor
                if (remaining <= maxChars) {
                    val tail = paragraph.substring(cursor).trim()
                    if (tail.isNotEmpty()) chunks.add(tail)
                    break
                }
                val limit = cursor + maxChars
                val breakPos = paragraph.lastIndexOf(' ', limit)
                val splitEnd = if (breakPos > cursor + maxChars / 2) breakPos else limit
                val slice = paragraph.substring(cursor, splitEnd).trim()
                if (slice.isNotEmpty()) {
                    chunks.add(slice)
                }
                cursor = splitEnd
                while (cursor < paragraph.length && paragraph[cursor].isWhitespace()) {
                    cursor++
                }
            }
            return chunks
        }
    }
}
