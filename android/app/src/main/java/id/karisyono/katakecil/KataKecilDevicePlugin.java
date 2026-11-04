package id.karisyono.katakecil;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.ActivityInfo;
import android.os.Bundle;
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
            intent.putExtra(Intent.EXTRA_TITLE, filename);
            try { startActivityForResult(call, intent, "documentCreated"); }
            catch (Exception error) { saving = false; call.reject("No file picker is available.", error); }
        });
    }

    @ActivityCallback
    private void documentCreated(PluginCall call, ActivityResult result) {
        saving = false;
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK || result.getData() == null || result.getData().getData() == null) {
            call.resolve(new JSObject().put("saved", false)); return;
        }
        try (OutputStream output = getContext().getContentResolver().openOutputStream(result.getData().getData(), "wt")) {
            if (output == null) throw new java.io.IOException("File is unavailable.");
            output.write(call.getString("text", "").getBytes(StandardCharsets.UTF_8));
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
