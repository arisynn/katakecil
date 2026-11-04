package id.karisyono.katakecil;

import java.math.BigInteger;
import java.net.URI;
import java.util.regex.Pattern;

/** Small, platform-independent policy around Android's installer and GitHub Releases. */
final class UpdatePolicy {
    private static final Pattern VERSION = Pattern.compile("v?(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)\\.(0|[1-9][0-9]*)(?:-([0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*))?(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?");
    static boolean validVersion(String version) {
        if (version == null || version.length() > 100 || !VERSION.matcher(version).matches()) return false;
        String clean = version.replaceFirst("^v", "").split("\\+", 2)[0];
        if (clean.contains("-")) for (String part : clean.split("-", 2)[1].split("\\.")) if (part.matches("[0-9]+") && part.length() > 1 && part.startsWith("0")) return false;
        return true;
    }
    static int compare(String first, String second) {
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
    static boolean eligible(String tag, String installed, boolean draft, boolean preview) {
        return !draft && validVersion(tag) && validVersion(installed) && (installed.contains("-") || !preview && !tag.contains("-")) && compare(tag, installed) > 0;
    }
    static boolean assetUrl(String value) {
        try { URI u = new URI(value); return safe(u) && "github.com".equals(u.getHost()) && u.getRawPath().startsWith("/arisynn/katakecil/releases/download/") && u.getRawQuery() == null && !u.getPath().contains(".."); }
        catch (Exception ignored) { return false; }
    }
    static boolean downloadUrl(String value) {
        try { URI u = new URI(value); return assetUrl(value) || safe(u) && ("release-assets.githubusercontent.com".equals(u.getHost()) || "objects.githubusercontent.com".equals(u.getHost()) || "github-releases.githubusercontent.com".equals(u.getHost())); }
        catch (Exception ignored) { return false; }
    }
    private static boolean safe(URI uri) { return "https".equals(uri.getScheme()) && uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443) && uri.getFragment() == null; }
}
