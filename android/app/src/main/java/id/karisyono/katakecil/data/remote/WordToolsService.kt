package id.karisyono.katakecil.data.remote

import id.karisyono.katakecil.core.model.DictionaryDefinition
import id.karisyono.katakecil.core.model.DictionaryMeaning
import id.karisyono.katakecil.core.model.DictionaryResult
import id.karisyono.katakecil.core.model.TranslationResult
import id.karisyono.katakecil.data.epub.EpubParser
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Port of src/reader/tools.ts.
 * Provides online dictionary lookup (Free Dictionary API for English, Indonesian Wiktionary MediaWiki API
 * for Bahasa Indonesia) and passage translation via MyMemory (up to 450 UTF-8 bytes).
 */
object WordToolsService {
    const val MAX_TRANSLATE_UTF8_BYTES = 450

    val SupportedLanguages = listOf(
        "id" to "Bahasa Indonesia",
        "en" to "English",
        "es" to "Español",
        "fr" to "Français",
        "de" to "Deutsch",
        "ja" to "日本語",
        "ko" to "한국어",
        "zh" to "中文"
    )

    fun extractTargetWord(rawSelection: String): String {
        val cleaned = rawSelection.trim()
            .replace(Regex("^[\\p{Punct}“”‘’\"'()\\[\\]{}]+|[\\p{Punct}“”‘’\"'()\\[\\]{}]+$"), "")
        val firstToken = cleaned.split(Regex("\\s+")).firstOrNull() ?: ""
        return firstToken.replace(Regex("^[\\p{Punct}“”‘’]+|[\\p{Punct}“”‘’]+$"), "").lowercase()
    }

    suspend fun lookupWord(rawText: String, preferredLanguage: String = "id"): DictionaryResult =
        withContext(Dispatchers.IO) {
            val word = extractTargetWord(rawText)
            if (word.isEmpty()) {
                throw IllegalArgumentException("Pilih satu kata untuk mencari arti di kamus.")
            }
            val lang = if (preferredLanguage.lowercase().startsWith("en")) "en" else "id"
            if (lang == "id") {
                val idResult = runCatching { lookupIndonesianWiktionary(word) }.getOrNull()
                if (idResult != null && idResult.meanings.isNotEmpty()) {
                    return@withContext idResult
                }
                val enFallback = runCatching { lookupEnglishDictionary(word) }.getOrNull()
                if (enFallback != null && enFallback.meanings.isNotEmpty()) {
                    return@withContext enFallback
                }
                throw IllegalStateException("Definisi untuk \"$word\" tidak ditemukan.")
            } else {
                val enResult = runCatching { lookupEnglishDictionary(word) }.getOrNull()
                if (enResult != null && enResult.meanings.isNotEmpty()) {
                    return@withContext enResult
                }
                val idFallback = runCatching { lookupIndonesianWiktionary(word) }.getOrNull()
                if (idFallback != null && idFallback.meanings.isNotEmpty()) {
                    return@withContext idFallback
                }
                throw IllegalStateException("Definition for \"$word\" was not found.")
            }
        }

    private fun lookupEnglishDictionary(word: String): DictionaryResult {
        val encoded = URLEncoder.encode(word, "UTF-8")
        val url = "https://api.dictionaryapi.dev/api/v2/entries/en/$encoded"
        val (status, body) = getHttp(url)
        if (status !in 200..299) {
            throw IllegalStateException("Word not found ($status)")
        }
        val arr = Json.parseToJsonElement(body) as? JsonArray
            ?: throw IllegalStateException("Invalid dictionary response")
        val first = arr.firstOrNull() as? JsonObject
            ?: throw IllegalStateException("Empty dictionary response")

        val headword = first["word"]?.jsonPrimitive?.contentOrNull ?: word
        val phonetic = first["phonetic"]?.jsonPrimitive?.contentOrNull
            ?: (first["phonetics"] as? JsonArray)
                ?.mapNotNull { (it as? JsonObject)?.get("text")?.jsonPrimitive?.contentOrNull }
                ?.firstOrNull { it.isNotBlank() }
            ?: ""

        val meaningsArr = first["meanings"] as? JsonArray ?: JsonArray(emptyList())
        val meanings = meaningsArr.mapNotNull { mEl ->
            val mObj = mEl as? JsonObject ?: return@mapNotNull null
            val pos = mObj["partOfSpeech"]?.jsonPrimitive?.contentOrNull ?: "kata"
            val defsArr = mObj["definitions"] as? JsonArray ?: JsonArray(emptyList())
            val defs = defsArr.take(5).mapNotNull { dEl ->
                val dObj = dEl as? JsonObject ?: return@mapNotNull null
                val defText = dObj["definition"]?.jsonPrimitive?.contentOrNull?.trim() ?: return@mapNotNull null
                val exText = dObj["example"]?.jsonPrimitive?.contentOrNull?.trim() ?: ""
                DictionaryDefinition(definition = defText, example = exText)
            }
            if (defs.isEmpty()) null else DictionaryMeaning(partOfSpeech = pos, definitions = defs)
        }

        val sourceUrl = (first["sourceUrls"] as? JsonArray)
            ?.firstOrNull()?.jsonPrimitive?.contentOrNull
            ?: "https://en.wiktionary.org/wiki/$encoded"

        return DictionaryResult(
            word = headword,
            phonetic = phonetic,
            language = "en",
            meanings = meanings,
            sourceLabel = "Free Dictionary API · Wiktionary",
            licenseLabel = "CC BY-SA 3.0 / 4.0",
            sourceUrl = sourceUrl
        )
    }

    private fun lookupIndonesianWiktionary(word: String): DictionaryResult {
        val encoded = URLEncoder.encode(word, "UTF-8")
        val url = "https://id.wiktionary.org/w/api.php?action=parse&page=$encoded&prop=text&format=json&origin=*"
        val (status, body) = getHttp(url)
        if (status !in 200..299) {
            throw IllegalStateException("Kata tidak ditemukan ($status)")
        }
        val root = Json.parseToJsonElement(body).jsonObject
        val parseObj = root["parse"] as? JsonObject
            ?: throw IllegalStateException("Kata belum tersedia di Wikikamus")
        val textObj = parseObj["text"] as? JsonObject
        val html = textObj?.get("*")?.jsonPrimitive?.contentOrNull ?: ""
        if (html.isBlank()) {
            throw IllegalStateException("Definisi kosong")
        }

        // Extract <ol><li>...</li></ol> definitions cleanly
        val listItems = mutableListOf<DictionaryDefinition>()
        val olRegex = Regex("<ol[^>]*>([\\s\\S]*?)</ol>", RegexOption.IGNORE_CASE)
        val liRegex = Regex("<li[^>]*>([\\s\\S]*?)</li>", RegexOption.IGNORE_CASE)
        for (olMatch in olRegex.findAll(html)) {
            val olContent = olMatch.groupValues[1]
            for (liMatch in liRegex.findAll(olContent)) {
                val rawLi = liMatch.groupValues[1]
                    .replace(Regex("<ul[\\s\\S]*?</ul>", RegexOption.IGNORE_CASE), "")
                    .replace(Regex("<dl[\\s\\S]*?</dl>", RegexOption.IGNORE_CASE), "")
                    .replace(Regex("<[^>]+>"), " ")
                val cleanDef = EpubParser.decodeHtmlEntities(rawLi)
                    .replace(Regex("\\s+"), " ")
                    .trim()
                if (cleanDef.length >= 3 && listItems.size < 6) {
                    listItems.add(DictionaryDefinition(definition = cleanDef))
                }
            }
            if (listItems.size >= 6) break
        }

        if (listItems.isEmpty()) {
            throw IllegalStateException("Definisi tidak ditemukan")
        }

        return DictionaryResult(
            word = word,
            phonetic = "",
            language = "id",
            meanings = listOf(
                DictionaryMeaning(
                    partOfSpeech = "Bahasa Indonesia",
                    definitions = listItems
                )
            ),
            sourceLabel = "Wiktionary Bahasa Indonesia",
            licenseLabel = "CC BY-SA 4.0",
            sourceUrl = "https://id.wiktionary.org/wiki/$encoded"
        )
    }

    suspend fun translatePassage(
        rawText: String,
        sourceLang: String,
        targetLang: String
    ): TranslationResult = withContext(Dispatchers.IO) {
        val trimmed = rawText.trim().replace(Regex("\\s+"), " ")
        if (trimmed.isEmpty()) {
            throw IllegalArgumentException("Teks untuk diterjemahkan masih kosong.")
        }
        if (sourceLang == targetLang) {
            return@withContext TranslationResult(
                sourceText = trimmed,
                translatedText = trimmed,
                sourceLanguage = sourceLang,
                targetLanguage = targetLang
            )
        }

        val cappedText = capUtf8Bytes(trimmed, MAX_TRANSLATE_UTF8_BYTES)
        val encodedText = URLEncoder.encode(cappedText, "UTF-8")
        val langPair = URLEncoder.encode("$sourceLang|$targetLang", "UTF-8")
        val url = "https://api.mymemory.translated.net/get?q=$encodedText&langpair=$langPair"
        val (status, body) = getHttp(url)
        if (status !in 200..299) {
            throw IllegalStateException("Layanan terjemahan gagal merespons ($status).")
        }

        val root = Json.parseToJsonElement(body).jsonObject
        val responseData = root["responseData"] as? JsonObject
        val translated = responseData?.get("translatedText")?.jsonPrimitive?.contentOrNull
            ?.let { EpubParser.decodeHtmlEntities(it).trim() }
            ?: ""
        if (translated.isEmpty()) {
            throw IllegalStateException("Terjemahan tidak tersedia untuk kutipan ini.")
        }

        TranslationResult(
            sourceText = cappedText,
            translatedText = translated,
            sourceLanguage = sourceLang,
            targetLanguage = targetLang,
            providerLabel = "MyMemory"
        )
    }

    fun capUtf8Bytes(text: String, maxBytes: Int): String {
        val bytes = text.toByteArray(Charsets.UTF_8)
        if (bytes.size <= maxBytes) return text
        var end = text.length
        while (end > 0 && text.substring(0, end).toByteArray(Charsets.UTF_8).size > maxBytes) {
            val prevSpace = text.lastIndexOf(' ', end - 1)
            end = if (prevSpace > end / 2) prevSpace else end - 1
        }
        return text.substring(0, end).trim()
    }

    private fun getHttp(urlString: String): Pair<Int, String> {
        val conn = (URL(urlString).openConnection() as HttpURLConnection).apply {
            requestMethod = "GET"
            connectTimeout = 12_000
            readTimeout = 15_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("User-Agent", "KataKecil/1.2.3 (https://github.com/arisynn/katakecil)")
        }
        val status = conn.responseCode
        val stream = if (status in 200..299) conn.inputStream else conn.errorStream
        val text = if (stream != null) {
            BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { it.readText() }
        } else ""
        return status to text
    }
}
