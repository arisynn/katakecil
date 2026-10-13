# KataKecil V6.9 — Writer Studio Redesign

**Dasar:** V6.8.1. **Cakupan:** Studio privat; tidak ada migrasi Supabase baru dan tidak ada perubahan engine Secure Reader.

## Yang berubah

1. **Dashboard writer-first.** Naskah draft terakhir ditampilkan di atas, dengan akses langsung ke editor. Ringkasan status hanya tiga metrik dari data asli: Draft, Terjadwal, dan Terbit. Karya dan jadwal berikutnya tetap mudah ditemukan. Tidak ada angka pembaca atau rating fiktif.
2. **Writing Canvas.** Judul bab, arc, toolbar Markdown, naskah, dan hitungan kata dikelompokkan dalam area menulis yang lebih luas. Mode fokus menyembunyikan navigasi dan panel sekunder. Pada mobile, bottom navigation disembunyikan saat editor terbuka agar keyboard dan naskah tidak berebut ruang.
3. **Penyimpanan dan publikasi.** Autosave tetap memakai tabel dan RLS yang ada. Status gagal menyimpan ditampilkan; publikasi hanya berlanjut setelah flush perubahan berhasil. Ada konfirmasi eksplisit untuk publikasi sekarang, jadwal, dan penarikan draft. Bab yang sudah terbit menampilkan peringatan perubahan langsung terlihat pembaca. Navigasi internal menunggu penyimpanan ketika ada perubahan lokal.
4. **Karya.** Pencarian judul/genre, pencarian bab, dan filter Semua/Draft/Terjadwal/Terbit. Terbit massal tetap ada, tetapi ditaruh dalam panel terlipat supaya tidak mengganggu pengelolaan bab sehari-hari.
5. **Upload.** Langkah Pilih File → Periksa Bab → Simpan Draft diperjelas, tanpa mengganti parser, verifikasi transaksi, dan perlindungan konflik yang ada.
6. **Navigasi.** Dashboard, Karya, Analytics, Upload adalah empat tab utama. Pengaturan, Jadwal, Database, Sampah, Lihat Website, dan Keluar Akun berada di menu Alat Studio pada header desktop/mobile.
7. **Warna.** Studio menggunakan dua tema global yang sama dengan publik: Arctic Blue dan Midnight Sapphire. CSS V6.9 mereset border beige dan warna emas lokal peninggalan versi lama. Tidak ada gambar dekoratif baru.

## File inti

- `src/features/studio/components/StudioOverview.tsx`
- `src/features/studio/components/ChapterEditor.tsx`
- `src/features/studio/components/BookManagement.tsx`
- `src/features/studio/components/StudioNavigation.tsx`
- `src/pages/Studio.tsx`
- `src/pages/ManuscriptImporter.tsx`
- `src/utils/nav.ts`
- `src/design/v69-writer-studio.css`
- `src/App.tsx`
- `scripts/test-v69.mjs`

## Hasil validasi lokal

- **12 kelompok pengujian regresi lulus**, termasuk pengujian V6.9 dan hash file keamanan Reader.
- Pemeriksaan struktur import/aset: **lulus**.
- Pemeriksaan sintaks TypeScript/TSX melalui TypeScript transpilation: **lulus**.
- Pratinjau CSS fixture di Chromium pada **390px dan 1440px**, kedua tema, Dashboard dan Editor: **tidak ada horizontal overflow**. Warna background/card sesuai palet global.
- Kontras teks utama dan teks sekunder pada surface utama memenuhi **WCAG AA** berdasarkan pasangan token yang diuji.
- **TypeScript typecheck lengkap belum terverifikasi** (`vite/client` belum tersedia di lingkungan ini).
- **Production build belum terverifikasi** (`vite` belum tersedia di lingkungan ini).
- **Belum dilakukan uji Supabase live**: login, autosave saat jaringan terputus, impor EPUB nyata, publikasi terjadwal, dan gesture Reader harus diuji di staging.

Screenshot pratinjau dibuat dari fixture HTML/CSS dengan konten contoh, **bukan screenshot aplikasi React yang terhubung Supabase**. Tidak ada data contoh yang dimasukkan ke database.

## Sebelum deployment

1. Jalankan `npm install`, `npm run lint`, `npm run test:current`, dan `npm run build` di lingkungan dengan dependency tersedia.
2. Uji login akun penulis dan pembatasan akun nonpenulis.
3. Uji autosave, pergantian halaman saat ada perubahan, retry saat jaringan gagal, dan naskah terbit yang diedit.
4. Uji publikasi langsung, penjadwalan WIB, penarikan draft, terbit massal, dan Sampah pada staging.
5. Uji file picker Android, impor EPUB/MD/TXT, konflik nomor bab, dan integritas hasil impor.
6. Uji editor dengan keyboard Android, mode fokus, kedua tema, tablet/desktop, serta pratinjau Reader.
7. Jika fitur jadwal publik V6.8 belum aktif, jalankan migrasi V6.8 yang sudah ada: `supabase/migrations/20261013010000_public_next_chapter_schedule_v68.sql`.

**Tidak diperlukan migrasi database baru untuk V6.9.**
