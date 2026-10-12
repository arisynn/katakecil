# KataKecil V4.1 — Mobile Stability + Content Protection

## Yang berubah

- Perbaikan *blank screen* ketika membuka **Studio → Impor**: `ManuscriptImporter` kini diimpor secara eksplisit oleh `Studio.tsx`. Sebelumnya komponen dipanggil tanpa import, menyebabkan `ReferenceError` saat route Impor dirender.
- Studio pada viewport ≤820 px sekarang menggunakan susunan **header → halaman → navigasi bawah** secara vertikal, bukan menempatkan header di sebelah kiri halaman.
- Penyesuaian jarak dan ukuran mobile 320, 360, 390, 412, dan 768 px; desktop tetap memakai sidebar.
- Error Boundary menampilkan pesan dan tombol pemulihan ketika halaman Studio mengalami exception saat render, menggantikan layar putih total.
- Reader publik menerapkan konfigurasi perlindungan berikut:
  - anti-copy/anti-cut/anti-drag/anti-context-menu pada area membaca;
  - larangan seleksi teks standar di area naskah, tetapi **bukan** di editor milik penulis;
  - hasil cetak tidak memuat halaman aplikasi / naskah;
  - *best effort* privacy curtain putih saat dokumen/tab menjadi tersembunyi;
  - watermark **Karisyono** pada halaman baca publik (tipis dan tidak menangkap sentuhan).
- **Zoom browser dan pengaturan ukuran font reader tetap tersedia** demi aksesibilitas.

## Batasan keamanan (wajib dipahami)

Browser/web tidak menawarkan API andal untuk membuat semua screenshot maupun screen-recording menjadi putih. Event `visibilitychange` sering terjadi ketika pindah tab, tetapi **tidak selalu** terjadi sebelum screenshot atau thumbnail multitasking diambil. Anti-copy/anti-print ini hanya menghambat mekanisme browser yang umum; pengunjung dengan Developer Tools, permintaan API yang sah, ataupun kamera lain tetap dapat memperoleh konten yang sudah dipublikasikan.

Watermark bukan DRM. Jangan menjanjikan pencegahan pembajakan 100%. Perlindungan utama untuk **draft** dan episode **belum dirilis** tetap RLS dan pengaturan akses Supabase, bukan CSS/JavaScript frontend. Jangan memindahkan service role key atau password ke build frontend.

## Instalasi / Vercel

1. Buat branch Git baru untuk V4.1 (preview); jangan langsung replace Production.
2. Jalankan `npm install` dan commit **package-lock.json** yang dihasilkan, lalu `npm run lint`, `npm run test:v2`, `npm run test:v3`, `npm run test:v4`, `npm run build`.
3. Deploy Preview di Vercel dan uji pada Android Chrome (Beranda, Karya, Impor, Jadwal, Database, Editor, Reader).
4. Tes EPUB dummy menggunakan novel **privat** dan impor hanya sebagai draft. Cek tidak ada perubahan jadwal lama.
5. Konfirmasi anti-copy, print preview kosong, watermark Karisyono, zoom, pindah tab/kembali, navigasi, dan mode terang/gelap.
6. Promosikan ke Production hanya setelah build dan seluruh tes integrasi berhasil.

Tidak ada migration SQL V4.1 atau ENV tambahan. **Jangan menjalankan ulang migrasi V1–V4** pada database yang sudah sukses dimigrasi.

## Yang sudah diuji dalam lingkungan pembuatan

- Pemeriksaan sintaks TS/TSX dengan TypeScript transpile: 27 file tanpa error parse.
- Tes utilitas V2, V3, V4 lolos.
- Headless Chromium pada fixture layout: 320/360/390/412/768/1024 px tidak mengalami scroll horizontal; halaman mendapat lebar viewport pada mobile.
- Headless Chromium pada fixture proteksi: user-select none, watermark, privacy curtain, dan aturan print berfungsi.

**Batas uji:** karena dependensi React/Vite tidak tersedia secara penuh dan pemasangan dari npm registry terhalang, build Vite/TypeScript typecheck penuh serta pengujian aplikasi live/autentikasi Supabase di browser tidak dapat diklaim lolos. Uji Preview di Vercel tetap wajib.
