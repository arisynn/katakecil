# KataKecil V6.4 — Unified Theme System

**Basis:** KataKecil V6.3 iOS Mobile-First. **Ruang lingkup:** konsistensi tema, panel bab, preferensi Reader, dan migrasi penyimpanan lokal. Tidak ada perubahan Supabase, data cerita, atau engine Secure Reader.

## Perubahan implementasi

1. **Dua tema saja:** Terang (`light`) dan Gelap (`dark`). Pilihan `system`, Paper, Sepia, Calm, dan OLED tidak lagi ditampilkan. Pengguna baru memakai preferensi OS *hanya untuk pemilihan pertama*, kemudian pilihan disimpan sebagai `light`/`dark`.
2. **Satu preferensi global:** `appThemePreference` adalah sumber kebenaran untuk Beranda, Perpustakaan, Detail Cerita, Reader, Daftar Isi, Studio, loading, dan warna browser. Perubahan melalui header/Studio atau Reader menggunakan event sinkronisasi yang sama.
3. **Migrasi aman:** preferensi aplikasi V6.3 yang eksplisit diprioritaskan. `system` lama diubah menjadi pilihan terang/gelap sesuai OS saat migrasi. Jika preferensi aplikasi belum ada, pilihan Reader lama dipetakan `night`/`black` → gelap dan `white`/`sepia`/`calm` → terang. Pengaturan nonwarna, progres baca, dan bookmark tidak dihapus.
4. **Daftar Bab gelap yang konsisten:** aturan V6.3 yang secara eksplisit memaksa warna krem dalam dark mode dihapus. Surface, teks, divider, metadata, dan hover memakai token semantik. Berlaku di desktop dan mobile.
5. **Reader menyatu dengan aplikasi:** `readerModeFor()` memetakan `light` → `white`, `dark` → `night`. Pengaturan Reader sekarang hanya menawarkan Terang/Gelap global. Ukuran teks, font, jarak baris, lebar halaman, perataan, dan mode halaman tetap dapat diatur.
6. **Posisi membaca tetap diprioritaskan:** pergantian tema Secure Reader mempertahankan anchor offset sebelum pengukuran ulang. Tidak ada perubahan algoritme pagination, pinch, swipe, pencarian, content protection, atau pemuatan episode.
7. **Palet iOS konsisten:** variabel V6.3 `--v63-*` kini mengacu ke token semantik `--kk-*`, sehingga panel dan navigasi tidak menggunakan dua sumber warna berbeda.
8. **Navigasi:** tombol tema desktop/Studio menjadi satu tindakan untuk mengganti tema. Menu mobile memiliki dua pilihan saja. Header publik tetap fixed seperti V6.3.

## Warna utama

| Token | Terang | Gelap |
| --- | --- | --- |
| Background | `#F8F4EE` | `#0D1729` |
| Surface/Daftar Bab | `#FFFCF7` | `#15243B` |
| Teks utama | `#26364B` | `#F6EFE5` |
| Teks sekunder | `#596779` | `#B6C4D6` |
| Accent | `#805321` | `#F0C98B` |
| Border | `#D5C9BC` | `#3A4D66` |

## Pengujian yang dilakukan

- `npm run test:current`: **LULUS**, mencakup Secure Reader V4.2, pagination V4.2.1, publikasi V4.3/V4.5, V5/V5.1, serta V6.4.
- `node scripts/test-v64.mjs`: **LULUS**, menguji kebijakan migrasi, bootstrap sebelum React, pilihan tepat dua tema, penghapusan override krem, offset Reader, dan kontrak gesture/proteksi.
- **44 modul** TypeScript/TSX: pemeriksaan sintaks/transpile berhasil, tanpa error sintaks.
- **CSS parsing** (`tinycss2`) pada V6.2, V6.3, V6.4: tidak ditemukan parse error.
- **Chromium fixture**, lebar 390px dan 1440px, dua tema: warna terhitung (`getComputedStyle`) untuk Daftar Bab dan Reader settings cocok dengan token. Tidak ditemukan overflow horizontal pada fixture.
- **Kontras warna Reader**: pasangan teks utama/sekunder pada permukaan Reader terang/gelap memenuhi minimum 4,5:1 berdasarkan perhitungan WCAG.
- `node scripts/verify-public-build.mjs`: **LULUS**, pemeriksaan source untuk konten privat.

### Batasan pengujian

- `npm run lint` **belum bisa dijalankan sepenuhnya** karena dependency `vite/client` tidak terpasang.
- `npm run build` **belum berhasil** karena paket Vite belum tersedia. `npm install --offline` gagal (`ENOTCACHED`) dan instalasi online tidak selesai pada lingkungan ini.
- Screenshot hanya menggunakan **fixture CSS**, bukan aplikasi React yang terhubung ke Supabase. Pengujian autentikasi Studio, penerbitan, autosave, dan gesture pada perangkat asli tetap perlu dilakukan.
- Tes historis V5.3, V5.4, V6.0, V6.1, V6.2, V6.3 memuat ekspektasi hash/fitur tema lama; beberapa akan gagal terhadap desain baru. Gunakan `test:current` untuk regresi yang masih relevan. Tes historis tetap disertakan, tidak dihapus atau disembunyikan.

## Langkah deploy

1. Ekstrak ZIP ke direktori proyek, pasang dependency: `npm install`.
2. Isi environment Supabase seperti V6.3. Tidak ada migrasi database baru.
3. Jalankan `npm run lint && npm run test:current && npm run build`.
4. Uji Beranda → Reader → ubah tema → kembali ke Beranda, ulangi pada mode lain; verifikasi preferensi bertahan setelah refresh.
5. Periksa Daftar Bab pada layar 360–430px dan desktop, serta Daftar Isi/Bookmark/Reader settings.
6. Uji kembali pinch, swipe, pagination setelah ubah font/tema, autosave Studio, dan workflow publikasi dengan akun penulis resmi.

**Status:** source siap untuk tahap pengujian integrasi; belum dinyatakan production-ready sampai build dan tes langsung berhasil.
