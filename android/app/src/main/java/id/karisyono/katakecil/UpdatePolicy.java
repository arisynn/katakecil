package id.karisyono.katakecil;

import java.math.BigInteger;
import java.net.URI;
import java.util.regex.Pattern;

/** Small, platform-independent policy around Android's installer and GitHub Releases. */
public final class UpdatePolicy {
    private static final Pattern VERSION = Pattern.compile("v?(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?");
    public static boolean validVersion(String version) {
        if (version == null || version.length() > 100 || !VERSION.matcher(version).matches()) return false;
        String clean = version.replaceFirst("^v", "").split("\\+", 2)[0];
        if (clean.contains("-")) for (String part : clean.split("-", 2)[1].split("\\.")) if (part.matches("[0-9]+") && part.length() > 1 && part.startsWith("0")) return false;
        return true;
    }
    public static int compare(String first, String second) {
        if (!validVersion(first) || !validVersion(second)) throw new IllegalArgumentException("Invalid release version.");
        String[] a = first.replaceFirst("^v", "").split("\\+", 2)[0].split("-", 2), b = second.replaceFirst("^v", "").split("\\+", 2)[0].split("-", 2);
        String[] ac = a[0].split("\\."), bc = b[0].split("\\.");
        for (int i = 0; i < 3; i++) { int value = new BigInteger(ac[i]).compareTo(new BigInteger(bc[i])); if (value != 0) return value; }
        if (a.length != b.length) return a.length == 1 ? 1 : -1;
        if (a.length == 1) return 0;
        String[] ap = a[1].split("\\."), bp = b[1].split("\\.");
        for (int i = 0; i < Math.min(ap.length, bp.length); i++) {
            boolean an = ap[i].matches("[0-9]+"), bn = bp[i].matches("[0-9]+");
            int value = an && bn ? new BigInteger(ap[i]).compareTo(new BigInteger(bp[i])) : an != bn ? an ? -1 : 1 : ap[i].compareTo(bp[i]);
            if (value != 0) return value;
        }
        return Integer.compare(ap.length, bp.length);
    }
    public static boolean eligible(String tag, String installed, boolean draft, boolean preview) {
        return !draft && validVersion(tag) && validVersion(installed) && (installed.contains("-") || !preview && !tag.contains("-")) && compare(tag, installed) > 0;
    }
    public static boolean assetUrl(String value) {
        try { URI u = new URI(value); return safe(u) && "github.com".equals(u.getHost()) && u.getRawPath().startsWith("/arisynn/katakecil/releases/download/") && u.getRawQuery() == null && !u.getPath().contains(".."); }
        catch (Exception ignored) { return false; }
    }
    public static boolean downloadUrl(String value) {
        try { URI u = new URI(value); return assetUrl(value) || safe(u) && ("release-assets.githubusercontent.com".equals(u.getHost()) || "objects.githubusercontent.com".equals(u.getHost()) || "github-releases.githubusercontent.com".equals(u.getHost())); }
        catch (Exception ignored) { return false; }
    }
    public static boolean isTrustedDownloadUrl(String value) { return downloadUrl(value); }
    public static boolean isValidSha256(String value) { return value != null && value.matches("[a-fA-F0-9]{64}"); }
    public static String parseSha256Checksum(String text, String fileName) {
        if (text == null || fileName == null) return null;
        for (String line : text.split("\\r?\\n")) {
            String[] parts = line.trim().split("\\s+");
            if (parts.length == 2 && isValidSha256(parts[0]) && parts[1].replaceFirst("^\\*", "").equals(fileName)) return parts[0].toLowerCase(java.util.Locale.ROOT);
        }
        return null;
    }
    public static final class Candidate {
        public final String version, tagName, releaseName, body, publishedAt, assetName, downloadUrl, sha256, checksumUrl, htmlUrl;
        public final long assetSize;
        public final boolean prerelease;
        Candidate(org.json.JSONObject release, org.json.JSONObject asset, String digest, String checksum) {
            tagName = release.optString("tag_name"); version = tagName.replaceFirst("^v", "");
            releaseName = release.optString("name"); body = release.optString("body"); publishedAt = release.optString("published_at");
            assetName = asset.optString("name"); downloadUrl = asset.optString("browser_download_url"); assetSize = asset.optLong("size");
            sha256 = digest; checksumUrl = checksum; htmlUrl = release.optString("html_url"); prerelease = release.optBoolean("prerelease");
        }
    }
    public static final class Decision {
        public final String status;
        public final Candidate candidate;
        Decision(String status, Candidate candidate) { this.status = status; this.candidate = candidate; }
    }
    /** A shared GitHub release may contain both apps; native never selects a Capacitor APK. */
    public static Decision evaluateReleases(org.json.JSONArray releases, String installed, boolean includePreview) {
        Candidate best = null;
        for (int i = 0; i < releases.length(); i++) {
            org.json.JSONObject release = releases.optJSONObject(i);
            if (release == null || release.optBoolean("draft", true) || release.isNull("published_at")) continue;
            String tag = release.optString("tag_name");
            if (!validVersion(tag) || (!includePreview && (release.optBoolean("prerelease", true) || tag.contains("-")))) continue;
            org.json.JSONArray assets = release.optJSONArray("assets"); if (assets == null) continue;
            String expectedName = "KataKecil.apk";
            org.json.JSONObject apk = null; String checksum = "";
            for (int j = 0; j < assets.length(); j++) {
                org.json.JSONObject asset = assets.optJSONObject(j); if (asset == null) continue;
                String name = asset.optString("name"), url = asset.optString("browser_download_url");
                if (!assetUrl(url)) continue;
                if (expectedName.equals(name) && asset.optLong("size") > 0 && asset.optLong("size") <= 150L * 1024 * 1024) {
                    if (apk != null) { apk = null; break; } apk = asset;
                }
                if ((expectedName + ".sha256").equals(name)) checksum = url;
            }
            if (apk == null) continue;
            String digest = apk.optString("digest").replaceFirst("^sha256:", "");
            if (!isValidSha256(digest)) digest = "";
            if (digest.isEmpty() && checksum.isEmpty()) continue;
            Candidate next = new Candidate(release, apk, digest, checksum);
            if (best == null || compare(next.version, best.version) > 0) best = next;
        }
        if (best == null) return new Decision("no-releases", null);
        int order = compare(best.version, installed);
        return new Decision(order > 0 ? "update-available" : order == 0 ? "up-to-date" : "ahead", best);
    }
    private static boolean safe(URI uri) { return "https".equals(uri.getScheme()) && uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443) && uri.getFragment() == null; }
}
