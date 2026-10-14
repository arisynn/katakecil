# KataKecil V7.0.0-alpha.2 — Sapphire Consistency & Collection Polish

Tanggal: 14 Oktober 2026. Basis: V7.0.0-alpha.1. Rilis source/staging, bukan deployment produksi.

## Masalah yang diperbaiki

Laporan mobile memperlihatkan empty state Koleksi berwarna krem dan terlalu tinggi pada tema terang. Akar masalah: komponen V7 masih memakai kelas `.v6-empty`, sedangkan CSS V6 lama menambahkan `::after` berupa gradien `#fff1db...` dan aturan layout/spacing ilustrasi. Override `background:var(--kk-surface)!important` pada elemen utama **tidak** menghapus background pseudo-element, sehingga hasilnya tetap krem.

## Perubahan

1. `EmptyLibrary` dipisahkan sepenuhnya dari `.v6-empty`, `.v67-empty-icon`, `.v6-empty-copy` dan tombol `.v6-button-dark`. Kini memakai `kk-v7-empty*` dengan warna semantik Sapphire Blue dan tanpa gambar, pseudo-overlay atau tinggi berlebihan.
2. Empty state Koleksi kini berupa kartu ringkas dengan ikon bookmark, teks pendek, dan satu CTA menuju Temukan. Empty state katalog tidak lagi memiliki tombol menuju halaman Temukan itu sendiri.
3. Koleksi yang berisi cerita kini memiliki filter **Semua / Ada Progres / Belum Dibaca** yang benar-benar bekerja dengan posisi membaca lokal. Bab 0 dianggap progres valid. Filter tanpa hasil memiliki tindakan reset.
4. Cerita yang terakhir disimpan tampil lebih dulu; urutan array Supabase dan isi `localStorage` tidak diubah.
5. Header, bottom navigation, kartu koleksi, dan kartu pengumuman menggunakan surface/border semantik Sapphire yang sama pada tema terang/gelap.
6. Menambah `scripts/audit-v7-theme.mjs`: memeriksa token kedua tema, larangan warna hardcoded di CSS V7, penghapusan empty-state V6, dan 6 pasangan kontras WCAG AA.
7. Menambah `scripts/test-v7alpha2.mjs` untuk pengurutan, filter, progres bab 0, empty state, dan sintaks TypeScript.
8. `src/App.tsx` mengimpor `v70-alpha2.css` setelah `v70-alpha.css` agar cakupan perubahan terisolasi dari Secure Reader dan Studio.

## Validasi lokal

- `npm run test:v7alpha` — LULUS (tes alpha.1 dan alpha.2).
- `npm run audit:v7-theme` — LULUS (6 pasangan teks/tombol >= 4.5:1; CSS V7 tidak mengandung warna literal).
- `npm run audit:colors` — LULUS, tetapi masih melaporkan **1.115 literal warna historis** dalam CSS V5/V6. Ini belum berarti seluruh halaman runtime bebas override.
- `npm run check:structure` — LULUS (91 source files, 248 referensi lokal).
- 12 tes regresi Reader, keamanan, Studio dan publishing dari V4.2–V6.12.1 — LULUS.
- 66 file TS/TSX — LULUS pemeriksaan parse/sintaks.
- `npm run build` — BELUM LULUS karena `vite` tidak tersedia (`sh: vite: not found`). Tidak ada dependency npm yang lengkap di lingkungan ini.
- Browser screenshot runtime — BELUM TERVERIFIKASI (Chromium headless lokal tidak menyelesaikan proses). Tampilan final harus diuji pada staging.

## Hal yang tidak diubah

- Skema Supabase, autentikasi Studio, RLS, manuskrip, cover asli.
- Reader pinch, swipe, pagination, bookmark, posisi membaca, content protection.
- Key `localStorage` lama `katakecil:v6:collection` dan progress `kk-secure-progress-*`.
- Tema global tetap **dua**: light dan dark. Tidak ada tema ketiga.

## Langkah deployment

1. Backup deployment saat ini dan gunakan branch/staging untuk V7.0 Alpha.2.
2. Jalankan `npm install` di lingkungan dengan akses npm registry, lalu `npm run lint && npm run build && npm run test:v7alpha && npm run audit:v7-theme`.
3. Uji `/koleksi` kosong/terisi pada light/dark, ukuran 320/375/390/430 px dan desktop. Pastikan tidak ada gradien krem, kartu tidak memenuhi layar, CTA menuju Temukan, filter berfungsi.
4. Uji detail cerita, simpan/hapus koleksi, refresh dan migrasi data lama.
5. Uji Reader dan Studio end-to-end dengan Supabase staging sebelum deploy produksi.
6. Jika gagal, rollback ke V7.0 Alpha.1 atau V6.12.1. Tidak ada migrasi DB untuk di-rollback.

## Scope berikutnya

Pengelola pengumuman di Studio, pengujian visual runtime, penyisiran CSS historis, dan fitur Smart Reader 2.0 tetap menjadi pekerjaan rilis selanjutnya. Jangan mengklaim PWA/Push atau editor pengumuman sudah selesai pada alpha.2.
