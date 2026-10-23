# KataKecil 1.5 — perapian seluruh antarmuka

Basis: reader hybrid 1.4, commit `ccfd631`. Cabang lokal `feat/ui-polish`.
Website/database produksi dan artefak 1.3/1.4 tidak ditimpa.

## Tampilan dan interaksi

- Library tetap hanya sampul, tiga kolom pada ponsel. Header, pencarian, jarak rak
  dan jumlah cerita dirapikan tanpa menambah tombol Baca atau menu utama baru.
- Popup buku menjadi kartu mengambang yang dibatasi viewport, dengan teks lebih
  jelas, jadwal padat dan daftar episode yang dapat digulir. Pada desktop,
  episode disusun dua kolom. Pada viewport pendek, panel dapat digulir utuh;
  sinopsis sementara disembunyikan agar kontrol tetap dapat dijangkau.
- Header Library/Studio menggunakan bentuk kontrol dan permukaan kristal yang
  sama. Menu Library mendukung Arrow Up/Down, Home/End, Escape dan pemulihan fokus.
- Studio mempertahankan karya berdampingan; sampul, judul dan metadata dipadatkan
  dalam satu kartu. Label kecil diperbesar, kontrol formulir diseragamkan, tab
  dan status aktif dibuat jelas. Editor memiliki toolbar yang mudah disentuh,
  area menulis yang tetap nyaman dan chrome dengan lebih sedikit ruang kosong.
- Impor, kalender, statistik, data, Sampah, pengaturan buku/sampul dan pengaturan
  aplikasi mengikuti skala jarak/border/radius yang sama. Panel tanggal kosong
  tidak lagi memaksakan tinggi 320 px; kartu pengaturan disusun berdampingan
  saat lebar cukup. Seluruh kontrol/jadwal penerbitan tetap tersedia.
- Notifikasi memakai sakelar visual dengan semantics checkbox asli, izin tetap
  diminta hanya setelah tindakan pengguna. Popup unduhan/pembaruan/konfirmasi
  internal juga mengikuti ukuran dan kontras yang sama.
- Semua dialog yang memakai hook fokus bersama mengunci scroll latar dengan
  hitungan modal, lalu memulihkan scroll/fokus saat ditutup. Dialog native HTML
  memakai aturan scroll tersendiri. Fokus input pencarian berada pada pembungkus
  sehingga tidak menggandakan bingkai fokus.
- Reader EPUB dan episode biasa tetap memakai komponen/geometri yang sama.
  Toolbar, menu, daftar isi, settings, loading/error dirapikan; teks naskah dan
  algoritma pagination tidak diubah. Keadaan error/kosong menyediakan tombol
  kembali ke Library atau editor agar pembaca tidak terjebak.

Stylesheet aktif `src/design/interface.css` menyatukan finishing di atas CSS
fitur yang masih digunakan. Tidak menghapus stylesheet lama secara massal.
Kontras terang/gelap, safe-area, reduced motion, fallback blur/color-mix dan input
16 px pada pencarian dipertahankan untuk keterbacaan dan browser mobile.

Tidak ada perubahan schema, RLS, Auth, endpoint, storage EPUB, cron, VAPID,
penjadwalan cerita, offline sync atau mekanisme notifikasi backend pada update UI
ini. Aktivasi backend versi sebelumnya tetap mengikuti `EPUB_UPDATE.md` dan
`WEB_PUSH_SETUP.md`; paket source/APK tidak mengaktifkan layanan produksi.

## Hasil verifikasi

| Pemeriksaan yang dijalankan | Hasil |
| --- | --- |
| `npm run check` | TypeScript, struktur dan 13 suite regresi lulus. |
| `npm run test:crystal` | Lulus: Library/reader/progres; login/save/session/logout sintetis; semua rute Studio pada 320/390/768/1440 px, dua tema; kartu karya <200 px pada 390 px; panel kalender kosong <240 px; pengaturan berdampingan; kembali dari error offline; popup Sampah/restore, guard dan retry. |
| `node scripts/test-web-delivery.mjs` | Lulus: 3 kolom sampul saja; popup 120 episode/pencarian/paginasi, dua tema, lebar 320–1440 px dan tinggi 480/740 px; menu keyboard/fokus, scroll lock dan pemulihan; promosi APK, opt-in/denial/grant/unsubscribe dan sakelar native checkbox. |
| `npm run test:epub` | Parser/SQL/RLS serta alur upload utuh → preview → rilis/jadwal → Library → reader hybrid lulus. Ilustrasi, penanda, progres/migrasi/reset versi, batas episode dan error endpoint tetap lulus. |
| `npm run test:browser` | V7.2–V7.5 lulus, termasuk sampul, editor/revisi/konflik, impor/publikasi, jadwal, hapus/restore dan layout. |
| `npm run test:android` | Kontrak bridge desktop lulus: startup, Back/history/minimize, bar sistem, tautan eksternal, ekspor, notifikasi dan penawaran pembaruan. Percobaan awal timeout saat persiapan native mock; pengulangan lulus. Diagnostik startup ditambah agar kegagalan berikutnya terlihat. |
| Android | Vite Android, guard aset, Capacitor sync, Gradle JDK 21 assembleDebug/assembleRelease lulus. |
| `npm run verify:apk` | Identitas, versi, signature dan 146 aset lokal dalam kedua APK diverifikasi; tidak ada server.url/APK bersarang/env/manifest PWA. |
| Web | `npm run release:web` lulus; smoke produksi memeriksa Library/login, reader EPUB pada bundle utama, tanpa error JS, dan kecocokan unduhan APK/version manifest/SHA-256. API diintersep saat pengujian. |

Screenshot diperiksa untuk Library, popup buku/notifikasi, karya, editor, detail
buku, impor, kalender, pengaturan, EPUB dan konfirmasi Sampah. Backend/auth dan
konten menggunakan data sintetis; tidak ada penulisan data produksi.

## APK dan build

Paket `app.katakecil.mobile`, versionCode **6**, versionName **1.5-polish**.
Release pengujian: **6.136.305 byte**, tidak debuggable. SHA-256:
`4c21cd1302d0a756ed2191092632250800769196e0131834dd737c9ddb8998a0`.
Debug: **7.332.501 byte**, SHA-256:
`03f05fffd37416fa8e18f621dd5c45b9aa34692ffd4307eab25544574dacb47f`.
Keduanya memakai sertifikat pengujian yang sama dengan APK 1.4:
`45b782d7140d15b02682faed337056c0786dc1bf0cf7b626faf18ceffa07ff48`.
Dapat dipasang sebagai pembaruan tanpa uninstall jika signer versi terpasang sama.

```sh
npm ci
# Isi .env.local/.env.android.local dengan URL + publishable key publik.
npm run check
npm run test:crystal
node scripts/test-web-delivery.mjs
npm run test:epub
npm run test:browser
npm run test:android
# JDK 21, ANDROID_HOME dengan SDK 36/build-tools 35/36.
npm run build:android
cd android
./gradlew assembleDebug assembleRelease --no-daemon
cd ..
npm run verify:apk
npm run release:web
node scripts/test-bundled-smoke.mjs
```

Gunakan keystore pemilik yang tetap untuk distribusi umum. Workflow Android yang
sudah ada tetap tersedia; local keys dan environment tidak termasuk source ZIP.

## Batas verifikasi

`adb devices` kosong. Instalasi/peluncuran nyata, keyboard/pemilih berkas WebView,
gesture dan notifikasi OS belum diuji di ponsel. Kontrak desktop dan APK bertanda
tangan bukan jaminan Play Protect. Akun penulis dan push provider nyata juga belum
dipakai. Tidak ada deploy, push remote, migrasi, aktivasi Cron atau rotasi VAPID.
