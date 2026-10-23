# Android test report — 2026-10-23

## Build and artifact

Built locally from repository baseline `cc9972f8109a09cbd21601ad4385b2d6a4cb7c22` on isolated branch `feat/android-capacitor`.

- Node 24.19.0 / npm 11.9.0; full Temurin JDK 21 installed because the preinstalled Java runtime had no compiler.
- Capacitor core/CLI/Android 8.5.3, Gradle 8.14.3, Android Gradle Plugin 8.13.0, compile/target SDK 36, minimum SDK 24.
- Android SDK and build tools installed locally. Java downloads required the environment proxy and trusted CA store; these environment-specific settings were passed at the command line, not committed into the project.
- Vite production build and `cap sync android`: PASS.
- Android `assembleDebug`: PASS (see supplied build log).
- Real nonempty APK: `KataKecil-debug.apk` (9,536,944 bytes); signature and package metadata independently checked using Android build tools. See the supplied SHA-256 file for the exact delivered binary.
- Package `app.katakecil.mobile`, label KataKecil, launcher activity, portrait orientation, `adjustResize`, INTERNET permission, no cleartext traffic, Android backups disabled: verified from the compiled manifest.
- Packaged `assets/public/index.html`, local JS/CSS/branding assets, compatibility error page, correct Capacitor app ID/name, no `server.url`: verified inside APK.
- Packaged text scanned for `sb_secret_` tokens and JWTs with `service_role` claims: none found. Only public browser configuration is used. No credentials or manuscripts were added to source artifacts.

## Executed application checks

| Check | Result and scope |
| --- | --- |
| `npm run check` | PASS: TypeScript, local imports/assets, all 13 current regression suites. PostgreSQL/PGlite tests use synthetic local databases. |
| Existing web production build | PASS before integration; final web build also executed. |
| V7.2 browser suite | PASS: reading/TOC/chapter retry, offline body purge, progress-related storage privacy, editor navigation/save/conflict, ZIP/EPUB parsing, install dialog, network-only PWA; 320–1440 widths and themes. |
| V7.3 browser suite | PASS: image selection, crop/rotate, EXIF, invalid-file handling, synthetic uploads and publication retry, layouts/themes. |
| V7.4 browser suite | Initial checkpoint-button timeout; passed on isolated rerun. The untouched baseline also passed. This was an intermittent browser-test failure; no revision implementation was changed. |
| V7.5 browser suite | PASS: actual EPUB parsing to synthetic PostgreSQL import/publication, scheduling/pause/resume, bulk management, replay, layouts/themes, no manuscript persistence. |
| `npm run test:android` | PASS in Chromium with native bridge mocks: native bootstrap without JS startup errors, native viewport insets and background color setting, no registered SW, installed notice, Back blocked by leave guard then history navigation, home minimizes, external link uses Browser, themed system bars, export uses scoped cache URI + Share. This does **not** execute Android plugins on a device. |
| Live backend public catalog | Read-only GET returned HTTP 200 with public rows and CORS `https://localhost`. No production data changed. |
| Live reader preflight | OPTIONS returned HTTP 204, CORS `*`; source audit also confirms reader and cover endpoints allow public-origin requests. No episode body request or production write was necessary. |

## Android runtime attempt

No physical phone and no `/dev/kvm` are available in this environment. Installed Android emulator + API 30 system image and attempted software emulation. The image's WebView was 83, so obtained an official API 35 image and extracted its WebView 124 / Trichrome packages to try an update. Software boot remained incomplete and Android system processes reported `DeadSystemException`; installation/update could not be completed reliably. Stopped the unsuccessful emulator. **APK installation, launch, native file chooser, and native plugin behavior are not claimed as passed.**

The package build, signatures and metadata are verified; actual launch still needs a supported device with WebView >=111. The compatibility page is provided for older WebViews.

## Authentication and authorization audit

The existing UI implements email/password login (`signInWithPassword`) and logout, persistent SDK sessions (`persistSession`, `autoRefreshToken`), `getUser` verification, `qr_author_members` membership gating, SIGNED_OUT cleanup and token-refresh handling that does not remount the importer. Native app foreground/background now controls the SDK refresh timer. No OAuth/magic-link UI or callback flow was found; no redirect allowlist or auth policy was changed.

Local regression suites cover backend authorization with synthetic users. No production test account was supplied, so successful production login/logout, expired/refresh-token recovery and restart persistence could not be verified end-to-end. Android uses its own sandboxed localStorage; existing website/PWA sessions and reading settings do not automatically transfer into the APK.

## Required phone QA / known limitations

1. Install the APK on Android >=7.0 with updated Android System WebView >=111; launch in airplane mode to confirm the bundled shell and offline notice. Restore internet and read a published book; navigate chapters and restart to check progress/themes.
2. Log in with an authorized test account; restart and background/resume after token expiry; log out. Verify an unauthorized account cannot enter Studio. Use only a disposable test novel for writes.
3. Create/edit/save a test episode, including long chapter content. Press system Back with unsaved work and open dialogs. Test gesture navigation, keyboard dismissal, input resize and cutout/system bar spacing on the actual phone. Desktop contract tests do not prove those physical behaviors.
4. **Native WebView upload remains unverified.** Pick TXT, Markdown, ZIP and EPUB from Downloads and a cloud document provider. Test cancellation, reselecting a file, background/resume while picker is open, Unicode names, worker parsing, preview, save and permission errors. Cover selection/upload also needs phone testing. Native picker implementation was audited in Capacitor's `BridgeWebChromeClient` (`onShowFileChooser` / `content://` result); browser suites validate the parsing/upload logic only. No broad storage permission or browser-only File System Access API is used.
5. Verify native CSV/JSON export share/save with a receiving app; the plugin calls passed a mock contract test, but the Android share sheet was not executed. Export cache files are user-requested copies and remain in Android-managed application cache.
6. Online content requires Supabase. No offline novel-reading or synchronization feature was added. A backend timeout/error remains subject to existing app error/retry handling.
7. Debug signing is for testing. Keep the same signing key for update installs; independent CI builds normally use different debug keys. This APK is not a signed Play Store release.
8. GitHub workflow is supplied but was not pushed or run. Configure the two public repository variables before running it. No production deployment, database migration, record update or remote push was performed.
