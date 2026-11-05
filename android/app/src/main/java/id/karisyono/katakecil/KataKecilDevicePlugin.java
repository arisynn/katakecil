package id.karisyono.katakecil;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.os.Bundle;
import android.util.Base64;
import android.media.AudioAttributes;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;
import android.speech.tts.Voice;
import android.view.WindowManager;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Device-only functions. Published books still use the existing revision-checked HTTPS API. */
@CapacitorPlugin(name = "KataKecilDevice")
public class KataKecilDevicePlugin extends Plugin {
    private TextToSpeech speech;
    private boolean speechReady = false;
    private final List<PluginCall> initializing = new ArrayList<>();
    private PluginCall speaking;
    private String utteranceId;
    private boolean saving = false;

    private Boolean lastSystemDark;
    static boolean systemDark(android.content.Context context){
        android.app.UiModeManager manager=context.getSystemService(android.app.UiModeManager.class);
        if(manager!=null){int mode=manager.getNightMode();if(mode==android.app.UiModeManager.MODE_NIGHT_YES)return true;if(mode==android.app.UiModeManager.MODE_NIGHT_NO)return false;}
        int night=android.content.res.Resources.getSystem().getConfiguration().uiMode&android.content.res.Configuration.UI_MODE_NIGHT_MASK;
        if(night==android.content.res.Configuration.UI_MODE_NIGHT_YES)return true;
        if(night==android.content.res.Configuration.UI_MODE_NIGHT_NO)return false;
        return (context.getResources().getConfiguration().uiMode&android.content.res.Configuration.UI_MODE_NIGHT_MASK)==android.content.res.Configuration.UI_MODE_NIGHT_YES;
    }
    private void reportSystemAppearance(){
        boolean dark=systemDark(getContext());if(lastSystemDark!=null&&lastSystemDark==dark)return;lastSystemDark=dark;
        notifyListeners("systemAppearanceChange",new JSObject().put("dark",dark));
    }
    @PluginMethod public void systemAppearance(PluginCall call){boolean dark=systemDark(getContext());lastSystemDark=dark;call.resolve(new JSObject().put("dark",dark));}
    @Override protected void handleOnConfigurationChanged(android.content.res.Configuration config){reportSystemAppearance();if(getActivity() instanceof MainActivity)((MainActivity)getActivity()).applyLaunchAppearance();}

    @PluginMethod
    public void rememberAppearance(PluginCall call) {
        String mode=call.getString("mode","light"),background=call.getString("background","#faf9f5"),accent=call.getString("accent","#54756c");
        if(!mode.matches("light|dark|system|sepia|paper|green|custom")||!background.matches("#[0-9a-fA-F]{6}")||!accent.matches("#[0-9a-fA-F]{6}")){call.reject("Invalid appearance");return;}
        boolean dark=Boolean.TRUE.equals(call.getBoolean("dark",false));
        android.content.SharedPreferences settings=getContext().getSharedPreferences("katakecil_appearance",0);
        boolean changed=!settings.contains("mode")||!mode.equals(settings.getString("mode","light"))||dark!=settings.getBoolean("dark",false);
        settings.edit().putString("mode",mode).putString("background",background).putString("accent",accent).putBoolean("dark",dark).apply();
        getActivity().runOnUiThread(()->{
            // Android persists this per-app mode and uses it for subsequent starting windows.
            if(changed)androidx.appcompat.app.AppCompatDelegate.setDefaultNightMode(mode.equals("system")?androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM:dark?androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_YES:androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_NO);
            if(changed&&android.os.Build.VERSION.SDK_INT>=31){
                android.app.UiModeManager manager=getContext().getSystemService(android.app.UiModeManager.class);
                int next=mode.equals("system")?android.app.UiModeManager.MODE_NIGHT_AUTO:dark?android.app.UiModeManager.MODE_NIGHT_YES:android.app.UiModeManager.MODE_NIGHT_NO;
                if(manager!=null)manager.setApplicationNightMode(next);
            }
            if(getActivity() instanceof MainActivity)((MainActivity)getActivity()).applyLaunchAppearance();
            reportSystemAppearance();call.resolve();
        });
    }

    @PluginMethod
    public void finishLaunch(PluginCall call){
        getActivity().runOnUiThread(()->{if(getActivity() instanceof MainActivity)((MainActivity)getActivity()).finishLaunch();call.resolve();});
    }

    @PluginMethod
    public void saveJson(PluginCall call) {
        String filename = call.getString("filename", "katakecil-backup.json");
        String text = call.getString("text", "");
        if (!filename.matches("[a-zA-Z0-9._-]{1,150}\\.json") || text.getBytes(StandardCharsets.UTF_8).length > 8 * 1024 * 1024) {
            call.reject("Invalid backup file or file is larger than 8 MB."); return;
        }
        getActivity().runOnUiThread(() -> {
            if (saving) { call.reject("Another file is being saved."); return; }
            saving = true;
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            intent.putExtra(Intent.EXTRA_TITLE, filename);
            try { startActivityForResult(call, intent, "documentCreated"); }
            catch (Exception error) { saving = false; call.reject("No file picker is available.", error); }
        });
    }

    @PluginMethod
    public void saveFile(PluginCall call) {
        String filename=call.getString("filename", "book.epub"), mime=call.getString("mime", ""), data=call.getString("base64", "");
        if(!filename.matches("[a-zA-Z0-9._-]{1,150}\\.epub") || !mime.equals("application/epub+zip") || data.isEmpty() || data.length()>32*1024*1024) {call.reject("Invalid EPUB file.");return;}
        getActivity().runOnUiThread(() -> {
            if(saving){call.reject("Another file is being saved.");return;}saving=true;
            Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType(mime);
            intent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);intent.putExtra(Intent.EXTRA_TITLE,filename);
            try{startActivityForResult(call,intent,"documentCreated");}catch(Exception error){saving=false;call.reject("No file picker is available.",error);}
        });
    }

    @ActivityCallback
    private void documentCreated(PluginCall call, ActivityResult result) {
        saving = false;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.resolve(new JSObject().put("saved", false)); return;
        }
        try (OutputStream output = getContext().getContentResolver().openOutputStream(result.getData().getData(), "w")) {
            if (output == null) throw new java.io.IOException("File is unavailable.");
            String encoded=call.getString("base64");
            output.write(encoded==null?call.getString("text", "").getBytes(StandardCharsets.UTF_8):Base64.decode(encoded,Base64.DEFAULT));
            output.flush();
            call.resolve(new JSObject().put("saved", true));
        } catch (Exception error) { call.reject("Unable to save the file. Choose another location.", error); }
    }

    @PluginMethod
    public void setKeepAwake(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (Boolean.TRUE.equals(call.getBoolean("enabled", false))) getActivity().getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            else getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            call.resolve();
        });
    }

    @PluginMethod
    public void setOrientation(PluginCall call) {
        String orientation = call.getString("orientation", "auto");
        if (!java.util.Arrays.asList("auto", "portrait", "landscape").contains(orientation)) { call.reject("Invalid orientation."); return; }
        getActivity().runOnUiThread(() -> {
            int value = orientation.equals("portrait") ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_PORTRAIT : orientation.equals("landscape") ? ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE : ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED;
            getActivity().setRequestedOrientation(value);
            call.resolve();
        });
    }

    @PluginMethod
    public void initializeSpeech(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (speechReady) { resolveVoices(call); return; }
            initializing.add(call);
            if (speech != null) return;
            speech = new TextToSpeech(getContext(), status -> getActivity().runOnUiThread(() -> {
                speechReady = status == TextToSpeech.SUCCESS;
                if (speechReady) {
                    speech.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_MEDIA).setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build());
                    installProgressListener();
                }
                List<PluginCall> calls = new ArrayList<>(initializing);
                initializing.clear();
                for (PluginCall pending : calls) {
                    if (speechReady) resolveVoices(pending);
                    else pending.reject("No speech engine is available. Install a text-to-speech engine in Android settings.");
                }
                if (!speechReady && speech != null) { speech.shutdown(); speech = null; }
            }));
        });
    }

    private void resolveVoices(PluginCall call) {
        JSArray voices = new JSArray();
        if (speech.getVoices() != null) {
            List<Voice> installed = new ArrayList<>(speech.getVoices());
            installed.sort(Comparator.comparing(Voice::getName));
            for (Voice voice : installed) {
                if (voice.getFeatures() != null && voice.getFeatures().contains(TextToSpeech.Engine.KEY_FEATURE_NOT_INSTALLED)) continue;
                JSObject entry = new JSObject();
                entry.put("name", voice.getName());
                entry.put("lang", voice.getLocale().toLanguageTag());
                entry.put("localService", !voice.isNetworkConnectionRequired());
                voices.put(entry);
            }
        }
        call.resolve(new JSObject().put("voices", voices));
    }

    private void installProgressListener() {
        speech.setOnUtteranceProgressListener(new UtteranceProgressListener() {
            @Override public void onStart(String id) {
                getActivity().runOnUiThread(() -> {
                    if (id.equals(utteranceId)) notifyListeners("speechProgress", new JSObject().put("utteranceId", id).put("start", true));
                });
            }
            @Override public void onDone(String id) { finishSpeech(id, null); }
            @Override public void onError(String id) { finishSpeech(id, "Android could not read this passage."); }
            @Override public void onError(String id, int errorCode) { finishSpeech(id, "Android speech error: " + errorCode); }
            @Override public void onStop(String id, boolean interrupted) { finishSpeech(id, "Speech cancelled."); }
            @Override public void onRangeStart(String id, int start, int end, int frame) {
                getActivity().runOnUiThread(() -> {
                    if (id.equals(utteranceId)) notifyListeners("speechProgress", new JSObject().put("utteranceId", id).put("charIndex", start).put("charLength", end - start));
                });
            }
        });
    }

    private void finishSpeech(String id, String error) {
        getActivity().runOnUiThread(() -> {
            if (!id.equals(utteranceId) || speaking == null) return;
            PluginCall call = speaking; speaking = null; utteranceId = null;
            if (error == null) call.resolve(); else call.reject(error);
        });
    }

    private void cancelSpeech() {
        PluginCall previous = speaking; speaking = null; utteranceId = null;
        if (speech != null) speech.stop();
        if (previous != null) previous.reject("Speech cancelled.");
    }

    @PluginMethod
    public void speak(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            if (!speechReady || speech == null) { call.reject("Initialize speech first."); return; }
            String text = call.getString("text", ""), id = call.getString("utteranceId", "");
            if (text.isEmpty() || text.length() > 4000 || id.isEmpty() || id.length() > 100) { call.reject("Invalid speech passage."); return; }
            cancelSpeech();
            String requested = call.getString("voice", "");
            Voice chosen = null;
            if (speech.getVoices() != null) for (Voice voice : speech.getVoices()) if (voice.getName().equals(requested)) chosen = voice;
            if (chosen == null || speech.setVoice(chosen) == TextToSpeech.ERROR) { call.reject("No voice is installed for this language. Choose an available voice."); return; }
            double rate = call.getDouble("rate", 1.0);
            if (!Double.isFinite(rate)) { call.reject("Invalid speech rate."); return; }
            speech.setSpeechRate((float) Math.max(0.5, Math.min(2.0, rate)));
            speaking = call; utteranceId = id;
            if (speech.speak(text, TextToSpeech.QUEUE_FLUSH, new Bundle(), id) == TextToSpeech.ERROR) finishSpeech(id, "Android could not start reading.");
        });
    }

    @PluginMethod
    public void stopSpeech(PluginCall call) {
        getActivity().runOnUiThread(() -> { cancelSpeech(); call.resolve(); });
    }

    @Override protected void handleOnPause() {
        getActivity().runOnUiThread(() -> {
            // Notify JS first, so ReadAloud checkpoints its word before the native promise is cancelled.
            notifyListeners("activityChange", new JSObject().put("active", false));
            cancelSpeech();
            getActivity().getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        });
    }

    @Override protected void handleOnResume() {
        reportSystemAppearance();
        notifyListeners("activityChange", new JSObject().put("active", true));
    }

    @Override protected void handleOnDestroy() {
        cancelSpeech();
        for (PluginCall pending : initializing) pending.reject("The app was closed.");
        initializing.clear();
        if (speech != null) speech.shutdown();
        speech = null; speechReady = false;
    }
}
