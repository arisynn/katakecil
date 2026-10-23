package app.katakecil.mobile;

import android.graphics.Color;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/** Colors the native inset area so system icons stay readable with app themes. */
@CapacitorPlugin(name = "ReaderChrome")
public class ReaderChromePlugin extends Plugin {
    @PluginMethod
    public void setBackground(PluginCall call) {
        final String color = call.getString("color", "#F4F8FD");
        if (!color.matches("#[0-9a-fA-F]{6}")) {
            call.reject("Invalid system bar color");
            return;
        }
        getActivity().runOnUiThread(() -> {
            boolean dark = color.equalsIgnoreCase("#081425");
            getContext().getSharedPreferences("katakecil_appearance", android.content.Context.MODE_PRIVATE).edit().putBoolean("dark",dark).apply();
            if (android.os.Build.VERSION.SDK_INT >= 31) {
                android.app.UiModeManager manager = getContext().getSystemService(android.app.UiModeManager.class);
                manager.setApplicationNightMode(dark ? android.app.UiModeManager.MODE_NIGHT_YES : android.app.UiModeManager.MODE_NIGHT_NO);
            }
            getActivity().getWindow().getDecorView().setBackgroundColor(Color.parseColor(color));
            call.resolve();
        });
    }
}
