package id.karisyono.katakecil;

import android.content.Intent;
import android.database.Cursor;
import android.net.Uri;
import android.provider.OpenableColumns;
import android.util.Base64;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.RandomAccessFile;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

/** Temporary URI grants are consumed promptly; books enter the local Library only. */
@CapacitorPlugin(name = "KataKecilImport")
public class KataKecilImportPlugin extends Plugin {
    private static final long MAX_BYTES = 30L * 1024 * 1024;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private final LinkedHashMap<String, JSObject> pending = new LinkedHashMap<>();
    private final LinkedHashMap<String, File> files = new LinkedHashMap<>();

    @Override public void load() { receive(getActivity().getIntent()); }
    @Override protected void handleOnNewIntent(Intent intent) { receive(intent); }

    private void receive(Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (!Intent.ACTION_VIEW.equals(action) && !Intent.ACTION_SEND.equals(action)) return;
        Uri uri = Intent.ACTION_SEND.equals(action) ? intent.getParcelableExtra(Intent.EXTRA_STREAM) : intent.getData();
        if (uri == null && intent.getClipData() != null && intent.getClipData().getItemCount() > 0) uri = intent.getClipData().getItemAt(0).getUri();
        if (uri == null || !("content".equals(uri.getScheme()) || "file".equals(uri.getScheme()))) return;
        final Uri source = uri;
        final String mime = intent.getType();
        worker.execute(() -> {
            String id = UUID.randomUUID().toString(), name = source.getLastPathSegment();
            File target = new File(getContext().getCacheDir(), "epub-incoming-" + id);
            JSObject entry = new JSObject().put("id", id);
            try {
                synchronized (pending) { if (pending.size() >= 4) throw new IllegalStateException("Finish importing the pending EPUB files first."); }
                if ("content".equals(source.getScheme())) try (Cursor c = getContext().getContentResolver().query(source, new String[]{OpenableColumns.DISPLAY_NAME}, null, null, null)) {
                    if (c != null && c.moveToFirst()) name = c.getString(0);
                }
                if (name == null) name = "book.epub";
                if (!name.toLowerCase(Locale.ROOT).endsWith(".epub")) {
                    if (!"application/epub+zip".equals(mime)) throw new IllegalArgumentException("Choose an EPUB file.");
                    name += ".epub";
                }
                long count = 0;
                try (InputStream in = getContext().getContentResolver().openInputStream(source); FileOutputStream out = new FileOutputStream(target)) {
                    if (in == null) throw new IllegalArgumentException("The EPUB file cannot be opened.");
                    byte[] buffer = new byte[65536]; int n;
                    while ((n = in.read(buffer)) != -1) { count += n; if (count > MAX_BYTES) throw new IllegalArgumentException("This EPUB is larger than 30 MB."); out.write(buffer, 0, n); }
                }
                if (count == 0) throw new IllegalArgumentException("The EPUB file is empty.");
                entry.put("name", name).put("size", count);
                synchronized (pending) { files.put(id, target); pending.put(id, entry); }
            } catch (Exception e) {
                target.delete(); entry.put("error", e instanceof SecurityException ? "File access expired. Open the EPUB again from your file manager." : e.getMessage() == null ? "The EPUB file cannot be opened." : e.getMessage());
                synchronized (pending) { if (pending.size() < 4) pending.put(id, entry); }
            }
            notifyListeners("incomingEpub", new JSObject());
        });
    }

    @PluginMethod public void pending(PluginCall call) {
        synchronized (pending) { call.resolve(new JSObject().put("file", pending.isEmpty() ? null : pending.values().iterator().next())); }
    }
    @PluginMethod public void read(PluginCall call) {
        worker.execute(() -> {
            try {
                File file; synchronized (pending) { file = files.get(call.getString("id", "")); }
                long offset = call.getInt("offset", -1);
                if (file == null || offset < 0 || offset >= file.length()) throw new IllegalArgumentException("Incoming EPUB is no longer available. Open it again.");
                byte[] chunk = new byte[(int)Math.min(256 * 1024, file.length() - offset)];
                try (RandomAccessFile input = new RandomAccessFile(file, "r")) { input.seek(offset); input.readFully(chunk); }
                call.resolve(new JSObject().put("base64", Base64.encodeToString(chunk, Base64.NO_WRAP)));
            } catch (Exception e) { call.reject("Unable to read the incoming EPUB.", e); }
        });
    }
    @PluginMethod public void finish(PluginCall call) {
        synchronized (pending) { String id = call.getString("id", ""); File file = files.remove(id); if (file != null) file.delete(); pending.remove(id); }
        call.resolve();
    }
    @Override protected void handleOnDestroy() {
        worker.shutdownNow();
        synchronized (pending) { for (File file : files.values()) file.delete(); files.clear(); pending.clear(); }
    }
}
