# Efek kaca global dan pembaruan APK

Basis: `main` GitHub ditarik tanpa konflik sampai `796a26f`, termasuk proyek Android serta dokumentasi/rilis Preview 1. Implementasi berada di `feat/advanced-reader`. Versi baru `1.0.1-preview.2`, versionCode `2`.

## Efek kaca

`dist/glass.css` mengadaptasi CSS `kaca.css` yang diberikan pemilik proyek untuk pekerjaan ini. Fondasi visualnya memakai fill transparan, blur/saturasi, highlight inset, shadow, dan tepi lensa bergradasi. Tidak ada paket tambahan atau kode aplikasi referensi yang disalin. Ini simulasi optik CSS, bukan refraksi fisik isi halaman.

Aturan kaca terakhir menjadi satu sumber gaya untuk `.glass`, kartu Settings, dialog, picker dan permukaan preview slider. Teks dan sampul buku tidak diberi blur. Tint mengikuti warna palet global dan warna aktif mengikuti aksen pengguna; label aktif memakai warna teks palet jika aksen tidak memenuhi kontras 4.5:1. Panel Custom memakai warna bidang solid agar kontras warna yang sudah divalidasi tetap berlaku. Kontrol anak memakai tint tanpa backdrop blur tambahan; backdrop layar penuh tidak diblur lagi.

`dist/glass-tabs.js` menyediakan satu elemen lensa dekoratif per baris tab, diukur dari tombol aktif. Tidak ada label salinan, target fokus tambahan atau gesture drag yang mengambil alih swipe/pinch Reader. Tombol dan role/aria yang sudah ada dipertahankan. ResizeObserver, perubahan bahasa/DOM dan font loading memperbarui posisi; resize memakai snap, pergantian tab memakai transisi. Reduced motion mematikan transisi. Tanpa dukungan blur digunakan permukaan solid; tanpa mask-composite dipakai border lensa biasa.

Bottom navigation Library/Settings tidak dihidupkan kembali. Tab buku diperbarui di tempat, sebagaimana tab Appearance, sehingga sheet, header, tablist, lensa dan wadah isi bertahan. Preview slider tetap memakai satu pseudo-element di belakang kontrol asli: tidak ada spread shadow tebal, perpindahan input atau penundaan timer saat dilepas.

## Updater Android

UI ada di **Settings → App → App updates**, hanya pada APK. Startup dapat memeriksa di latar tanpa membuka panel atau mengunduh otomatis; setelah satu pemeriksaan berhasil, pemeriksaan otomatis berikutnya dibatasi 24 jam. Tombol pemeriksaan manual tetap tersedia. Hanya timestamp keberhasilan yang disimpan, bukan token atau isi rilis/buku.

Native plugin `KataKecilUpdates` mengakses daftar publik `https://api.github.com/repos/arisynn/katakecil/releases?per_page=30`. Endpoint daftar diperlukan karena `/latest` melewatkan prerelease. Pilihan rilis menggunakan urutan SemVer, bukan perbandingan string/tanggal. Draft, tag tak valid, versi lama/sama dan aset yang tidak kompatibel diabaikan. Build Preview menerima rilis Preview dan stabil yang lebih baru; build stabil hanya menerima rilis stabil.

Unduhan dimulai lewat tombol pengguna. Ada progres, pembatalan, retry, empty/current state, error jaringan/rate limit dan pemulihan bila berkas cache hilang/berubah. Menutup panel tidak membuka ulang panel saat operasi selesai. Hasil pemeriksaan tidak langsung memasang APK.

Validasi native sebelum pemasangan:

1. Aset berasal dari path download repo `arisynn/katakecil` melalui HTTPS. Redirect hanya ke host aset GitHub yang diizinkan; tidak ada URL arbitrer dari JavaScript.
2. Tepat satu APK Karisyono yang memenuhi konvensi nama dan batas 100 MB, dengan ukuran tepat dan SHA-256 dari digest aset GitHub atau berkas `.apk.sha256`.
3. Android membaca package ID, versionName, versionCode dan signing certificate APK. Package harus sama dengan instalasi aktif, versionCode harus lebih tinggi dan versionName harus sesuai tag rilis tanpa `v`.
4. Signing certificate APK harus sama dengan aplikasi yang sedang terpasang. Hash berkas dan identitas APK diperiksa ulang ketika tombol Install ditekan.
5. APK berada di cache privat `updates/`; FileProvider hanya mengekspor path tersebut dengan grant baca sementara kepada installer. Tidak ada izin penyimpanan seluruh perangkat.

`REQUEST_INSTALL_PACKAGES` digunakan untuk distribusi APK langsung. Jika Android 8+ belum mengizinkan sumber KataKecil, tombol Install membuka halaman izin resmi. Pengguna kembali lalu mengetuk Install lagi. Android tetap meminta konfirmasi pemasangan. Aplikasi tidak menyediakan silent installation atau melewati otorisasi OS. Kebijakan Play Store perlu ditinjau terpisah bila distribusi kelak berubah ke Play Store.

Preview 1 belum memiliki updater. Pengguna memasang Preview 2 secara manual satu kali di atas instalasi lama, tanpa uninstall. ID paket serta sertifikat Karisyono dipertahankan. Kunci signing diterima dari pemilik, dipakai di direktori privat di luar repo dan tidak dikemas ke APK/source ZIP.

Unduhan yang terputus tidak menghasilkan APK siap dipasang. Cache dapat dibersihkan OS; pengguna dapat memeriksa/mengunduh ulang. Unduhan saat aplikasi berada di background tidak dijanjikan bertahan jika proses dibunuh Android. Pembaruan tidak memindahkan atau menghapus database bacaan; ketahanan data saat upgrade nyata tetap perlu uji perangkat.

## Kontrak rilis berikutnya

- Ubah `app-version.json`: versi SemVer dan versionCode integer yang meningkat. Gunakan versi prerelease di sini jika rilis masih Preview.
- Jalankan `npm test`, `npm run typecheck`, `npm run check`, lalu build release dengan SDK/JDK dan direktori kunci Karisyono yang sama. `android:release` menjalankan testReleaseUnitTest, assembleRelease, lintRelease, signing, verifikasi dan zipalign.
- Publikasikan tag `v<version>` di GitHub Releases, bukan draft; set status prerelease sesuai versi.
- Unggah tepat satu `KataKecil-<version>-Karisyono.apk` dan berkas bernama sama dengan akhiran `.sha256`. Skrip menghasilkan format checksum yang sesuai updater. Metadata `KataKecil-release-info.json` dan source/checksum lain tetap bisa dilampirkan.
- Jangan memakai versionCode lama, mengubah package ID/sertifikat, atau mengganti APK tanpa mengganti tag/versi. Release API dan aset harus tetap publik agar pemeriksaan anonim bekerja.

Tidak ada dependensi npm baru, perubahan Supabase, akun baru, migrasi database, penyimpanan naskah tambahan, deployment situs atau backend dalam pekerjaan ini. Penandatanganan memakai Android SDK resmi; integrasi platform menggunakan Capacitor yang sudah ada.

## Pengujian

Baseline setelah pull: 63 tes lulus. Suite web: 69 lulus. Setelah penyesuaian akhir, 14 tes terarah lulus. Native policy: 3 unit test lulus untuk SemVer/channel/draft/downgrade dan batas URL HTTPS/repo/CDN. Build, typecheck, pemeriksaan sintaks/publication/module graph serta Android assembleRelease/lintRelease lulus.

Chromium memuat aplikasi asli dengan EPUB Alice domain publik, Settings dan popup tema, serta mengukur lensa pada 18 kombinasi tab/lebar layar. Sheet/lensa bertahan, reduced motion berlaku, tombol updater tersembunyi di browser, tanpa uncaught exception. Fixture Reader memakai modul/CSS asli untuk 120 kombinasi slider, enam lebar layar dan light/dark; kontrol tidak bergeser, satu permukaan, dan release langsung memulihkan sheet.

APK lulus verifikasi signature v2/v3 dan alignment; sertifikat SHA-256 cocok dengan Preview 1. Semua 59 file web yang dipaketkan sama dengan `dist/` yang diuji. Peringatan lint yang tersisa terkait versi wrapper Gradle, resource konfigurasi/string dan monochrome launcher icon, bukan error build.

Belum ada emulator/HP fisik. Alur permission/installer, pemasangan pembaruan nyata dan persistensi data, performa ponsel rendah, serta interaksi vendor/IME/TTS tetap memerlukan QA perangkat. Tidak mengklaim tes UI JavaScript sebagai bukti installer Android. Fakta dan output: [validasi](generated/glass-update-validation.json), [log tes](generated/glass-update-test-output.txt).

## File dan rollback

Gaya dan perilaku UI: `dist/glass.css`, `dist/glass-tabs.js`, `dist/app-updates.js`, entry `dist/index.html`, glue `dist/app.js`, serta patch tab `dist/reader-experience.js`. Adapter: `src/platform/index.ts` dan bundle `dist/platform.js`. Android: plugin update/policy/test, pendaftaran MainActivity, manifest dan path FileProvider. Build: `app-version.json` dan `scripts/build-android.mjs`. Tambahan tes berada di `tests/app-updates.test.mjs`, `tests/glass-tabs.test.mjs` dan regresi panel buku. README/changelog/index/panduan rilis diperbarui tanpa menimpa fakta historis Preview 1.

Rollback source web dengan revert commit fitur dan rebuild. Android melarang downgrade versionCode biasa: bila perlu rollback perilaku, bangun source sebelumnya dengan versionCode lebih tinggi dan sertifikat yang sama, lalu distribusikan sebagai rilis perbaikan. Jangan menyarankan uninstall sebagai rollback rutin; simpan backup lewat fitur yang sudah ada sebelum pengujian upgrade.
