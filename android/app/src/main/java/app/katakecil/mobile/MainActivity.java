package app.katakecil.mobile;

import android.os.Bundle;
import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ReaderChromePlugin.class);
        registerPlugin(ChapterAlertsPlugin.class);
        android.content.SharedPreferences appearance = getSharedPreferences("katakecil_appearance", MODE_PRIVATE);
        if (appearance.contains("dark")) getDelegate().setLocalNightMode(appearance.getBoolean("dark", false) ? androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_YES : androidx.appcompat.app.AppCompatDelegate.MODE_NIGHT_NO);
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
    }
}
