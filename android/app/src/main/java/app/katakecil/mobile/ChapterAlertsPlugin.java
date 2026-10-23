package app.katakecil.mobile;

import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.*;
import com.getcapacitor.*;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.concurrent.TimeUnit;

/** Opt-in public chapter checks. No user token, account, or manuscript is stored. */
@CapacitorPlugin(name = "ChapterAlerts")
public class ChapterAlertsPlugin extends Plugin {
    static final String PREFS = "katakecil_notifications";
    static final String WORK = "katakecil_chapter_checks";
    private SharedPreferences prefs() { return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE); }

    @PluginMethod
    public void getSettings(PluginCall call) {
        SharedPreferences p = prefs();
        JSObject out = new JSObject();
        out.put("chapters", p.getBoolean("enabled", false));
        out.put("reminder", p.getBoolean("reminder", false));
        out.put("time", p.getString("time", "20:00"));
        out.put("lastChecked", p.getLong("lastChecked", 0));
        out.put("allowed", NotificationManagerCompat.from(getContext()).areNotificationsEnabled());
        call.resolve(out);
    }

    @PluginMethod
    public void saveReminder(PluginCall call) {
        String time = call.getString("time", "20:00");
        if (!time.matches("(?:[01][0-9]|2[0-3]):[0-5][0-9]")) { call.reject("Waktu tidak valid"); return; }
        prefs().edit().putBoolean("reminder", call.getBoolean("enabled", false)).putString("time", time).apply();
        call.resolve();
    }

    @PluginMethod
    public void configure(PluginCall call) {
        boolean enabled = call.getBoolean("enabled", false);
        if (!enabled) {
            prefs().edit().putBoolean("enabled", false).apply();
            WorkManager.getInstance(getContext()).cancelUniqueWork(WORK);
            WorkManager.getInstance(getContext()).cancelUniqueWork(WORK + "_initial");
            call.resolve(); return;
        }
        String endpoint = call.getString("url", ""), key = call.getString("key", "");
        Uri uri = Uri.parse(endpoint);
        if (!"https".equals(uri.getScheme()) || uri.getHost() == null || !uri.getHost().endsWith(".supabase.co") || !isPublicKey(key)) {
            call.reject("Konfigurasi backend publik tidak valid"); return;
        }
        if (!NotificationManagerCompat.from(getContext()).areNotificationsEnabled()) { call.reject("Izin notifikasi belum diaktifkan"); return; }
        boolean wasEnabled = prefs().getBoolean("enabled", false);
        SharedPreferences.Editor edit = prefs().edit().putString("url", endpoint.replaceAll("/+$", "")).putString("key", key).putBoolean("enabled", true);
        if (!wasEnabled) edit.remove("seen"); // A new opt-in establishes a quiet baseline.
        edit.apply();
        Constraints constraints = new Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build();
        PeriodicWorkRequest work = new PeriodicWorkRequest.Builder(ChapterCheckWorker.class, 15, TimeUnit.MINUTES)
            .setInitialDelay(15, TimeUnit.MINUTES).setConstraints(constraints).build();
        WorkManager.getInstance(getContext()).enqueueUniquePeriodicWork(WORK, ExistingPeriodicWorkPolicy.UPDATE, work);
        OneTimeWorkRequest initial = new OneTimeWorkRequest.Builder(ChapterCheckWorker.class).setConstraints(constraints).build();
        WorkManager.getInstance(getContext()).enqueueUniqueWork(WORK + "_initial", ExistingWorkPolicy.KEEP, initial);
        call.resolve();
    }

    private boolean isPublicKey(String key) {
        if (key.matches("sb_publishable_[A-Za-z0-9_-]+")) return true;
        try {
            String[] pieces = key.split("\\.");
            String payload = new String(android.util.Base64.decode(pieces[1], android.util.Base64.URL_SAFE), java.nio.charset.StandardCharsets.UTF_8);
            return "anon".equals(new org.json.JSONObject(payload).optString("role"));
        } catch (Exception ignored) { return false; }
    }

    @PluginMethod
    public void consumeRoute(PluginCall call) {
        String route = getActivity().getIntent().getStringExtra("katakecil_route");
        getActivity().getIntent().removeExtra("katakecil_route");
        JSObject out = new JSObject(); out.put("route", route == null ? "" : route); call.resolve(out);
    }

    @Override
    protected void handleOnNewIntent(Intent intent) {
        if (intent.hasExtra("katakecil_route")) {
            JSObject out = new JSObject(); out.put("route", intent.getStringExtra("katakecil_route"));
            notifyListeners("routeRequested", out, true);
            intent.removeExtra("katakecil_route");
        }
    }
}
