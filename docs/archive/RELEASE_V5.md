# KataKecil V5.0 — Mist Blue (Source Release / Preview Candidate)

Tanggal source: 12 Oktober 2026. **Belum live**: SQL migrasi, Edge Function, dan Vercel production belum dijalankan oleh paket ini.

## Implementasi

- Mist Blue, glassmorphism ringan untuk website dan Studio; reader stylesheet dan pembaca React **byte-identical** terhadap ZIP sumber.
- Sampul `contain` disertai latar buram adaptif dari gambar yang sama.
- Impor EPUB/MD/TXT menjadi transaksi RPC tunggal; judul novel tanpa episode yang berhasil disimpan tidak lagi merupakan hasil sukses palsu.
- Kata pengantar/dedikasi/catatan penulis dapat diimpor sebagai halaman buku terpisah tanpa nomor episode, bahkan pada EPUB tanpa episode cerita; diedit melalui Studio.
- Status proses impor, verifikasi riwayat server, dan ringkasan hasil; kegagalan upload sampul dilaporkan tanpa kehilangan naskah.
- Hapus lunak novel, episode, dan halaman buku dengan pemulihan privat/draft; tidak ada penghapusan permanen.
- Isolasi berkas baru: `src/data/bookSections.ts`, `src/data/trash.ts`, `src/pages/BookSections.tsx`, `src/pages/TrashManager.tsx`, `src/mist-blue.css`.
- Database: migration V5 additive `20261012170000_katakecil_v5_core.sql`, serta grant aman kolom metadata `deleted_at` setelah stage-2.
- Test kontrak `scripts/test-v5.mjs` ditambahkan; preflight read-only disediakan.

## Keterangan penting

Paket ini source lengkap berdasarkan ZIP `katakecil-main.zip` yang diterima, **bukan patch kecil**. React reader dan CSS pembacanya tidak diubah. Bentuk naskah hasil impor yang lama tidak diubah otomatis.

### Lulus

`test:v2`, `test:v3`, `test:v4`, `test:v42`, `test:v421`, `test:v43`, `test:v45`, `test:v5`, `verify-public-build`.

`test-v422-prefetch.mjs` lolos dengan `node --experimental-strip-types` (Node 22).

### Belum diverifikasi

Full `npm run lint`, Vite `npm run build`, browser preview screenshot, jalur EPUB pada Android nyata, transaksi SQL di staging/produksi, dan Edge Function secara live. Akses paket npm tidak tersedia di lingkungan audit. Jangan melewati G0 backup dan tes staging.

### Catatan pengguna

Pengujian SQL/Edge/Vercel memerlukan akses/otorisasi dan pencadangan yang belum diverifikasi. Untuk mengaktifkan V5: ikuti **START_HERE_V5.md**, cek database aktif secara read-only dahulu, lakukan migration V5 + Edge staging, lalu push/deploy melalui Vercel Preview. Baru setelah terverifikasi jalankan metadata privilege lockdown.
