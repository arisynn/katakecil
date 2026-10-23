package app.katakecil.mobile;

import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import androidx.annotation.NonNull;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.work.*;
import org.json.*;
import javax.net.ssl.HttpsURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.*;

/** Reads only released public metadata; Android controls when periodic work runs. */
public class ChapterCheckWorker extends Worker {
    public ChapterCheckWorker(@NonNull Context context, @NonNull WorkerParameters parameters) { super(context, parameters); }

    @NonNull @Override public Result doWork() {
        synchronized (ChapterCheckWorker.class) {
            Context context = getApplicationContext();
            SharedPreferences prefs = context.getSharedPreferences(ChapterAlertsPlugin.PREFS, Context.MODE_PRIVATE);
            if (!prefs.getBoolean("enabled", false) || !NotificationManagerCompat.from(context).areNotificationsEnabled()) return Result.success();
            try {
                String base = prefs.getString("url", ""), key = prefs.getString("key", "");
                JSONArray books = read(base + "/rest/v1/qr_books?select=id,slug,title&is_published=eq.true&deleted_at=is.null&limit=1000", key);
                Map<String, JSONObject> catalog = new HashMap<>();
                for (int i=0; i<books.length(); i++) { JSONObject b=books.getJSONObject(i); catalog.put(b.getString("id"), b); }
                JSONArray rows = read(base + "/rest/v1/qr_episodes?select=book_id,episode_number,title,release_at&is_enabled=eq.true&deleted_at=is.null&release_at=lte.now&order=release_at.desc&limit=200", key);
                // EPUB rollout is optional. Its original file and future titles
                // are never queried by the worker, only released public metadata.
                try {
                    JSONArray epub = read(base + "/rest/v1/qr_epub_releases?select=book_id,episode_number,title,release_at&is_enabled=eq.true&release_at=lte.now&order=release_at.desc&limit=200", key);
                    for(int i=0;i<epub.length();i++) rows.put(epub.getJSONObject(i));
                } catch(java.io.IOException unavailable) { /* Retry optional EPUB metadata on the next periodic check. */ }
                LinkedHashSet<String> seen = new LinkedHashSet<>();
                boolean baseline = !prefs.contains("seen");
                JSONArray stored = new JSONArray(prefs.getString("seen", "[]"));
                for(int i=0;i<stored.length();i++) seen.add(stored.getString(i));
                Map<String, JSONObject> fresh = new LinkedHashMap<>();
                for (int i=0;i<rows.length();i++) {
                    JSONObject row=rows.getJSONObject(i); String bookId=row.getString("book_id");
                    if(!catalog.containsKey(bookId)) continue;
                    String id=bookId+":"+row.getInt("episode_number");
                    if(!baseline&&!seen.contains(id)&&!fresh.containsKey(bookId)) fresh.put(bookId,row);
                    seen.add(id);
                }
                if (!prefs.getBoolean("enabled", false) || isStopped()) return Result.success();
                for(Map.Entry<String,JSONObject> entry:fresh.entrySet()) post(context,catalog.get(entry.getKey()),entry.getValue());
                while(seen.size()>1000) seen.remove(seen.iterator().next());
                prefs.edit().putString("seen",new JSONArray(seen).toString()).putLong("lastChecked",System.currentTimeMillis()).apply();
                return Result.success();
            } catch(Exception ignored) {
                // No endpoint, key, metadata or user content is written to logs.
                return getRunAttemptCount()<3?Result.retry():Result.success();
            }
        }
    }

    private JSONArray read(String endpoint, String key) throws Exception {
        HttpsURLConnection connection=(HttpsURLConnection)new URL(endpoint).openConnection();
        connection.setRequestProperty("apikey",key);connection.setRequestProperty("Accept","application/json");
        connection.setRequestProperty("Cache-Control","no-store");connection.setConnectTimeout(15000);connection.setReadTimeout(15000);
        try {
            if(connection.getResponseCode()!=200) throw new java.io.IOException("Public metadata unavailable");
            try(java.io.InputStream stream=connection.getInputStream()) {
                java.io.ByteArrayOutputStream out=new java.io.ByteArrayOutputStream();
                byte[] buffer=new byte[8192];int count;
                while((count=stream.read(buffer))!=-1){if(out.size()+count>1_000_000)throw new java.io.IOException("Metadata limit");out.write(buffer,0,count);}
                byte[] bytes=out.toByteArray();
                return new JSONArray(new String(bytes,StandardCharsets.UTF_8));
            }
        } finally { connection.disconnect(); }
    }

    private void post(Context context, JSONObject book, JSONObject episode) throws JSONException {
        if(Build.VERSION.SDK_INT>=33 && context.checkSelfPermission("android.permission.POST_NOTIFICATIONS")!=PackageManager.PERMISSION_GRANTED)return;
        String channel="katakecil_chapters";
        if(Build.VERSION.SDK_INT>=26)context.getSystemService(NotificationManager.class).createNotificationChannel(new NotificationChannel(channel,"Bab baru",NotificationManager.IMPORTANCE_DEFAULT));
        String route="/baca/"+Uri.encode(book.getString("slug"))+"?episode="+episode.getInt("episode_number");
        int id=700000+Math.floorMod(book.getString("id").hashCode(),1000000);
        Intent intent=new Intent(context,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("katakecil_route",route);
        PendingIntent tap=PendingIntent.getActivity(context,id,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        NotificationCompat.Builder notification=new NotificationCompat.Builder(context,channel)
            .setSmallIcon(app.katakecil.mobile.R.drawable.ic_stat_book).setColor(0xff235DB4)
            .setContentTitle("Bab baru · "+book.getString("title"))
            .setContentText(episode.getString("title")).setStyle(new NotificationCompat.BigTextStyle().bigText(episode.getString("title")))
            .setContentIntent(tap).setAutoCancel(true).setOnlyAlertOnce(true);
        NotificationManagerCompat.from(context).notify(id,notification.build());
    }
}
