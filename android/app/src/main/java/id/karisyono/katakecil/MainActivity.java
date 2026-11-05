package id.karisyono.katakecil;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;
import android.media.AudioManager;
import androidx.activity.EdgeToEdge;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Color;
import android.graphics.drawable.Animatable;
import android.graphics.drawable.GradientDrawable;
import android.os.Handler;
import android.os.Looper;
import android.view.View;
import android.widget.ImageView;
import androidx.appcompat.app.AppCompatDelegate;
import androidx.appcompat.content.res.AppCompatResources;
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
            launchSplash=provider;
            View icon=provider.getIconView();
            if(icon instanceof ImageView){
                ImageView image=(ImageView)icon;
                image.setImageDrawable(AppCompatResources.getDrawable(this,R.drawable.splash_mark_animated));
                if(image.getDrawable() instanceof Animatable&&animationsEnabled())((Animatable)image.getDrawable()).start();
            }
            applyLaunchAppearance();
            if(launchReady)finishLaunch();
            else launchHandler.postDelayed(launchFallback,8000); // Recovery ceiling, never a minimum splash duration.
        });
        registerPlugin(KataKecilDevicePlugin.class);
        registerPlugin(KataKecilUpdatePlugin.class);
        super.onCreate(savedInstanceState);
        EdgeToEdge.enable(this);
        setVolumeControlStream(AudioManager.STREAM_MUSIC);
        applyLaunchAppearance();
    }

    private boolean animationsEnabled(){return android.os.Build.VERSION.SDK_INT<26||android.animation.ValueAnimator.areAnimatorsEnabled();}

    public void applyLaunchAppearance(){
        SharedPreferences prefs=getSharedPreferences("katakecil_appearance",0);
        boolean system=prefs.getString("mode","light").equals("system");
        boolean dark=system?(getResources().getConfiguration().uiMode&Configuration.UI_MODE_NIGHT_MASK)==Configuration.UI_MODE_NIGHT_YES:prefs.getBoolean("dark",false);
        int background=Color.parseColor(system?(dark?"#191d1b":"#faf9f5"):prefs.getString("background","#faf9f5"));
        int accent=Color.parseColor(prefs.getString("accent","#54756c"));
        getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(background));
        if(getBridge()!=null)getBridge().getWebView().setBackgroundColor(background);
        new WindowInsetsControllerCompat(getWindow(),getWindow().getDecorView()).setAppearanceLightStatusBars(!dark);
        if(launchSplash!=null){
            launchSplash.getView().setBackgroundColor(background);
            GradientDrawable tile=new GradientDrawable();tile.setShape(GradientDrawable.OVAL);tile.setColor(accent);
            View icon=launchSplash.getIconView();icon.setBackground(tile);
            if(icon instanceof ImageView)((ImageView)icon).setImageTintList(android.content.res.ColorStateList.valueOf(androidx.core.graphics.ColorUtils.calculateLuminance(accent)>.35?Color.rgb(21,25,24):Color.WHITE));
        }
    }

    public void finishLaunch(){
        launchReady=true;launchHandler.removeCallbacks(launchFallback);
        if(launchSplash==null)return;
        SplashScreenViewProvider provider=launchSplash;launchSplash=null;
        provider.getView().animate().alpha(0f).setDuration(animationsEnabled()?180:0).withEndAction(()->{
            if(provider.getIconView() instanceof ImageView){android.graphics.drawable.Drawable drawable=((ImageView)provider.getIconView()).getDrawable();if(drawable instanceof Animatable)((Animatable)drawable).stop();}
            provider.remove();
        }).start();
    }

    @Override public void onDestroy(){launchHandler.removeCallbacks(launchFallback);if(launchSplash!=null){launchSplash.remove();launchSplash=null;}super.onDestroy();}
}
