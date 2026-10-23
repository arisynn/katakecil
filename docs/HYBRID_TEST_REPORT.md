# KataKecil 1.4 — hasil uji reader hybrid

23 Oktober 2026. Basis v1.3 `2b19284`. Worktree terisolasi
`/workspace/katakecil-web-push-edge`, cabang `feat/supabase-web-push`.
Migrasi push tersimpan dalam commit terpisah `16d95e3`; reader hybrid ada pada
commit berikutnya. Working copy dan seluruh artefak 1.3 tetap tidak berubah.
Tidak ada push remote, deploy Vercel/Edge, SQL atau perubahan record produksi.

## Uji yang dijalankan

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run check` | Lulus TypeScript frontend/server, struktur, dan 13 suite regresi SQL/reader/import/editor/sampul/jadwal. |
| `npm run test:epub` dan browser final | Lulus parser EPUB 2/3, byte/hash sumber utuh, TOC berjangkar, frontmatter, batas episode, RLS/grant, sumber khusus penulis, idempotensi dan kegagalan balasan. |
| Reader hybrid browser | Studio upload → private preview pada reader utama → terbit/jadwal WIB → Library/popup → reader yang sama, tanpa iframe/page EPUB khusus. Hanya metadata/isi terbit yang tampil, tanpa unduhan sumber asli publik. |
| Teks/ilustrasi | Lebih dari 90 paragraf tetap dimuat dalam satu bagian; gambar raster didekode dan dimensinya muat halaman. Sanitasi menjaga teks tebal/miring, menolak skema aktif/iframe/skrip/gambar remote; teks hasil parser dan anchor konsisten. |
| Preferensi/progres | Tema/ukuran teks global, penanda, daftar isi, next/previous, reload offset, migrasi ratio v1.3 ke progres bersama, reset offset bila hash sumber berubah. LocalStorage hanya metadata; private preview tidak menulis progres pembaca. |
| Layout/error | 320, 390, 768, 1440 px dan tema terang/gelap; status API belum aktif dengan retry; bab masa depan dan buku privat tidak terbuka. |
| `npm run test:crystal` | Lulus alur reader episode lama, Library padat, login/session reload/logout sintetis, editor save, seluruh rute Studio/jadwal, guard, serta popup internal Sampah/restore. |
| `npm run test:browser` | V7.2–V7.5 lulus: preview/editor/revisi/konflik, sampul, jadwal, impor/penerbitan batch, penghapusan dan pemulihan. |
| `npm run test:push` | SQL push, receipt/retry, worker IndexedDB, kontrak Cron, tiga entrypoint Deno frozen typecheck, dua runtime/enkripsi Deno test lulus. Detail pada `WEB_PUSH_EDGE_TEST_REPORT.md`. |
| `node scripts/test-web-delivery.mjs` | Lulus rak sampul/popup/jadwal, tawaran APK, opt-in/denial/grant/unsubscribe Edge dan keadaan belum aktif; tidak ada dialog izin otomatis. Push API sintetis. |
| `npm run test:android` | Kontrak bridge desktop lulus: Back/history/minimize, bar sistem, eksternal browser, ekspor, pengingat, konfigurasi WorkManager, izin notifikasi dan penawaran pembaruan. |
| `npm run build:android` | Vite Android, validasi konfigurasi publik, aset tanpa APK bersarang, dan Capacitor sync lulus. |
| Gradle JDK 21 | `assembleDebug assembleRelease --no-daemon` lulus; APK nyata tersedia dan nonempty. |
| `npm run verify:apk` | aapt + apksigner, identitas/versi/debug flag, tanda tangan, 146 aset hasil sync identik byte per byte dalam kedua APK. Tidak ada APK bersarang/env/manifest PWA atau server.url. |
| `npm run release:web` | APK release divalidasi, latest.json/SHA disiapkan dan build web lulus. |
| `node scripts/test-bundled-smoke.mjs` | Bundle produksi Library/login memulai Supabase publik, EPUB memakai reader utama tanpa iframe, APK unduhan cocok versi/ukuran/hash. Semua API diintersep; tidak menulis ke produksi. |
| `npm audit --omit=dev` | 0 kerentanan dependensi produksi pada saat uji. |

Pengujian awal paralel memicu reload cold dependency optimizer Vite dan dua tes
browser gagal; pengulangan sesudah optimizer siap lulus. Tidak diklaim sebagai
kegagalan perangkat. Verifikasi paket juga menemukan hook unduhan web berjalan
saat dev server ditutup. Hook dibatasi `apply:build`, guard aset ditambahkan,
Android dibangun ulang dan isi kedua APK diperiksa lagi. Smoke build web awal
menemukan konfigurasi publik web lokal belum diisi; build final menggunakan URL
+ publishable key proyek yang sama dengan Android, tanpa secret server.

## APK final

- Paket `app.katakecil.mobile`, nama KataKecil; versionCode **5**, versionName
  **1.4-hybrid**; Android 7/API 24 minimum, target API 36, portrait.
- Release pengujian **6.131.841 byte**, tidak debuggable; SHA-256:
  `52c87f30a10dca0ffe5217ed760a1717ac955828a7ad0e8b382fff6b46afa6cf`.
- Debug **13.150.073 byte**; SHA-256:
  `4497b99ed8bc615d3297e072029d22c84e74ffde4435d29f50a6bbb1f9a77872`.
- Fingerprint sertifikat keduanya:
  `45b782d7140d15b02682faed337056c0786dc1bf0cf7b626faf18ceffa07ff48`,
  cocok dengan APK 1.3 yang diverifikasi menggunakan apksigner. Pembaruan lokal
  dapat dipasang tanpa uninstall bila versi terpasang memakai sertifikat itu.
- Izin terpakai: internet, status jaringan, notifikasi, boot completed dan wake
  lock untuk worker; tidak menambah izin pemasangan APK atau akses penyimpanan luas.
- Seluruh tampilan dimuat dari aset lokal; data tetap melalui backend online.

## Belum diuji / perlu aktivasi

Tidak ada ponsel/emulator (`adb devices` kosong). Instalasi/peluncuran native,
WebView file picker, gesture/keyboard, notifikasi OS nyata dan Play Protect belum
diuji. Tanda tangan pengujian yang valid bukan jaminan lolos Play Protect; tidak
ada sertifikasi/pemindaian Google yang diklaim.

Login/Storage pada browser menggunakan fixture sintetis. Kredensial penulis asli,
pengiriman provider Web Push dan pg_cron/pg_net terkelola memerlukan uji staging.
Backend EPUB v1.3 belum terpasang pada proyek live yang diaudit; APK/source saja
tidak mengaktifkannya. Web Push Edge/Cron juga belum diterapkan/diaktifkan. Ikuti
`EPUB_UPDATE.md` dan `WEB_PUSH_SETUP.md`; jangan menjalankan dua pengirim bersamaan.
VAPID deployment tidak dibuat ulang atau dimasukkan ke frontend/APK/ZIP.

Posisi ratio EPUB lama dikonversi secara perkiraan; progres baru menggunakan
anchor teks. Layout penerbit mengikuti gaya reader, dengan ilustrasi raster dan
format inline dasar. Fixed layout/DRM, offline novel dan FCM native baru tidak
ditambahkan. Notifikasi lokal/WorkManager Android lama dipertahankan.

Peringatan build yang tidak menghalangi: dynamic import reader juga digunakan
secara statis, metadata SDK/flatDir, Kotlin daemon dan deprecation menuju Gradle 9.
Toolchain yang dipin berhasil mengompilasi dan menandatangani APK final.
