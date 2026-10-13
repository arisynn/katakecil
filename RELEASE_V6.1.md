# KataKecil V6.1 — Loading Screen & Responsive Mobile Assets

Tanggal: 13 Oktober 2026  
Basis: KataKecil V6 redesign, bukan ZIP V5.4.

## Yang diperbaiki

1. **Loading awal sebelum React siap (`index.html`)**: tampilan brand KataKecil, ikon buku, tagline, ambience fantasy library, indikator indeterminate, dan status yang berbeda untuk rute publik, Studio, serta Reader. Mobile memakai background mobile khusus. Tidak ada timer paksa atau persentase palsu.
2. **Loading React (`ThemeLoading.tsx`)**: presentasi visual V6 untuk Perpustakaan, pemeriksaan akses Studio, dan Reader. Reader memakai latar paper ivory. Loading Studio yang berada di dalam dashboard tidak menutup navigasi.
3. **Bug kilatan error Reader (`App.tsx`)**: resolusi buku kini ditandai menurut slug. Teks "Cerita tidak tersedia" hanya ditampilkan setelah lookup selesai, bukan saat permintaan masih berjalan. Permintaan lama yang tidak aktif diabaikan.
4. **Loading di dalam Secure Reader**: indikator episode/penataan halaman diperbarui **hanya melalui CSS**. Tidak ada perubahan ke gesture pinch, swipe, pagination, keamanan konten, maupun offset yang disimpan.
5. **Assets khusus mobile**: 8 cover fallback, hero vertikal, Studio ambience vertikal, empty state vertikal, detail backdrop, loading ambience, dan tekstur reader. Setiap aset mobile berbeda dari file desktop. Untuk sampul asli penulis yang tersedia di Supabase, URL asli tetap dipakai di desktop maupun mobile.
6. **Responsive image selection**: CSS media query untuk dekorasi, dan elemen HTML `<picture>` untuk cover fallback, empty state, detail backdrop, serta preview tema Reader. Pemilihan gambar dilakukan browser; tidak mendownload dua varian hanya untuk memilih satu.
7. **Impor naskah**: spinner dan status diberi warna V6 tanpa mengubah alur pemilihan berkas Android, pembacaan file, atau transaksi impor.
8. **Status bar browser**: warna tema awal sesuai konteks halaman (navy untuk publik/Studio, ivory untuk Reader).

## Aset tambahan

- `public/assets/v6/loading-ambience.webp` (desktop)
- `public/assets/v6/loading-ambience-mobile.webp`
- `public/assets/v6/studio-ambience-mobile.webp`
- `public/assets/v6/empty-library-mobile.webp`
- `public/assets/v6/detail-backdrop-mobile.webp`
- `public/assets/v6/reader-paper-texture-mobile.webp`
- `public/assets/v6/covers/01-senja-mobile.webp` sampai `08-bunga-mobile.webp` (8 file)

`hero-library-sunset-mobile.webp` telah diganti dengan komposisi mobile baru. Aset desktop dari V6 tetap ada.

Total aset di `public/assets/v6`: **28 WebP** (14 lama + 14 file baru; satu file mobile hero lama diperbarui).

## Pemeriksaan yang dilakukan

**Lulus**
- `node scripts/test-v6.mjs`
- `node scripts/test-v61.mjs`
- `node scripts/test-v42-security.mjs` (menggunakan TypeScript global sebagai dependensi tes)
- `node scripts/test-v421-reader.mjs`
- `node scripts/test-v43.mjs`
- `node scripts/test-v45.mjs`
- `node scripts/test-v5.mjs`
- `node scripts/test-v51.mjs`
- Syntax-transpile seluruh 42 modul `src/*.ts(x)` tanpa error.
- CSS parsing `v6.css` dan `v61-loading-mobile.css` tanpa error.
- 28 aset WebP diverifikasi dapat dibaca; preview contact sheet mobile diperiksa.

**Belum berhasil dijalankan/terverifikasi**
- `npm install` gagal karena DNS `registry.npmjs.org` (`EAI_AGAIN`).
- `npm run lint` tidak dapat menyelesaikan pemeriksaan tipe penuh karena tipe `vite/client` belum tersedia.
- `npm run build` gagal karena executable `vite` belum tersedia; pemeriksaan keamanan source `verify-public-build.mjs` lulus.
- Screenshot otomatis Chromium tidak berhasil dibuat di lingkungan ini (proses browser timeout).
- Supabase live, auth, autosave, impor dan publikasi harus diuji pada lingkungan yang memiliki kredensial dan dependensi terpasang.
- Tes `test-v53.mjs` dan `test-v54.mjs` lama berisi ekspektasi markup/hash V5 yang sudah tidak relevan untuk redesign V6; keduanya tidak dipakai sebagai kriteria V6.1.

## Verifikasi setelah ekstraksi

```bash
npm install
npm run lint
npm run test:v6
npm run test:v61
npm run build
npm run dev
```

Uji pada lebar 390px/430px dan 1280px/1440px. Periksa splash awal di `/`, `/studio`, `/baca/<slug>`; buka cover fallback dan cover asli, tes Reader pinch/swipe/pagination, login penulis, autosave, impor naskah, dan publikasi.

Tidak ada perubahan SQL, migrasi Supabase, atau data cerita.
