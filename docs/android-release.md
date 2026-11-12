# KataKecil Android dan source web bersama

Pembaruan terbaru: [1.2.4 Stable](releases/v1.2.4.md), [pengaturan kaca dan ambient](liquid-glass-settings.md). Catatan versi pertama berikut dipertahankan sebagai riwayat.

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

## Rilis official 1.1.0

Versi1.1.0, versionCode4, package dan signer Karisyono tetap. Status official disetujui pengguna setelah pemeriksaan Android. Atas instruksi terbaru, QA suite/browser/HP tidak diulang pada sesi rilis ini. Perintah `npm run android:release -- --skip-qa` membangun dan menyelaraskan/menandatangani APK tanpa `testReleaseUnitTest` atau `lintRelease`; default skrip tetap menjalankan keduanya. Verifikasi signature/checksum merupakan pemeriksaan integritas paket, bukan QA penggunaan.

Splash memakai AndroidX Core SplashScreen1.2.0 existing. Animated vector kutip melakukan fade dan gerak vertikal berurutan dari kiri ke kanan. Preferensi tema/accent dicerminkan secara lokal ke SharedPreferences. Saat Activity menyediakan splash view, latar memakai palette tersimpan dan lingkaran logo memakai accent; WebView diberi warna dasar yang sama. Android12+ memakai application night mode untuk starting window selanjutnya. Frame pertama yang digambar OS masih mengikuti resource launch theme, terutama sebelum preferensi APK baru pernah dicerminkan; custom color diterapkan saat callback splash tersedia. Ikon launcher memakai accent default Sage, bukan ikon dinamis per-pengguna. Tidak ada janji mengubah ikon launcher mengikuti setiap accent custom.

Animasi dihentikan/dihapus saat web telah merender tampilan pertama, menghormati pengaturan animasi Android, dan memiliki batas pemulihan8 detik bila bootstrap gagal. Batas tersebut bukan penundaan minimum dan tidak menunggu unduhan buku. Tidak ada library splash tambahan.

## Patch official1.1.1

Logo PNG sumber dipertahankan utuh; drawable launcher memberi inset6dp agar kutip tidak terpotong oleh adaptive mask. Vektor/animator kutip tambahan pada1.1.0 dihapus. Native starting window hanya menjembatani ke loader web yang sudah ada; overlay web bertahan hingga resume/pagination selesai atau Library/error telah dirender. Ini tidak mengunduh seluruh buku: hanya episode yang sedang dibuka. Pemilihan Library yang tersimpan dipertahankan.

Android system theme kini dibaca lewat UiModeManager/konfigurasi sistem melalui plugin; perubahan native dilaporkan ke web dan mode AppCompat diperbarui saat pilihan tema berubah. Pembacaan tidak bergantung hanya pada prefers-color-scheme milik WebView yang bisa mengikuti tema aplikasi sendiri. Loader pagination memperoleh frame paint sebelum perhitungan dan sesudah pemulihan anchor, tanpa timer tunggu tambahan. Resize keyboard saat editor aktif tetap ditunda untuk menjaga input.

Build memakai `--skip-qa` sesuai instruksi pengguna; tidak menjalankan suite atau browser/HP. Pemilik melakukan QA lanjutan. Setelah push frontend, sinkronkan origin preview exact dari deployment berhasil repo ke konfigurasi fungsi Reader; konfigurasi ini bersifat spesifik deployment dan tidak memerlukan perubahan policy/database.
