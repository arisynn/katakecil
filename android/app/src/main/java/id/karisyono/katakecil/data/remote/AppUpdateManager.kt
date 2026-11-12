package id.karisyono.katakecil.data.remote

import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Settings
import androidx.core.content.FileProvider
import id.karisyono.katakecil.BuildConfig
import id.karisyono.katakecil.UpdatePolicy
import id.karisyono.katakecil.core.model.DownloadedUpdateState
import id.karisyono.katakecil.core.model.UpdateReleaseInfo
import id.karisyono.katakecil.domain.reader.TextAnchorEngine
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.io.BufferedReader
import java.io.File
import java.io.FileOutputStream
import java.io.InputStreamReader
import java.net.HttpURLConnection
import java.net.URL
import java.security.MessageDigest

/**
 * Native Kotlin implementation of KataKecilUpdatePlugin.java & dist/app-updates.js.
 * Uses UpdatePolicy for GitHub release evaluation, verifies SHA-256 checksums and APK signing
 * certificates, and launches the Android package installer via FileProvider.
 */
class AppUpdateManager(private val context: Context) {

    companion object {
        const val RELEASES_URL = "https://api.github.com/repos/arisynn/katakecil/releases?per_page=30"
        const val MAX_APK_BYTES = 150L * 1024L * 1024L // 150 MB
    }

    suspend fun checkForUpdates(includePreview: Boolean = false): UpdateReleaseInfo =
        withContext(Dispatchers.IO) {
            val conn = (URL(RELEASES_URL).openConnection() as HttpURLConnection).apply {
                requestMethod = "GET"
                connectTimeout = 15_000
                readTimeout = 20_000
                setRequestProperty("Accept", "application/vnd.github+json")
                setRequestProperty("User-Agent", "KataKecil/${BuildConfig.VERSION_NAME}")
            }
            val status = conn.responseCode
            val stream = if (status in 200..299) conn.inputStream else conn.errorStream
            val body = stream?.let {
                BufferedReader(InputStreamReader(it, Charsets.UTF_8)).use { r -> r.readText() }
            } ?: ""
            if (status !in 200..299) {
                throw IllegalStateException("Gagal memeriksa pembaruan GitHub ($status).")
            }

            val releases = JSONArray(body)
            val decision = UpdatePolicy.evaluateReleases(
                releases,
                BuildConfig.VERSION_NAME,
                includePreview
            )

            val candidate = decision.candidate
            UpdateReleaseInfo(
                status = decision.status,
                currentVersion = BuildConfig.VERSION_NAME,
                currentVersionCode = BuildConfig.VERSION_CODE,
                latestVersion = candidate?.version ?: BuildConfig.VERSION_NAME,
                latestTag = candidate?.tagName ?: "v${BuildConfig.VERSION_NAME}",
                releaseTitle = candidate?.releaseName ?: "",
                releaseNotes = candidate?.body ?: "",
                publishedAt = candidate?.publishedAt ?: "",
                prerelease = candidate?.prerelease ?: false,
                assetName = candidate?.assetName ?: "",
                assetUrl = candidate?.downloadUrl ?: "",
                assetSize = candidate?.assetSize ?: 0L,
                expectedSha256 = candidate?.sha256 ?: "",
                checksumUrl = candidate?.checksumUrl ?: "",
                htmlUrl = candidate?.htmlUrl ?: "https://github.com/arisynn/katakecil/releases"
            )
        }

    suspend fun downloadUpdate(
        info: UpdateReleaseInfo,
        onProgress: (Int) -> Unit = {}
    ): DownloadedUpdateState = withContext(Dispatchers.IO) {
        if (info.assetUrl.isBlank() || !UpdatePolicy.isTrustedDownloadUrl(info.assetUrl)) {
            throw IllegalArgumentException("URL unduhan APK tidak tepercaya.")
        }

        var expectedSha = info.expectedSha256.trim().lowercase()
        if (expectedSha.isEmpty() && info.checksumUrl.isNotBlank() && UpdatePolicy.isTrustedDownloadUrl(info.checksumUrl)) {
            val checksumText = fetchTextFollowRedirects(info.checksumUrl)
            expectedSha = UpdatePolicy.parseSha256Checksum(checksumText, info.assetName) ?: ""
        }
        if (!UpdatePolicy.isValidSha256(expectedSha)) {
            throw IllegalStateException("Checksum SHA-256 rilis tidak ditemukan atau tidak valid.")
        }

        val updatesDir = File(context.cacheDir, "updates").apply { mkdirs() }
        val safeFileName = info.assetName.replace(Regex("[^a-zA-Z0-9._-]"), "_")
            .ifBlank { "KataKecil-update.apk" }
        val targetFile = File(updatesDir, safeFileName)
        val tempFile = File(updatesDir, "$safeFileName.part")

        val digest = MessageDigest.getInstance("SHA-256")
        var currentUrl = info.assetUrl
        var redirects = 0
        var conn: HttpURLConnection

        while (true) {
            if (!UpdatePolicy.isTrustedDownloadUrl(currentUrl)) {
                throw SecurityException("Pengalihan unduhan ke domain tidak dikenal diblokir.")
            }
            conn = (URL(currentUrl).openConnection() as HttpURLConnection).apply {
                instanceFollowRedirects = false
                requestMethod = "GET"
                connectTimeout = 15_000
                readTimeout = 30_000
                setRequestProperty("User-Agent", "KataKecil/${BuildConfig.VERSION_NAME}")
            }
            val code = conn.responseCode
            if (code in listOf(301, 302, 303, 307, 308)) {
                redirects++
                if (redirects > 5) throw IllegalStateException("Terlalu banyak pengalihan URL unduhan.")
                val loc = conn.getHeaderField("Location") ?: throw IllegalStateException("Header Location kosong.")
                currentUrl = URL(URL(currentUrl), loc).toString()
                continue
            }
            if (code !in 200..299) {
                throw IllegalStateException("Gagal mengunduh APK pembaruan ($code).")
            }
            break
        }

        val totalBytes = conn.contentLengthLong.takeIf { it > 0L } ?: info.assetSize
        var downloaded = 0L

        conn.inputStream.use { input ->
            FileOutputStream(tempFile).use { output ->
                val buf = ByteArray(16 * 1024)
                while (true) {
                    val read = input.read(buf)
                    if (read <= 0) break
                    downloaded += read
                    if (downloaded > MAX_APK_BYTES) {
                        tempFile.delete()
                        throw IllegalStateException("Ukuran APK melebihi batas aman 150 MB.")
                    }
                    digest.update(buf, 0, read)
                    output.write(buf, 0, read)
                    if (totalBytes > 0L) {
                        val pct = ((downloaded * 100L) / totalBytes).toInt().coerceIn(0, 100)
                        onProgress(pct)
                    }
                }
            }
        }

        val actualSha = digest.digest().joinToString("") { String.format("%02x", it) }
        if (!actualSha.equals(expectedSha, ignoreCase = true)) {
            tempFile.delete()
            throw SecurityException("Verifikasi SHA-256 APK gagal! File dibatalkan.")
        }

        // Verify APK package name, versionCode, and signing certificate
        val archiveVersionCode = verifyDownloadedApkArchive(tempFile)
        if (targetFile.exists()) targetFile.delete()
        tempFile.renameTo(targetFile)

        DownloadedUpdateState(
            filePath = targetFile.absolutePath,
            fileName = targetFile.name,
            version = info.latestVersion,
            versionCode = archiveVersionCode,
            sha256 = actualSha,
            canInstallPackages = canInstallPackages()
        )
    }

    fun canInstallPackages(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            context.packageManager.canRequestPackageInstalls()
        } else {
            true
        }
    }

    fun launchInstallOrPermission(state: DownloadedUpdateState) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && !context.packageManager.canRequestPackageInstalls()) {
            val intent = Intent(
                Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES,
                Uri.parse("package:${context.packageName}")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            return
        }

        val apkFile = File(state.filePath)
        if (!apkFile.exists()) {
            throw IllegalStateException("File pembaruan APK tidak ditemukan. Silakan unduh ulang.")
        }
        val uri = FileProvider.getUriForFile(
            context,
            "${context.packageName}.fileprovider",
            apkFile
        )
        val installIntent = Intent(Intent.ACTION_VIEW).apply {
            setDataAndType(uri, "application/vnd.android.package-archive")
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        context.startActivity(installIntent)
    }

    @Suppress("DEPRECATION")
    private fun verifyDownloadedApkArchive(apkFile: File): Int {
        val pm = context.packageManager
        val flags = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            PackageManager.GET_SIGNING_CERTIFICATES
        } else {
            PackageManager.GET_SIGNATURES
        }

        val archiveInfo = pm.getPackageArchiveInfo(apkFile.absolutePath, flags)
            ?: throw SecurityException("File yang diunduh bukan paket APK Android yang valid.")

        if (archiveInfo.packageName != context.packageName) {
            apkFile.delete()
            throw SecurityException("Nama paket APK (${archiveInfo.packageName}) tidak sesuai dengan ${context.packageName}.")
        }

        val archiveVersionCode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            archiveInfo.longVersionCode.toInt()
        } else {
            archiveInfo.versionCode
        }
        if (archiveVersionCode < BuildConfig.VERSION_CODE) {
            apkFile.delete()
            throw SecurityException("Version code APK ($archiveVersionCode) lebih lama dari versi terpasang (${BuildConfig.VERSION_CODE}).")
        }

        val installedInfo = pm.getPackageInfo(context.packageName, flags)
        val installedDigests = extractCertDigests(installedInfo)
        val archiveDigests = extractCertDigests(archiveInfo)
        if (installedDigests.isNotEmpty() && archiveDigests.isNotEmpty()) {
            if (installedDigests.intersect(archiveDigests).isEmpty()) {
                apkFile.delete()
                throw SecurityException("Sertifikat tanda tangan APK tidak cocok dengan aplikasi yang terpasang.")
            }
        }

        return archiveVersionCode
    }

    @Suppress("DEPRECATION")
    private fun extractCertDigests(info: PackageInfo): Set<String> {
        val result = mutableSetOf<String>()
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            val signingInfo = info.signingInfo ?: return emptySet()
            val certs = if (signingInfo.hasMultipleSigners()) {
                signingInfo.apkContentsSigners
            } else {
                signingInfo.signingCertificateHistory
            }
            certs?.forEach { sig ->
                result.add(TextAnchorEngine.sha256Hex(sig.toByteArray()))
            }
        } else {
            info.signatures?.forEach { sig ->
                result.add(TextAnchorEngine.sha256Hex(sig.toByteArray()))
            }
        }
        return result
    }

    private fun fetchTextFollowRedirects(startUrl: String): String {
        var currentUrl = startUrl
        var redirects = 0
        while (true) {
            if (!UpdatePolicy.isTrustedDownloadUrl(currentUrl)) {
                throw SecurityException("Domain checksum tidak tepercaya.")
            }
            val conn = (URL(currentUrl).openConnection() as HttpURLConnection).apply {
                instanceFollowRedirects = false
                requestMethod = "GET"
                connectTimeout = 12_000
                readTimeout = 15_000
                setRequestProperty("User-Agent", "KataKecil/${BuildConfig.VERSION_NAME}")
            }
            val code = conn.responseCode
            if (code in listOf(301, 302, 303, 307, 308)) {
                redirects++
                if (redirects > 5) throw IllegalStateException("Terlalu banyak pengalihan URL checksum.")
                val loc = conn.getHeaderField("Location") ?: throw IllegalStateException("Header Location kosong.")
                currentUrl = URL(URL(currentUrl), loc).toString()
                continue
            }
            if (code !in 200..299) {
                throw IllegalStateException("Gagal mengunduh file checksum ($code).")
            }
            return BufferedReader(InputStreamReader(conn.inputStream, Charsets.UTF_8)).use { it.readText() }
        }
    }
}
