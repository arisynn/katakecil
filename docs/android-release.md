# KataKecil Android dan source web bersama

Pembaruan terbaru: [Preview 2](releases/v1.0.1-preview.2.md), [efek kaca dan updater](glass-and-updates.md). Catatan versi pertama berikut dipertahankan sebagai riwayat.

Versi pertama: **1.0.0**, versionCode **1**, application ID
`id.karisyono.katakecil`. Branch: `feat/android-app`, dari `85eb4e6`.
Logo launcher dan splash menggunakan PNG asli repo tanpa perubahan gambar.
Sertifikat release: **CN=Karisyono**, RSA 4096, APK Signature Scheme v2/v3.

**Hasil implementasi:** APK memuat UI, font, parser dan helper dari aset lokal
`dist/`. Katalog dan EPUB server tetap menggunakan HTTPS `katakecil-reader`
dengan verifikasi revisi yang sama. Tidak ada `server.url` yang memuat situs
sebagai UI, perubahan database, atau deployment backend.

| Bagian | Source web dan Android | Tambahan Android |
| --- | --- | --- |
| Kembali | Handler menutup picker, keyboard/dialog, seleksi, lalu kembali ke Library. Browser Back memakai satu entry penjaga dan tetap dapat meninggalkan situs dari Library. | Tombol/gesture Back melalui Capacitor App; keluar normal dari Library. |
| Data | Save backup / Restore backup di Settings → Advanced, dengan preview, validasi 8 MB, merge berdasarkan timestamp, tombstone penghapusan, dan identitas perangkat yang dipertahankan. Ekspor catatan lama tetap bisa diimpor. | Penyimpanan berkas melalui ACTION_CREATE_DOCUMENT, tanpa izin akses semua berkas. Impor memakai pemilih berkas WebView/Android. |
| Reader | Posisi disimpan ketika meninggalkan reader, pindah aplikasi, atau halaman disembunyikan. Dialog mempertimbangkan tinggi viewport saat keyboard tampil; target sentuh diperbesar. | Layar penuh melalui SystemBars, safe area melalui Capacitor, EdgeToEdge, orientasi dan FLAG_KEEP_SCREEN_ON. |
| Suara | Mesin ReadAloud, anchor posisi, kontrol dan paint kata tetap sama; browser memakai EasySpeech. | Driver Android TextToSpeech, daftar suara terpasang, flag offline/online, start/range callbacks, volume media dan penghentian saat aplikasi dijeda. |

**Membangun ulang:** gunakan Node 24+, JDK **21 dengan javac**, Android SDK
platform **36**, build-tools **36.0.0**, dan platform-tools. Gradle wrapper
**8.14.3** serta Capacitor **8.6.0** disertakan/dipin; plugin App **8.1.2**.
Minimum Android API **24** (Android 7), dengan Android System WebView **113+**.
Perangkat dengan WebView usang perlu memperbarui WebView.

```sh
npm ci
npm test
npm run typecheck
npm run check

# ANDROID_HOME atau android/local.properties harus menunjuk SDK lokal.
export JAVA_HOME=/path/to/jdk-21
export ANDROID_HOME=/path/to/android-sdk
npm run android:debug

# Hanya sekali untuk identitas release baru; jangan membuat ulang ketika update.
npm run android:key -- /private/path/katakecil-signing
KATAKECIL_SIGNING_DIR=/private/path/katakecil-signing npm run android:release
```

`android:release` menjalankan build web, Capacitor sync, assembleRelease,
lintRelease, zipalign, penandatanganan, verifikasi sertifikat, dan checksum.
Default output berada di `artifacts/`; atur `KATAKECIL_OUTPUT_DIR` untuk direktori
lain. SDK/JDK, `android/local.properties`, build output dan signing files tidak
masuk Git. Skrip meneruskan proxy HTTP yang diwarisi ke Gradle tanpa mematikan
TLS; jika JDK terpisah memerlukan CA lingkungan, gunakan truststore CA yang
disediakan lingkungan melalui GRADLE_OPTS. Jangan menonaktifkan TLS.

**Kunci penandatanganan:** folder privat berisi PKCS12 dan `signing.json`
dengan password. Cadangkan secara pribadi dan gunakan kunci yang sama untuk
setiap APK pembaruan. Backup ini terpisah dari source dan APK. Untuk pembaruan,
naikkan versionCode/version di `app-version.json` dan pertahankan ID paket. Gradle, nama APK, checksum dan metadata release mengikuti berkas versi tersebut. Build release juga menjalankan `testReleaseUnitTest`. Android Studio juga bisa dipakai melalui `npx cap open android`.

**Memindahkan data dari web:** source web baru menambahkan Save backup. Setelah
source tersebut dipublikasikan pada situs asal, ekspor dari browser lama dan
impor JSON pada APK. Ekspor catatan versi lama dapat dipulihkan sekarang, tetapi
tidak membawa progres atau pengaturan yang belum diekspor saat itu. Restore
menampilkan jumlah record sebelum pengguna menekan tombol pemulihan. Data yang
lebih baru dan catatan yang sudah dihapus di perangkat tujuan dipertahankan;
benturan ID lintas buku ditolak sebelum penulisan. Impor EPUB pribadi kembali
dari berkas aslinya; isi buku server tidak disertakan dalam backup.

**Pemeriksaan:** hasil final ada di `generated/android-validation.json`.
Pengujian Node/JSDOM meliputi reader lama, backup yang rusak/berbahaya, metadata
yang dibatasi, merge/tombstone, identitas perangkat, browser Back, dan alur
preview/pemulihan melalui UI web. Pemeriksaan CORS dilakukan dari host dengan
Origin `https://localhost`, bukan klaim menjalankan WebView di HP. Android
assembleRelease dan lintRelease dijalankan; verifikasi APK memeriksa sertifikat,
signature scheme, alignment, manifest dan kesamaan aset web/logo.

**Batas QA dan distribusi:** belum ada emulator atau HP fisik yang dipakai.
Sentuhan nyata, IME/notch/rotasi, pemilih berkas berbagai vendor, persistensi
setelah update/restart HP, audio dan range event mesin TTS memerlukan uji
perangkat. Suara yang tersedia bergantung pada paket suara Android; suara online
dapat memerlukan jaringan. Baca nyaring dijeda saat aplikasi ditinggalkan,
bukan layanan audio background/lock-screen. Layar penuh dan penguncian orientasi
dapat dipengaruhi kebijakan perangkat, terutama tablet/multi-window.

APK ini untuk distribusi langsung/pengujian. Publikasi Play Store/AAB belum
dijalankan. Situs live tidak dipublikasikan oleh pekerjaan source ini. Status
hardening gateway lama `lumina-library` yang disebut dokumentasi sebelumnya
tetap perlu diverifikasi pada proses rilis publik backend; membangun APK tidak
menerapkan patch tersebut.
