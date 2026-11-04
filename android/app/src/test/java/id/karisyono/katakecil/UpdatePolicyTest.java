package id.karisyono.katakecil;
import org.junit.Test;
import static org.junit.Assert.*;

public class UpdatePolicyTest {
    @Test public void semverOrderingIncludesPreviewAndStablePromotion() {
        assertTrue(UpdatePolicy.compare("v1.0.1-preview.10", "1.0.1-preview.2") > 0);
        assertTrue(UpdatePolicy.compare("1.0.1", "1.0.1-preview.10") > 0);
        assertTrue(UpdatePolicy.compare("1.1.0-preview.1", "1.0.9") > 0);
        assertEquals(0, UpdatePolicy.compare("v1.0.1+build.1", "1.0.1+build.2"));
        assertFalse(UpdatePolicy.validVersion("1.0.1-preview.01"));
        assertFalse(UpdatePolicy.validVersion("v01.0.1"));
        assertFalse(UpdatePolicy.validVersion("1.0"));
    }
    @Test public void previewChannelFindsPublishedPreviewsWithoutDowngrading() {
        assertTrue(UpdatePolicy.eligible("v1.0.1-preview.3", "1.0.1-preview.2", false, true));
        assertTrue(UpdatePolicy.eligible("v1.0.1", "1.0.1-preview.2", false, false));
        assertFalse(UpdatePolicy.eligible("v1.0.1-preview.3", "1.0.0", false, true));
        assertFalse(UpdatePolicy.eligible("v1.0.1-preview.3", "1.0.0", false, false));
        assertFalse(UpdatePolicy.eligible("v1.0.1-preview.3", "1.0.1-preview.2", true, true));
        assertFalse(UpdatePolicy.eligible("v1.0.0-preview.1", "1.0.1-preview.2", false, true));
        assertFalse(UpdatePolicy.eligible("v1.0.1-preview.2", "1.0.1-preview.2", false, true));
    }
    @Test public void assetsOnlyComeFromOfficialRepositoryWithHttpsRedirects() {
        assertTrue(UpdatePolicy.assetUrl("https://github.com/arisynn/katakecil/releases/download/v1.0.1/KataKecil-1.0.1-Karisyono.apk"));
        assertTrue(UpdatePolicy.downloadUrl("https://release-assets.githubusercontent.com/github-production-release-asset/123/file?sig=example"));
        for (String url : new String[]{"http://github.com/arisynn/katakecil/releases/download/v1/a.apk", "https://github.com/other/katakecil/releases/download/v1/a.apk", "https://github.com.evil.test/arisynn/katakecil/releases/download/v1/a.apk", "https://evil@github.com/arisynn/katakecil/releases/download/v1/a.apk", "https://github.com:444/arisynn/katakecil/releases/download/v1/a.apk", "file:///tmp/a.apk", "https://github.com/arisynn/katakecil/releases/download/%2E%2E/a.apk"}) assertFalse(url, UpdatePolicy.assetUrl(url));
        assertFalse(UpdatePolicy.downloadUrl("https://example.com/update.apk"));
    }
}
