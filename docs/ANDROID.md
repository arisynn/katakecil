# KataKecil Android

For the current Library/Writer Studio redesign, new branding, notifications,
release testing APK, and updated build steps, see [CRYSTAL.md](CRYSTAL.md).
The original debug APK and original test report describe the earlier integration.

Capacitor 8.5.3 wraps the existing React/Vite app. Package: `app.katakecil.mobile`.
The APK contains `dist`, served by Capacitor at `https://localhost`; it does not load the website through `server.url`. Minimum Android: 7.0 (API 24), with Android System WebView 111 or newer. Target/compile: API 36.

## Build

Install Node 24, JDK 21 and Android SDK platform 36 / build tools 35.0.0 and 36.0.0. Set `ANDROID_HOME` to the SDK directory (or set `sdk.dir` in ignored `android/local.properties`).

```sh
npm ci
cp .env.example .env.android.local
# Edit the two VITE_SUPABASE_* entries using your EXISTING PUBLIC browser config.
npm run check
npm run android:debug
```

Result: `android/app/build/outputs/apk/debug/app-debug.apk`. Copy it as `KataKecil-debug.apk` for sharing. `npm run build:android` validates public config, builds with Vite's `android` mode and runs `cap sync android`. Never place secret or service-role keys in VITE variables. The environment used for the delivered APK was recovered from the public production JavaScript, and kept in an ignored local file.

For Android Studio, run `npm run build:android` then `npm run android:open`. After every frontend change, rebuild and synchronize before compiling.

## Install

Transfer `KataKecil-debug.apk` to the phone, open it, and allow installation from that file manager when Android requests it. Or use `adb install -r KataKecil-debug.apk`. This is a real debug-signed APK, suitable for testing; it is not a Play Store release. Future updates must use the same signing key or Android requires uninstalling the old build (which clears app sessions/settings). CI runners normally generate a different debug key on each run.

## GitHub Actions

The manual **Android debug APK** workflow requires repository Actions variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` containing public browser configuration. It installs the SDK, checks source, bundles/synchronizes, compiles, verifies signing and uploads `KataKecil-debug` as an artifact. No deployment, push, database command or privileged credential is needed. The workflow is supplied locally and has not been pushed or executed on GitHub.

## Native behavior

- Crystal book/quill launcher icon, adaptive safe-zone foreground, branded splash and startup transition, portrait activity.
- Capacitor SystemBars native insets protect content from status/navigation bars and cutouts. Native bootstrap selects `viewport-fit=auto`; the website keeps `cover`. The Android activity uses edge-to-edge and `adjustResize` for the keyboard. Both system bar icon styles follow the app theme.
- Back dismisses accessible dialogs/menus through existing Escape handlers, traverses internal history through existing unsaved-work guards, or returns to home. At home it backgrounds the activity instead of terminating it. Android handles keyboard/picker Back first.
- External HTTP(S) anchor links use a browser Custom Tab. The app retains its origin for internal navigation.
- Existing email/password auth persists through SDK localStorage; auto-refresh stops in background and resumes in foreground without remounting Studio. There is no OAuth, magic-link, sign-up or password-reset UI in the audited source, so no new deep-link scheme or production redirect allowlist is required.
- The website PWA remains network-only. Native builds skip SW registration and unregister SWs confined to the native origin. Existing online/offline notices remain active. UI assets work offline; novels and Studio operations require the backend. No offline novel-reading or new synchronization system is provided.
- Studio CSV/JSON export opens Android’s share sheet from a scoped cache file, so a receiving app can save or share it. Android manages the cache lifetime; no export is uploaded automatically. The website keeps its browser download.
- File inputs use Capacitor's native WebView document picker, including `content://` provider URIs, with no broad storage permission. Existing ZIP/EPUB parsing workers and native browser `File`/`arrayBuffer` mechanisms are retained. See the test report for what was actually exercised.

## Production safety

Work is isolated on `feat/android-capacitor`. No database policies, records, migrations, Edge Functions, Vercel deployment, or remote branch were changed. Existing Studio membership checks and backend authorization remain in place. The bundled public key is intended for client use; the backend remains responsible for enforcing RLS and author checks. Local PostgreSQL regression tests use synthetic data, not the production database.
