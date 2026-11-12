package id.karisyono.katakecil.data.remote

import id.karisyono.katakecil.core.model.BookMeta
import id.karisyono.katakecil.core.model.Chapter
import id.karisyono.katakecil.domain.reader.TextAnchorEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.JsonArray
import kotlinx.serialization.json.JsonElement
import kotlinx.serialization.json.JsonObject
import kotlinx.serialization.json.contentOrNull
import kotlinx.serialization.json.intOrNull
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import java.io.BufferedReader
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder

/**
 * Native Kotlin implementation of src/reader/source.ts (PublishedReader Protocol v2).
 * Fetches catalog, establishes anonymous reader sessions, loads chapter manifests without body text,
 * and streams one verified episode at a time in memory without persisting published book text to disk.
 */
class PublishedReaderClient(
    private val baseUrl: String = CATALOG_URL
) {
    companion object {
        const val CATALOG_URL = "https://hrbcwymdqigtfmpmsdsi.supabase.co/functions/v1/katakecil-reader"
        private val SESSION_TOKEN_REGEX = Regex("^rs_[a-f0-9]{64}$", RegexOption.IGNORE_CASE)
        private val HEX_64_REGEX = Regex("^[a-f0-9]{64}$", RegexOption.IGNORE_CASE)
        private val SECTION_HREF_REGEX = Regex(
            "^OEBPS/section-([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})\\.xhtml$",
            RegexOption.IGNORE_CASE
        )
    }

    class ReaderBackendNotReadyException(message: String) : Exception(message)
    class PublicationUnavailableException(val statusCode: Int, message: String) : Exception(message)
    class RateLimitException(val retryAfterSeconds: Int, message: String) : Exception(message)

    data class ActiveSession(
        val bookId: String,
        val revision: String,
        var sessionToken: String,
        val chapters: MutableList<Chapter>
    )

    private var activeSession: ActiveSession? = null

    suspend fun fetchCatalog(): List<BookMeta> = withContext(Dispatchers.IO) {
        val url = "$baseUrl?action=catalog"
        val (status, body, _) = request("GET", url)
        if (status !in 200..299) {
            throw IllegalStateException("Gagal memuat katalog ($status).")
        }
        val root = Json.parseToJsonElement(body)
        val array: JsonArray = when (root) {
            is JsonArray -> root
            is JsonObject -> (root["books"] as? JsonArray) ?: (root["items"] as? JsonArray) ?: JsonArray(emptyList())
            else -> JsonArray(emptyList())
        }
        array.mapNotNull { el ->
            parseCatalogBook(el as? JsonObject ?: return@mapNotNull null)
        }
    }

    private fun parseCatalogBook(obj: JsonObject): BookMeta? {
        val id = obj["id"]?.jsonPrimitive?.contentOrNull?.trim() ?: return null
        val title = obj["title"]?.jsonPrimitive?.contentOrNull?.trim() ?: return null
        if (id.isEmpty() || title.isEmpty()) return null
        val author = obj["author"]?.jsonPrimitive?.contentOrNull?.trim()
            ?.ifBlank { "Penulis Tidak Diketahui" } ?: "Penulis Tidak Diketahui"
        val language = obj["language"]?.jsonPrimitive?.contentOrNull?.trim()?.ifBlank { "id" } ?: "id"
        val revision = (obj["revision"]?.jsonPrimitive?.contentOrNull
            ?: obj["published_revision"]?.jsonPrimitive?.contentOrNull
            ?: "").trim().lowercase()
        val coverUrl = (obj["cover_url"]?.jsonPrimitive?.contentOrNull
            ?: obj["coverUrl"]?.jsonPrimitive?.contentOrNull
            ?: "").trim()
        val sectionIds = (obj["section_ids"] as? JsonArray ?: obj["sectionIds"] as? JsonArray)
            ?.mapNotNull { it.jsonPrimitive.contentOrNull?.trim() }
            ?: emptyList()

        return BookMeta(
            id = id,
            title = title,
            author = author,
            language = language,
            coverUrl = coverUrl,
            revision = revision,
            sectionIds = sectionIds,
            source = "published",
            chapterCount = sectionIds.size
        )
    }

    suspend fun openBookManifest(book: BookMeta): List<Chapter> = withContext(Dispatchers.IO) {
        val bookId = book.id
        val rev = book.revision
        val sessionToken = createSessionToken(bookId, rev)
        val manifestUrl = buildActionUrl("manifest", bookId, rev)
        val (status, body, headers) = request(
            method = "GET",
            urlString = manifestUrl,
            headers = mapOf("x-reader-session" to sessionToken)
        )
        handleErrorStatus(status, body, headers)

        val root = Json.parseToJsonElement(body).jsonObject
        val protocol = root["protocol"]?.jsonPrimitive?.intOrNull ?: 0
        if (protocol != 2) {
            throw ReaderBackendNotReadyException("Protokol manifest tidak cocok (diharapkan v2).")
        }
        val chaptersArr = root["chapters"] as? JsonArray
            ?: throw IllegalStateException("Manifest buku tidak memiliki daftar episode.")

        val chapters = chaptersArr.mapIndexed { idx, el ->
            val obj = el.jsonObject
            val href = obj["href"]?.jsonPrimitive?.contentOrNull?.trim() ?: ""
            val hrefMatch = SECTION_HREF_REGEX.matchEntire(href)
            val sectionId = hrefMatch?.groupValues?.get(1)
                ?: obj["id"]?.jsonPrimitive?.contentOrNull?.trim()
                ?: book.sectionIds.getOrNull(idx)
                ?: "section-${idx + 1}"
            val title = obj["title"]?.jsonPrimitive?.contentOrNull?.trim()
                ?.ifBlank { "Episode ${idx + 1}" } ?: "Episode ${idx + 1}"
            val navTitle = obj["navigationTitle"]?.jsonPrimitive?.contentOrNull?.trim()
                ?.ifBlank { title } ?: title
            val chapterLabel = obj["chapterLabel"]?.jsonPrimitive?.contentOrNull?.trim()
                ?.ifBlank { "Episode ${idx + 1}" } ?: "Episode ${idx + 1}"
            val arc = obj["arc"]?.jsonPrimitive?.contentOrNull?.trim() ?: ""
            val contentHash = obj["contentHash"]?.jsonPrimitive?.contentOrNull?.trim()?.lowercase() ?: ""
            val length = obj["length"]?.jsonPrimitive?.intOrNull ?: 0

            Chapter(
                index = idx,
                id = sectionId,
                title = title,
                navigationTitle = navTitle,
                chapterLabel = chapterLabel,
                arc = arc,
                href = href,
                text = "",
                paragraphs = emptyList(),
                contentHash = contentHash,
                length = length
            )
        }.toMutableList()

        activeSession = ActiveSession(
            bookId = bookId,
            revision = rev,
            sessionToken = sessionToken,
            chapters = chapters
        )
        chapters.toList()
    }

    suspend fun loadEpisode(book: BookMeta, chapterIndex: Int): List<Chapter> = withContext(Dispatchers.IO) {
        var session = activeSession
        if (session == null || session.bookId != book.id || session.revision != book.revision) {
            openBookManifest(book)
            session = activeSession ?: throw IllegalStateException("Sesi pembaca belum siap.")
        }
        if (chapterIndex !in session.chapters.indices) {
            throw IndexOutOfBoundsException("Indeks episode di luar jangkauan: $chapterIndex")
        }

        val existing = session.chapters[chapterIndex]
        if (existing.text.isNotEmpty()) {
            return@withContext session.chapters.toList()
        }

        val episodeUrl = "${buildActionUrl("episode", session.bookId, session.revision)}&chapter=$chapterIndex"
        var (status, body, headers) = request(
            method = "GET",
            urlString = episodeUrl,
            headers = mapOf("x-reader-session" to session.sessionToken)
        )

        if (status == 401) {
            val refreshedToken = createSessionToken(session.bookId, session.revision)
            session.sessionToken = refreshedToken
            val retry = request(
                method = "GET",
                urlString = episodeUrl,
                headers = mapOf("x-reader-session" to refreshedToken)
            )
            status = retry.first
            body = retry.second
            headers = retry.third
        }

        handleErrorStatus(status, body, headers)

        val root = Json.parseToJsonElement(body).jsonObject
        val protocol = root["protocol"]?.jsonPrimitive?.intOrNull ?: 0
        if (protocol != 2) {
            throw ReaderBackendNotReadyException("Protokol episode tidak cocok (diharapkan v2).")
        }
        val chapterObj = (root["chapter"] as? JsonObject) ?: root
        val paragraphs = (chapterObj["paragraphs"] as? JsonArray)
            ?.mapNotNull { it.jsonPrimitive.contentOrNull }
            ?.filter { it.isNotBlank() }
            ?: emptyList()
        val rawText = chapterObj["text"]?.jsonPrimitive?.contentOrNull
            ?: paragraphs.joinToString("\n\n")
        val finalParagraphs = if (paragraphs.isNotEmpty()) {
            paragraphs
        } else {
            rawText.split(Regex("\n\\s*\n+")).map { it.trim() }.filter { it.isNotEmpty() }
        }

        val expectedHash = existing.contentHash.ifBlank {
            chapterObj["contentHash"]?.jsonPrimitive?.contentOrNull?.lowercase() ?: ""
        }
        if (expectedHash.isNotBlank() && HEX_64_REGEX.matches(expectedHash)) {
            val actualHash = TextAnchorEngine.sha256Hex(rawText)
            if (!actualHash.equals(expectedHash, ignoreCase = true)) {
                throw IllegalStateException("Verifikasi integritas episode gagal (SHA-256 tidak cocok).")
            }
        }

        // Clear all other episodes from RAM so only the active episode stays in memory
        for (i in session.chapters.indices) {
            if (i == chapterIndex) {
                session.chapters[i] = session.chapters[i].copy(
                    text = rawText,
                    paragraphs = finalParagraphs,
                    length = rawText.length
                )
            } else if (session.chapters[i].text.isNotEmpty()) {
                session.chapters[i] = session.chapters[i].copy(
                    text = "",
                    paragraphs = emptyList()
                )
            }
        }

        session.chapters.toList()
    }

    suspend fun validatePublication(bookId: String, currentRevision: String): BookMeta? {
        return try {
            val catalog = fetchCatalog()
            catalog.firstOrNull { it.id == bookId }
        } catch (_: Exception) {
            null
        }
    }

    fun clearSession() {
        activeSession = null
    }

    private fun createSessionToken(bookId: String, revision: String): String {
        val sessionUrl = buildActionUrl("session", bookId, revision)
        val (status, body, headers) = request("POST", sessionUrl)
        handleErrorStatus(status, body, headers)
        val root = Json.parseToJsonElement(body).jsonObject
        val token = (root["sessionToken"]?.jsonPrimitive?.contentOrNull
            ?: root["token"]?.jsonPrimitive?.contentOrNull
            ?: "").trim()
        if (!SESSION_TOKEN_REGEX.matches(token)) {
            throw ReaderBackendNotReadyException("Token sesi pembaca tidak valid.")
        }
        return token
    }

    private fun buildActionUrl(action: String, bookId: String, revision: String): String {
        val encBook = URLEncoder.encode(bookId, "UTF-8")
        val encRev = URLEncoder.encode(revision, "UTF-8")
        return "$baseUrl?action=$action&book=$encBook&revision=$encRev"
    }

    private fun handleErrorStatus(status: Int, body: String, headers: Map<String, String>) {
        if (status in 200..299) return
        when (status) {
            405 -> throw ReaderBackendNotReadyException(
                "Layanan pembaca belum siap (HTTP 405). Silakan coba lagi sebentar."
            )
            404, 409, 410 -> throw PublicationUnavailableException(
                status,
                "Edisi buku telah diperbarui atau tidak lagi tersedia ($status)."
            )
            429 -> {
                val retryAfter = headers["retry-after"]?.toIntOrNull() ?: 15
                throw RateLimitException(
                    retryAfter,
                    "Terlalu banyak permintaan. Coba lagi dalam $retryAfter detik."
                )
            }
            else -> {
                val msg = runCatching {
                    Json.parseToJsonElement(body).jsonObject["error"]?.jsonPrimitive?.contentOrNull
                }.getOrNull() ?: "Permintaan gagal ($status)."
                throw IllegalStateException(msg)
            }
        }
    }

    private fun request(
        method: String,
        urlString: String,
        headers: Map<String, String> = emptyMap(),
        bodyBytes: ByteArray? = null
    ): Triple<Int, String, Map<String, String>> {
        val conn = (URL(urlString).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15_000
            readTimeout = 20_000
            setRequestProperty("Accept", "application/json")
            for ((k, v) in headers) {
                setRequestProperty(k, v)
            }
            if (method == "POST") {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
                val payload = bodyBytes ?: "{}".toByteArray(Charsets.UTF_8)
                outputStream.use { it.write(payload) }
            }
        }

        val status = conn.responseCode
        val respHeaders = mutableMapOf<String, String>()
        conn.headerFields?.forEach { (k, v) ->
            if (k != null && !v.isNullOrEmpty()) {
                respHeaders[k.lowercase()] = v.first()
            }
        }
        val stream = if (status in 200..299) conn.inputStream else conn.errorStream
        val text = if (stream != null) {
            BufferedReader(InputStreamReader(stream, Charsets.UTF_8)).use { it.readText() }
        } else {
            ""
        }
        return Triple(status, text, respHeaders)
    }
}
