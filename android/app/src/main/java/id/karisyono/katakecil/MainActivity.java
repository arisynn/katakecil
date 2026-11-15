package id.karisyono.katakecil;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.media.AudioManager;
import androidx.activity.EdgeToEdge;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.Animatable;
import android.graphics.drawable.Drawable;
import android.widget.ImageView;
import android.provider.Settings;
import android.os.Handler;
import android.os.Looper;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.core.splashscreen.SplashScreen;
import androidx.core.splashscreen.SplashScreenViewProvider;
import androidx.core.view.WindowInsetsControllerCompat;

public class MainActivity extends BridgeActivity {
    private SplashScreenViewProvider launchSplash;
    private boolean launchReady=false;
    private final Handler launchHandler=new Handler(Looper.getMainLooper());
    private final Runnable launchFallback=()->finishLaunch();

    @Override public void onCreate(Bundle savedInstanceState) {
        SharedPreferences appearance=getSharedPreferences("katakecil_appearance",0);
        AppCompatDelegate.setDefaultNightMode(appearance.getString("mode","light").equals("system")?AppCompatDelegate.MODE_NIGHT_FOLLOW_SYSTEM:appearance.getBoolean("dark",false)?AppCompatDelegate.MODE_NIGHT_YES:AppCompatDelegate.MODE_NIGHT_NO);
        SplashScreen splash=SplashScreen.installSplashScreen(this);
        splash.setOnExitAnimationListener(provider->{
            launchSplash=provider;applyLaunchAppearance();
            // Android 12+ animates its starting icon; older Android uses the provider.
            if(android.os.Build.VERSION.SDK_INT<31 && Settings.Global.getFloat(getContentResolver(),Settings.Global.ANIMATOR_DURATION_SCALE,1f)>0f && provider.getIconView() instanceof ImageView){
                Drawable icon=((ImageView)provider.getIconView()).getDrawable();
                if(icon instanceof Animatable)((Animatable)icon).start();
            }
            if(launchReady)finishLaunch();else launchHandler.postDelayed(launchFallback,8000);
        });
        registerPlugin(KataKecilDevicePlugin.class);
        registerPlugin(KataKecilUpdatePlugin.class);
        registerPlugin(KataKecilImportPlugin.class);
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);setVolumeControlStream(AudioManager.STREAM_MUSIC);
        applyLaunchAppearance();
    }

    public void applyLaunchAppearance(){
        SharedPreferences prefs=getSharedPreferences("katakecil_appearance",0);
        boolean system=prefs.getString("mode","light").equals("system");
        boolean dark=system?KataKecilDevicePlugin.systemDark(this):prefs.getBoolean("dark",false);
        int background=Color.parseColor(system?(dark?"#11161c":"#eef2f6"):prefs.getString("background","#eef2f6"));
        getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(background));
        if(getBridge()!=null)getBridge().getWebView().setBackgroundColor(background);
        new WindowInsetsControllerCompat(getWindow(),getWindow().getDecorView()).setAppearanceLightStatusBars(!dark);
        if(launchSplash!=null){
            launchSplash.getView().setBackgroundColor(background);
            if(launchSplash.getIconView() instanceof ImageView){
                Drawable icon=((ImageView)launchSplash.getIconView()).getDrawable();
                if(icon!=null)icon.mutate().setTint(Color.parseColor(prefs.getString("accent","#54756c")));
            }
        }
    }

    // The animated OS book bridges to the dedicated web launch scene.
    // The web overlay remains until the catalog or resumed reading page has been rendered.
    public void finishLaunch(){
        launchReady=true;launchHandler.removeCallbacks(launchFallback);
        if(launchSplash!=null){
            if(launchSplash.getIconView() instanceof ImageView){
                Drawable icon=((ImageView)launchSplash.getIconView()).getDrawable();
                if(icon instanceof Animatable)((Animatable)icon).stop();
            }
            launchSplash.remove();launchSplash=null;
        }
    }
    @Override public void onDestroy(){launchHandler.removeCallbacks(launchFallback);if(launchSplash!=null){launchSplash.remove();launchSplash=null;}super.onDestroy();}
}
