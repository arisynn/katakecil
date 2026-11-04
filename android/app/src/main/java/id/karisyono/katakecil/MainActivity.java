package id.karisyono.katakecil;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.media.AudioManager;
import androidx.activity.EdgeToEdge;

public class MainActivity extends BridgeActivity {
    @Override public void onCreate(Bundle savedInstanceState) {
        registerPlugin(KataKecilDevicePlugin.class);
        registerPlugin(KataKecilUpdatePlugin.class);
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
    }
}
