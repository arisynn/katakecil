# KataKecil V6.7 — Sapphire Blue Polish

## Perubahan

- **Arctic Blue (terang)** dan **Midnight Sapphire (gelap)**: satu preferensi global untuk Beranda, Perpustakaan, Detail, Reader, dan Studio. Tidak ada tema tambahan.
- **Hero carousel**: cover ditampilkan dalam proporsi 2:3 menggunakan `object-fit: contain`, terpisah dari judul dan metadata. Mekanisme autoplay 6 detik, swipe, indikator, serta `prefers-reduced-motion` tetap digunakan.
- **Tanpa ilustrasi latar dekoratif**: hero, detail, Tentang, loading, Studio, dan halaman kosong menggunakan permukaan warna. Cover cerita tetap diprioritaskan dari database; fallback tetap tersedia.
- **Koleksi**: tab publik disembunyikan jika tidak ada ID buku yang tersimpan dan masih tersedia pada perpustakaan. Muncul secara reaktif setelah bookmark disimpan; route langsung `/koleksi` tetap menampilkan empty state yang dapat digunakan.
- **Tentang**: layout editorial biru dan informasi penulis **Karisyono**, tanpa profil, foto, atau statistik fiktif.
- **Studio mobile**: tab keempat menjadi **Upload** (`/studio/impor`), sedangkan Pengaturan, Jadwal, Database, Sampah, Website Publik, dan Keluar Akun tersedia dari menu atas. Impor dihapus dari Quick Actions agar tidak menduplikasi tab Upload.
- **Empty state**: ilustrasi dekoratif diganti ikon buku berbasis komponen.

## File yang diubah

- `src/features/public/components/FeaturedHeroCarousel.tsx`
- `src/features/public/components/LibraryUI.tsx`
- `src/features/studio/components/StudioNavigation.tsx`
- `src/features/studio/components/StudioOverview.tsx`
- `src/components/public/PublicHeader.tsx`
- `src/pages/PublicLibrary.tsx`
- `src/hooks/useUiTheme.ts`
- `src/utils/theme.ts`
- `src/App.tsx`
- `src/design/v67-sapphire-polish.css` (baru)
- `index.html`, `README.md`, `metadata.json`, `package.json`
- `scripts/test-v64.mjs`, `scripts/test-v65.mjs`, `scripts/test-v66.mjs`, `scripts/test-v67.mjs` (baru)

## Pengujian

- `npm run test:current`: **lulus**, termasuk V4.2, V4.2.1, V4.3, V4.5, V5, V5.1, V6.4, V6.5, V6.6, dan V6.7.
- TypeScript/TSX: **53 modul berhasil ditranspilasi untuk pemeriksaan sintaks** (bukan typecheck penuh).
- CSS baru: berhasil diparsing oleh `tinycss2`.
- Chromium fixture: 390px dan 1440px, kedua tema, **tanpa overflow horizontal**; cover hero terverifikasi `object-fit: contain`.
- Kontras warna utama: minimal 5.84:1 untuk pasangan teks sekunder dan permukaan yang diperiksa.
- File inti Secure Reader, Supabase client, dan pagination: **tidak berubah**.
- `npm run lint` dan `npm run build`: **belum lulus/terverifikasi** karena dependency `vite/client` dan CLI Vite tidak tersedia di lingkungan pengujian. Instal dependency dan ulangi di lingkungan deployment.
- Autentikasi, autosave, publikasi, dan interaksi carousel pada React yang terhubung Supabase: **belum diuji end-to-end**.

## Catatan implementasi

Stylesheet V5/V6 lama masih disertakan untuk menjaga kompatibilitas. Aturan V6.7 menonaktifkan background ilustratif yang relevan tanpa menghapus aset lama dari ZIP. Refactor CSS menyeluruh merupakan pekerjaan terpisah yang membutuhkan pengujian browser pada aplikasi sebenarnya.

Tidak ada perubahan skema database, migrasi Supabase, atau naskah asli.
