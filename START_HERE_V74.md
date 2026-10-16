# KataKecil V7.4 RC1 — riwayat revisi dan tinjau konflik

Paket ini melanjutkan V7.3 Smart Covers. Sampul cerdas, impor ZIP/EPUB, reader, dan PWA tetap disertakan. Perubahan baru berfokus pada menjaga hasil menulis.

- Tombol **Riwayat revisi** di editor: daftar metadata dahulu, isi revisi diambil ketika dipilih.
- Maksimal **30 revisi per bab** di server privat. Snapshot otomatis sebelum perubahan diambil sekitar setiap lima menit; penulis bisa membuat checkpoint kapan saja. Saat batas tercapai, revisi tertua digantikan.
- Pemulihan menampilkan hasil tinjauan terlebih dahulu. Versi server sebelum pemulihan disimpan, sementara status, jadwal, nomor bab, dan penanda akhir cerita tetap berlaku.
- Konflik dua tab menghentikan autosave. Penulis bisa melihat versi dasar, perubahan lokal, versi server, dan menggabungkan hasil sebelum menyimpan dengan konfirmasi.
- Koneksi terputus setelah commit dapat dicoba ulang dengan UUID dan payload yang sama. Tidak ada fallback ke penimpaan tanpa pemeriksaan versi.
- Naskah dan revisi tidak disimpan di localStorage, sessionStorage, IndexedDB, atau Cache Storage oleh fitur baru ini. PWA tetap memerlukan internet untuk membaca. Menutup tab dapat menghilangkan perubahan yang belum berhasil dikirim; tidak ada draft offline.

## Pemasangan

**Belum dipasang ke produksi dari sesi pengerjaan ini.** Jangan memasang frontend editor V7.4 sebelum migrasinya tersedia.

1. Cadangkan database dan cocokkan skema aktual. Proyek terhubung sudah memiliki RPC V7.2, tetapi riwayat migrasi lama tidak boleh dianggap lengkap. Jangan menjalankan ulang seluruh folder migrasi pada database yang sudah berisi karya.
2. Selesaikan pengujian penguatan akses naskah V7.2 sesuai `docs/v72/AUDIT_SUPABASE.md`. Patch `supabase/REVIEW_ONLY_v72_reader_access.sql` kini mempertahankan metadata `editor_version` jika V7.4 sudah terpasang; akses body tetap ditutup.
3. Untuk seluruh fitur sampul dalam paket, ikuti `START_HERE_V73.md`: migrasi `20261015080323_v73_smart_covers.sql` dan fungsi `cover-assets` tetap diperlukan.
4. Pada staging yang sudah memiliki skema V7.2, jalankan **`supabase/migrations/20261015225222_v74_private_editor_revisions.sql`**. Migrasi ini menambah nomor versi editor, tabel privat, trigger, dan tiga RPC. Tidak melakukan backfill seluruh naskah lama dan tidak mengubah teks/jadwal yang ada. Tabel riwayat tidak perlu dimasukkan ke daftar exposed schema.
5. Pasang frontend V7.4 di preview. Uji login penulis, pengguna biasa, anon, dua tab, checkpoint, pemulihan, respons hilang, jadwal, dan akses REST body. Checklist rinci ada pada `docs/v74/RILIS_DAN_PEMASANGAN.md`.
6. Setelah staging lulus, rollout backend lalu frontend dan muat ulang tab Studio lama. Bila migrasi belum ada, editor menampilkan pesan pemasangan dan mempertahankan teks lokal; jangan mengandalkan editor V7.4 pada server lama.

```sh
npm ci
npm run check
npm run audit:v7-theme
npm run audit:v7beta
npm run build
npx playwright install chromium --only-shell
npm run test:browser
```

Node minimum 22.12. Pengujian fungsi sampul terpisah tetap tersedia melalui `npm run test:edge` seperti pada V7.3. Perubahan V7.4 tidak mengubah renderer/codec Edge.

Lihat [panduan revisi](docs/v74/PANDUAN_REVISI.md), [arsitektur dan QA](docs/v74/RILIS_DAN_PEMASANGAN.md), dan [sampul V7.3](docs/v73/PANDUAN_SAMPUL.md).
