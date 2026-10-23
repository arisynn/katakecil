import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.katakecil.mobile',
  appName: 'KataKecil',
  webDir: 'dist',
  // No server.url: the UI is packaged into the APK.
  android: { backgroundColor: '#081425', allowMixedContent: false, minWebViewVersion: 111 },
  server: { errorPath: 'native-error.html' },
  plugins: {
    SplashScreen: { launchShowDuration: 250, showSpinner: false },
    LocalNotifications: { smallIcon: 'ic_stat_book', iconColor: '#235DB4' },
    SystemBars: { style: 'LIGHT', insetsHandling: 'native', initialViewportFitValueHint: 'auto' },
  },
};
export default config;
