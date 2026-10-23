# Laporan uji 1.2-shelf — 23 Oktober 2026

Cabang lokal `feat/cover-shelf-apk-web-push`, berdasarkan `e73effb`.
Tidak ada push, deployment Vercel, SQL produksi, perubahan akun, naskah atau
kebijakan Auth yang dijalankan. Semua tes penulisan memakai data sintetis dan
PostgreSQL lokal PGlite. Pengirim notifikasi asli tidak dijalankan.

## Pemeriksaan yang dijalankan

| Pemeriksaan | Hasil |
| --- | --- |
| `npm run check` | Lulus: TypeScript frontend/server, struktur source, 13 suite aktif. |
| `npm run test:browser` | Keempat suite V7.2–V7.5 lulus setelah fixture disesuaikan untuk penggantian PWA: reader/preview/progres, EPUB/ZIP, sampul, editor/revisi/konflik, publikasi/jadwal, hapus/pulih lokal. |
| `npm run test:crystal` | Lulus: sampul tanpa caption, tiga kolom ponsel, popup/info/jadwal publik, episode ke reader, progres, login/reload/logout sintetis, Studio/save/guards, impor/jadwal, retry katalog. |
| `node scripts/test-web-delivery.mjs` | Lulus: rak 12 buku, tiga sampul satu baris, popup 120 episode dengan pencarian/paginasi, batas tinggi dan lebar 320/390/768/1440px dalam kedua tema, Escape dan pemulihan gulir; popup APK bisa ditutup dan tidak berulang; tidak ada manifest PWA; pilihan push web dengan izin ditolak/diterima, token ownership konsisten saat unsubscribe, dan keadaan server belum aktif. Push API browser memakai mock. |
| `npm run test:android` | Lulus dengan bridge mock desktop: startup, native viewport/tanpa SW, Back/guard/history/background, external browser, system bars, export share, notifikasi opt-in/cancel, cek APK versi baru/sama, tombol unduh, penolakan URL APK lintas origin. |
| `npm run test:push` | Lulus: PostgreSQL nyata lokal untuk RLS/grant khusus server, ownership, pendaftaran ulang, batas percobaan dan lease; validasi origin/body/provider/key, enkripsi Web Push/VAPID tanpa jaringan; metadata melalui public client/RLS; pengirim dilindungi secret; pesan hanya publik, endpoint mati dibersihkan dan cursor kegagalan dipertahankan. |
| Build Android | Vite target Chrome 111, `cap sync android`, Gradle `assembleRelease assembleDebug` berhasil dengan JDK 21, SDK 36, AGP 8.13, Gradle 8.14.3. |
| Build web | `npm run release:web` berhasil. Tool memeriksa identitas/versi dan tanda tangan APK sebelum membuat manifest unduhan. Build web memakai konfigurasi publik Supabase yang sama dengan APK; konfigurasi lokal tidak masuk ZIP source. |
| Bundle/unduhan | Smoke produksi lulus: inisialisasi Supabase publik, Library dan lazy login Studio tanpa error JS; URL lokal `downloads/latest.json` dan APK benar-benar tersedia, ukuran serta SHA-256 unduhan cocok. Request backend diintersep, bukan penulisan produksi. |
| Dependensi | `npm audit --omit=dev` melaporkan 0 kerentanan saat diuji. Ini bukan sertifikasi aplikasi oleh Google. |

## APK yang diverifikasi

- `KataKecil-1.2.apk`, **6.122.656 byte**.
- Package `app.katakecil.mobile`, label KataKecil, versionCode **3**, versionName
  **1.2-shelf**, min SDK 24, target SDK 36; minimum WebView 111.
- Release tidak debuggable, dengan sertifikat pengujian yang sama seperti APK
  sebelumnya. Tanda tangan diverifikasi oleh `apksigner`, metadata oleh `aapt`.
- Aset native cocok byte per byte dengan aset yang disinkronkan. APK tidak
  memuat APK lain di dalamnya, manifest PWA, `server.url` produksi, atau referensi
  konfigurasi privileged server pada JavaScript bundle.
- Tidak ada permission kamera, lokasi, storage luas, exact alarm, foreground
  service, atau `REQUEST_INSTALL_PACKAGES`. Permission yang dipertahankan:
  internet/status jaringan, notifikasi, boot, wake lock dan receiver internal.
- SHA-256:

```text
d0b0d1b421784e2e57a9725ebcca261af2a2cb7d37e47c77d5e6900192b383aa
```

APK debug terbaru tersedia terpisah. Artefak versi sebelumnya dipertahankan.

## Batas verifikasi dan status aktivasi

- Tidak ada ponsel/emulator Android siap pakai. Lingkungan tanpa `/dev/kvm`;
  percobaan emulator software pada pengerjaan sebelumnya gagal menyelesaikan
  boot. Tidak ada klaim uji WebView asli, gesture/keyboard/picker, pemasangan
  pembaruan di atas APK lama, splash perangkat, atau pengiriman notifikasi OS.
- Tidak ada akun penulis uji produksi. Sesi/reload/login/logout/save diuji dengan
  fixture sintetis; operasi penulis dan session expiry di perangkat tetap perlu
  kredensial uji. Tidak ada OAuth/magic-link atau kebijakan Auth baru ditambahkan.
- **Website produksi belum dipublikasikan.** PWA dihapus dalam source/build yang
  diberikan; situs yang sedang online tetap versi yang sudah ada.
- **Tawaran update APK memerlukan publikasi** APK dan `latest.json` pada host
  website. Belum diaktifkan di host produksi oleh pekerjaan ini. Android masih
  meminta konfirmasi instalasi; tidak ada auto-install atau hot update React.
  Package dan signer yang sama adalah syarat update tanpa uninstall; kecocokan
  signer dibuktikan statis, bukan pemasangan langsung di perangkat.
- **Push web belum diaktifkan di produksi.** Perlu meninjau/memasang migration
  khusus push, environment server VAPID/backend, deployment API, dan scheduler.
  Endpoint subscription asli/provider/izin OS belum diuji. Deteksi episode server
  berkala, bukan push seketika saat publish. Lihat batas dan aktivasi pada
  [WEB_PUSH_SETUP.md](WEB_PUSH_SETUP.md).
- Notifikasi Android tetap berupa reminder lokal dan pemeriksaan metadata
  WorkManager. Belum memakai FCM. Doze, force-stop, kanal, reboot dan ketepatan
  waktu harus diperiksa di ponsel.
- Play Protect belum diuji dan tidak dijamin lolos. Validitas tanda tangan dan
  audit dependensi tidak menggantikan pemeriksaan Google pada perangkat.
- Membaca/menyimpan tetap memerlukan internet. Tidak ada offline cache novel
  atau sinkronisasi baru. Web worker notifikasi tidak mengintersep atau meng-cache
  halaman; pemasangan PWA telah dihapus sesuai permintaan.
- Workflow GitHub disediakan sebagai source, belum dipush/dijalankan. Build
  menampilkan peringatan chunk CSS besar dan deprecation Gradle; build berhasil.

Petunjuk build, hosting unduhan dan signing ada di [SHELF_UPDATE.md](SHELF_UPDATE.md).
