package id.karisyono.katakecil;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.os.SystemClock;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Locale;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/** No token or arbitrary download URL crosses the JS bridge. Android confirms installation. */
@CapacitorPlugin(name = "KataKecilUpdates")
public class KataKecilUpdatePlugin extends Plugin {
    private static final String API = "https://api.github.com/repos/arisynn/katakecil/releases?per_page=30";
    private static final long MAX_APK = 100L * 1024 * 1024;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final AtomicBoolean busy = new AtomicBoolean(false);
    private volatile boolean cancelled, downloading;
    private volatile HttpURLConnection activeConnection;
    private JSONObject candidate;
    private File readyFile;
    private String readyHash;

    @PluginMethod public void check(PluginCall call) {
        if (!busy.compareAndSet(false, true)) { call.reject("An update operation is already running."); return; }
        worker.execute(() -> {
            try {
                PackageInfo installed = installedInfo();
                JSONArray releases = new JSONArray(readText(API, 2 * 1024 * 1024, true));
                JSONObject best = null;
                for (int i = 0; i < releases.length(); i++) {
                    JSONObject release = releases.getJSONObject(i);
                    String tag = release.optString("tag_name");
                    if (release.isNull("published_at") || !UpdatePolicy.eligible(tag, installed.versionName, release.optBoolean("draft", true), release.optBoolean("prerelease", true))) continue;
                    JSONObject apk = null, checksum = null;
                    JSONArray assets = release.optJSONArray("assets"); if (assets == null) continue;
                    for (int j = 0; j < assets.length(); j++) {
                        JSONObject asset = assets.getJSONObject(j);
                        if (asset.optString("name").matches("KataKecil-[A-Za-z0-9._-]+-Karisyono\\.apk") && asset.optLong("size") > 0 && asset.optLong("size") <= MAX_APK && UpdatePolicy.assetUrl(asset.optString("browser_download_url"))) {
                            // Ambiguous multi-APK releases are not installable automatically.
                            if (apk != null) { apk = null; break; } apk = asset;
                        }
                    }
                    if (apk == null) continue;
                    String digest = apk.optString("digest");
                    for (int j = 0; j < assets.length(); j++) { JSONObject asset = assets.getJSONObject(j); if (asset.optString("name").equals(apk.getString("name") + ".sha256") && UpdatePolicy.assetUrl(asset.optString("browser_download_url"))) checksum = asset; }
                    if (!digest.matches("sha256:[0-9a-fA-F]{64}") && checksum == null) continue;
                    JSONObject item = new JSONObject().put("version", tag.replaceFirst("^v", "")).put("tag", tag).put("size", apk.getLong("size")).put("name", apk.getString("name")).put("url", apk.getString("browser_download_url")).put("digest", digest).put("checksum", checksum == null ? "" : checksum.getString("browser_download_url")).put("preview", release.optBoolean("prerelease"));
                    String notes = release.optString("body", ""); item.put("notes", notes.substring(0, Math.min(notes.length(), 4000)));
                    if (best == null || UpdatePolicy.compare(tag, best.getString("tag")) > 0) best = item;
                }
                candidate = best; readyFile = null; readyHash = null;
                JSObject result = new JSObject().put("currentVersion", installed.versionName).put("versionCode", versionCode(installed)).put("previewChannel", installed.versionName.contains("-"));
                result.put("update", best == null ? JSONObject.NULL : publicInfo(best)); call.resolve(result);
            } catch (Exception error) { call.reject(message(error), error); }
            finally { busy.set(false); }
        });
    }

    @PluginMethod public void download(PluginCall call) {
        if (!busy.compareAndSet(false, true)) { call.reject("An update operation is already running."); return; }
        downloading = true; cancelled = false;
        worker.execute(() -> {
            File partial = null;
            try {
                JSONObject update = candidate; if (update == null) throw new Exception("Check for an update first.");
                String hash = update.optString("digest").replaceFirst("^sha256:", "");
                if (!hash.matches("[0-9a-fA-F]{64}")) {
                    String checksum = readText(update.getString("checksum"), 2048, false).trim();
                    String[] parts = checksum.split("\\s+");
                    if (parts.length != 2 || !parts[1].replaceFirst("^\\*", "").equals(update.getString("name"))) throw new Exception("Invalid update checksum file.");
                    hash = parts[0];
                }
                if (!hash.matches("[0-9a-fA-F]{64}")) throw new Exception("The release has no valid SHA-256 checksum.");
                File folder = new File(getContext().getCacheDir(), "updates");
                if (!folder.isDirectory() && !folder.mkdirs()) throw new Exception("Update storage is unavailable.");
                File[] old = folder.listFiles(); if (old != null) for (File file : old) if (!file.delete()) throw new Exception("Unable to clear the previous update.");
                partial = new File(folder, "download.part"); readyFile = null; readyHash = null;
                long expected = update.getLong("size"), total = 0, started = SystemClock.elapsedRealtime(); int previous = -1;
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                HttpURLConnection connection = connect(update.getString("url"), false);
                try (InputStream input = connection.getInputStream(); FileOutputStream output = new FileOutputStream(partial)) {
                    byte[] buffer = new byte[32768]; int count;
                    while ((count = input.read(buffer)) != -1) {
                        if (cancelled || SystemClock.elapsedRealtime() - started > 5 * 60 * 1000) throw new Exception(cancelled ? "Download cancelled." : "Download timed out. Try again.");
                        total += count; if (total > expected || total > MAX_APK) throw new Exception("The downloaded APK size is invalid.");
                        digest.update(buffer, 0, count); output.write(buffer, 0, count);
                        int percent = (int) (total * 100 / expected); if (percent != previous) { previous = percent; notifyListeners("downloadProgress", new JSObject().put("percent", percent).put("received", total).put("total", expected)); }
                    }
                    output.getFD().sync();
                } finally { connection.disconnect(); activeConnection = null; }
                if (cancelled) throw new Exception("Download cancelled.");
                if (total != expected || !hex(digest.digest()).equalsIgnoreCase(hash)) throw new Exception("Update verification failed. Please download again.");
                verifyApk(partial, update);
                File apk = new File(folder, "KataKecil-update.apk"); if (!partial.renameTo(apk)) throw new Exception("Unable to prepare the update.");
                readyFile = apk; readyHash = hash.toLowerCase(Locale.ROOT); call.resolve(new JSObject().put("ready", true));
            } catch (Exception error) { if (partial != null) partial.delete(); readyFile = null; readyHash = null; call.reject(cancelled ? "Download cancelled." : message(error), error); }
            finally { downloading = false; busy.set(false); }
        });
    }

    @PluginMethod public void cancel(PluginCall call) {
        if (downloading) { cancelled = true; HttpURLConnection connection = activeConnection; if (connection != null) connection.disconnect(); }
        call.resolve();
    }

    @PluginMethod public void install(PluginCall call) {
        if (!busy.compareAndSet(false, true)) { call.reject("An update operation is already running."); return; }
        worker.execute(() -> {
            try {
                File apk = readyFile;
                if (apk == null || !apk.isFile() || readyHash == null || candidate == null) throw new Exception("Download and verify the update first.");
                MessageDigest digest = MessageDigest.getInstance("SHA-256");
                try (InputStream input = new java.io.FileInputStream(apk)) { byte[] buffer = new byte[32768]; int n; while ((n = input.read(buffer)) != -1) digest.update(buffer, 0, n); }
                if (!hex(digest.digest()).equals(readyHash)) throw new Exception("The update file changed. Download it again.");
                verifyApk(apk, candidate);
                getActivity().runOnUiThread(() -> {
                    try {
                        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
                            Intent permission = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
                            getActivity().startActivity(permission); call.resolve(new JSObject().put("permissionRequired", true)); return;
                        }
                        Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", apk);
                        Intent install = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, "application/vnd.android.package-archive").addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                        install.setClipData(android.content.ClipData.newRawUri("KataKecil update", uri));
                        getActivity().startActivity(install); call.resolve(new JSObject().put("permissionRequired", false));
                    } catch (Exception error) { call.reject("Android could not open its installer or installation settings.", error); }
                    finally { busy.set(false); }
                });
            } catch (Exception error) { busy.set(false); call.reject(message(error), error); }
        });
    }

    @SuppressWarnings("deprecation") private PackageInfo installedInfo() throws Exception { return getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES); }
    @SuppressWarnings("deprecation") private static long versionCode(PackageInfo info) { return Build.VERSION.SDK_INT >= 28 ? info.getLongVersionCode() : info.versionCode; }
    @SuppressWarnings("deprecation") private void verifyApk(File apk, JSONObject release) throws Exception {
        PackageInfo info = getContext().getPackageManager().getPackageArchiveInfo(apk.getAbsolutePath(), Build.VERSION.SDK_INT >= 28 ? PackageManager.GET_SIGNING_CERTIFICATES : PackageManager.GET_SIGNATURES), installed = installedInfo();
        if (info == null || !getContext().getPackageName().equals(info.packageName) || versionCode(info) <= versionCode(installed) || !release.getString("version").equals(info.versionName)) throw new Exception("This APK is not a newer compatible KataKecil release.");
        if (!Arrays.equals(signers(info), signers(installed))) throw new Exception("The APK signing certificate does not match this installation.");
    }
    @SuppressWarnings("deprecation") private static String[] signers(PackageInfo info) throws Exception {
        Signature[] signatures = Build.VERSION.SDK_INT >= 28 ? info.signingInfo == null ? null : info.signingInfo.getApkContentsSigners() : info.signatures;
        if (signatures == null || signatures.length == 0) throw new Exception("The APK has no readable signing certificate.");
        String[] hashes = new String[signatures.length]; for (int i = 0; i < signatures.length; i++) hashes[i] = hex(MessageDigest.getInstance("SHA-256").digest(signatures[i].toByteArray())); Arrays.sort(hashes); return hashes;
    }
    private static JSObject publicInfo(JSONObject candidate) throws Exception { JSObject result = new JSObject(); for (String key : new String[]{"version", "tag", "size", "notes", "preview"}) result.put(key, candidate.get(key)); return result; }
    private String readText(String url, int max, boolean api) throws Exception {
        HttpURLConnection connection = connect(url, api);
        try (InputStream input = connection.getInputStream(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            byte[] buffer = new byte[8192]; int count; while ((count = input.read(buffer)) != -1) { if (output.size() + count > max) throw new Exception("The update response is too large."); output.write(buffer, 0, count); }
            return output.toString(StandardCharsets.UTF_8.name());
        } finally { connection.disconnect(); activeConnection = null; }
    }
    private HttpURLConnection connect(String value, boolean api) throws Exception {
        String url = value;
        for (int i = 0; i < 6; i++) {
            if (!(api && API.equals(url)) && !UpdatePolicy.downloadUrl(url)) throw new Exception("The update URL is not an official GitHub release asset.");
            HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection(); activeConnection = connection;
            connection.setInstanceFollowRedirects(false); connection.setConnectTimeout(15000); connection.setReadTimeout(30000); connection.setRequestProperty("User-Agent", "KataKecil-Android-Updater"); connection.setRequestProperty("Accept", api ? "application/vnd.github+json" : "application/octet-stream");
            int status = connection.getResponseCode();
            if (status >= 300 && status < 400) { String next = connection.getHeaderField("Location"); connection.disconnect(); if (next == null) throw new Exception("Invalid update redirect."); url = new URL(new URL(url), next).toString(); continue; }
            if (status != 200) { connection.disconnect(); throw new Exception(status == 403 || status == 429 ? "GitHub is limiting update checks. Try again later." : "Unable to reach GitHub Releases (HTTP " + status + ")."); }
            return connection;
        }
        throw new Exception("Too many update redirects.");
    }
    private static String hex(byte[] bytes) { StringBuilder result = new StringBuilder(); for (byte b : bytes) result.append(String.format(Locale.ROOT, "%02x", b & 255)); return result.toString(); }
    private static String message(Exception error) { return error.getMessage() == null ? "Unable to complete the update. Check your connection and try again." : error.getMessage(); }
    @Override protected void handleOnDestroy() { cancelled = true; HttpURLConnection connection = activeConnection; if (connection != null) connection.disconnect(); worker.shutdownNow(); super.handleOnDestroy(); }
}
