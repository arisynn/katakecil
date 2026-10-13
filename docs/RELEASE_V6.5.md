# KataKecil V6.5 — Maintenance & Architecture Release

**Basis:** KataKecil V6.4 Unified Theme. **Fokus:** struktur source, pengurangan file root, pemformatan kode, dan pengujian keamanan tanpa redesign.

## Yang berubah

- Memisahkan komponen Studio ke `src/features/studio/components/`: navigasi, dashboard/analytics, pengelolaan karya, editor bab, dan komponen bersama. Auth, otorisasi penulis, dan routing tetap di `src/pages/Studio.tsx`.
- Memisahkan kartu cerita, bookmark, heading, dan empty state ke `src/features/public/components/`. Routing dan pemuatan data publik tetap di `src/pages/PublicLibrary.tsx`.
- Memformat **11 stylesheet** (`site.css`, `studio.css`, dan CSS desain terkait). Urutan aturan dan deklarasi CSS dibandingkan dengan baseline V6.4 menggunakan AST PostCSS; hasilnya identik. Import CSS tetap pada urutan sebelumnya untuk mencegah perubahan cascade.
- Memformat Studio, perpustakaan, dan importer, tanpa menulis ulang proses penyimpanan/publikasi. Teks JSX Studio dan publik dibandingkan dengan V6.4; semua node teks tetap identik.
- Memindahkan **26 dokumen Markdown lama** ke `docs/archive/`, bukan menghapus riwayatnya.
- Memindahkan **6 tes UI historis** yang sudah gagal pada baseline V6.4 ke `scripts/legacy-tests/`. Tes keamanan dan regresi aktif tetap berjalan.
- Menghapus dua script Python sementara `_implement_v63.py` dan `_preview_v63.py` dari paket source.
- Menambahkan `.editorconfig`, panduan arsitektur/deployment, dan pemeriksaan import/aset otomatis.

## Bagian yang sengaja tidak diubah

- `src/SecureReaderApp.tsx`, `src/ReaderApp.tsx`, `src/components/PageMeasurer.tsx`, `src/utils/pagination.ts`, CSS keamanan Reader, dan komponen Reader terkait. **13 file kritis** dibandingkan dengan hash V6.4 dan identik.
- `supabase/migrations/`, `supabase/functions/`, `supabase/tests/` dan seluruh data pengguna.
- Palet dan UI V6.4, dua tema global, navigasi, gesture Reader, progress/bookmark, autosave, serta workflow publikasi.
- **34 aset WebP** tetap disertakan, termasuk versi desktop dan mobile. Aset yang dipilih lewat nama dinamis tidak dihapus.

## Pengujian yang dilakukan

| Pemeriksaan | Hasil |
|---|---|
| `npm run test:current` (V4.2, V4.2.1, V4.3, V4.5, V5, V5.1, V6.4, V6.5) | Lulus |
| `npm run check:structure` | Lulus; 205 referensi import/aset diperiksa |
| Tes utilitas V2, V3, V4 | Lulus |
| `node scripts/test-importer.mjs` | Lulus |
| 13 hash file Reader/security dibandingkan V6.4 | Identik |
| AST 11 CSS sebelum/sesudah | Identik |
| Teks JSX halaman Studio/publik sebelum/sesudah | Identik |
| Production build (`npm run build`) | **Belum lulus:** `vite` tidak terpasang |
| TypeScript full lint (`npm run lint`) | **Belum lulus:** tipe `vite/client` tidak tersedia |
| Browser + Supabase live | Belum diuji |

Tes UI V5.3, V5.4, V6.0, V6.1, V6.2, V6.3 gagal **juga pada baseline V6.4** karena snapshot/hash dan teks UI lama; disimpan sebagai arsip, tidak dimasukkan ke `test:current`.

## Tindakan manual sebelum deploy

1. Jalankan `npm install` pada lingkungan dengan akses npm, lalu `npm run lint` dan `npm run build`.
2. Periksa tampilan terang/gelap pada mobile dan desktop, khususnya Daftar Bab dan Reader.
3. Uji login penulis, otorisasi Studio, autosave, impor, publikasi, sampah/pemulihan, serta seluruh gesture Reader pada perangkat nyata dengan Supabase.
4. Tidak perlu migrasi SQL baru. Jangan menjalankan ulang migrasi tanpa audit.

**Status:** source V6.5 siap untuk integrasi/pengujian lanjutan, **belum diverifikasi siap produksi**.
