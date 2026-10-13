# KataKecil V6.12.1 — Sapphire CTA Color Hotfix

## Masalah yang diperbaiki

Pada halaman detail cerita dalam tema gelap, tombol **Mulai Membaca** masih tampil kuning emas meskipun tema global menggunakan Sapphire Blue. Aturan lama di `src/design/v62-theme.css` menggunakan `background: #F0C98B !important` pada selector `.v6-public[data-kk-theme='dark'] .v6-button-gold`. Specificity aturan ini lebih tinggi daripada aturan biru V6.7, sehingga menimpa palet global. Aturan yang sama juga memengaruhi tombol utama Studio pada mode gelap.

## Perubahan

- Hapus override kuning emas untuk tombol utama mode gelap dari `v62-theme.css`, termasuk efek hover emas.
- Biarkan tombol Public dan Studio mengikuti satu aturan semantik `--kk-primary` / `--kk-on-primary` yang sudah disediakan oleh `sapphire-tokens.css` dan `v67-sapphire-polish.css`.
- Ubah bayangan tombol versi lama di mode terang menjadi `color-mix()` berbasis token biru.
- Tambahkan regresi `scripts/test-v6121.mjs` dan sertakan pada `npm run test:current`.
- Naikkan versi aplikasi menjadi `6.12.1` dan perbarui daftar versi yang diterima oleh tes V6.5/V6.6.

Nama kelas CSS `v6-button-gold` tetap digunakan demi kompatibilitas; **warna yang dihasilkan bukan emas**.

## Pemeriksaan

- Chromium headless dengan urutan stylesheet yang sama seperti `src/App.tsx`, fixture tombol detail cerita:
  - Dark: `rgb(155, 201, 255)` (`#9BC9FF`), teks `rgb(8, 20, 37)` (`#081425`).
  - Light: `rgb(35, 93, 180)` (`#235DB4`), teks `rgb(255, 255, 255)` (`#FFFFFF`).
- `npm run test:current`: **16 kelompok regresi lulus**.
- `node scripts/quality/check-structure.mjs`: **lulus**.
- `npm run lint`: **belum dapat lulus**, karena dependency `vite/client` belum terpasang.
- `npm run build`: **belum dapat lulus**, karena CLI `vite` belum terpasang.
- Pengujian langsung pada domain produksi dan Supabase **belum dilakukan**.

## Deployment

Ekstrak source sebagai proyek penuh, install dependency, lalu jalankan `npm run lint`, `npm run test:current`, dan `npm run build` sebelum deploy ke Vercel. Tidak ada migrasi Supabase. Perubahan ini tidak menyentuh Reader, konten naskah, cover penulis, atau autentikasi.
