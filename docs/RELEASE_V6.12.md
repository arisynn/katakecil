# KataKecil V6.12 — Adaptive Reader & Sapphire Consolidation

Status: **source siap untuk uji integrasi, belum diverifikasi siap produksi**.

## Perubahan

1. **Viewport adaptif.** `useReaderViewport` membaca tinggi visual viewport ketika browser berada pada skala normal, safe-area, perubahan toolbar Chrome, orientasi, dan fullscreen. Satu fungsi `readerGeometry` digunakan oleh Reader publik dan preview penulis, sehingga pengukuran pagination dan halaman tampil mengikuti ukuran yang sama.
2. **Pinch-to-menu simetris.** `useReaderMenuPlacement` mengukur tepi bawah header dan tepi atas footer menggunakan DOM/ResizeObserver. Kartu halaman di-scale secara visual dan dipusatkan di ruang kosong di antaranya; `translateY(-7dvh)` dan `scale(.64)` lama dihapus. Tidak ada reflow konten hanya karena pinch.
3. **Loading episode baru.** `ReaderEpisodeLoading` dengan SVG buku dan status `fetch`, `layout`, `error`, `empty`, serta retry untuk error di Secure Reader. Loader ditampilkan di luar `.reader-book`, sehingga tidak ada halaman kosong ber-watermark ketika mengambil episode.
4. **Tipografi.** Ukuran teks responsif berbatas `clamp()`, heading bab terpusat, margin responsif, dan penghormatan terhadap preferensi perataan teks. Pengukur pagination dan halaman menggunakan `textStyles` yang sama.
5. **Warna.** Palet CSS resmi dipusatkan di `sapphire-tokens.css`, nilai yang diperlukan JavaScript di `sapphirePalette.ts`, dan stylesheet Reader aktif memakai variabel semantik yang sama dengan Public/Studio. CSS Reader historis yang masih menampilkan warna krem/emas pada beberapa aturan telah dibersihkan. Alias lama dipertahankan hanya untuk kompatibilitas.
6. **Pengamanan.** Tidak ada perubahan migrasi Supabase, modul pengambilan Secure Reader, RLS, proteksi konten, dan algoritme pagination.

## Pengujian yang dijalankan

- `npm run test:current`: **lulus, 15 kelompok regresi**.
- `node scripts/quality/check-structure.mjs`: **lulus, 86 source files, 241 local imports/assets**.
- `node scripts/audit-v612-colors.mjs`: **lulus untuk kontrak token dan stylesheet UI modern**.
- Pemeriksaan sintaks CSS dengan `tinycss2`: **lulus untuk 5 stylesheet utama**.
- Chromium headless fixture: **18 kombinasi** tema terang/gelap × mode membaca/menu/loading × viewport 360×640, 390×844, 1440×900. Posisi halaman, jarak dari header/footer, pusat loading, dan background mode diperiksa. Fixture menyertakan stylesheet historis dalam urutan produksi. **Ini bukan render aplikasi React dengan data Supabase**.
- `npm install` gagal: `EAI_AGAIN` saat mengakses registry npm. Karena dependency aplikasi tidak tersedia, `npm run lint` (full TypeScript typecheck) dan `npm run build` **belum dapat diverifikasi**.

## Batasan yang masih harus ditangani

- Audit source masih mendeteksi sekitar **1.093 literal warna** pada stylesheet historis di luar file token. Sebagian adalah alpha/overlay atau warna lama yang tidak selalu aktif. Jangan mengklaim seluruhnya sudah dihapus: inspeksi computed styles pada aplikasi React sesungguhnya masih diperlukan, khususnya Public dan Studio.
- Pengujian pinch fisik Android, transisi antar-bab dengan Supabase staging, rotasi, persistensi posisi baca, dan aksesibilitas dengan screen reader belum dapat dilakukan di lingkungan ini.
- Setelah dependency tersedia, jalankan `npm install`, `npm run lint`, `npm run test:current`, `npm run build`, lalu QA pada browser/perangkat nyata sebelum deployment.

## Cara menggunakan

Ekstrak ZIP sebagai project lengkap (bukan patch), isi environment Supabase sesuai deployment yang sudah ada, install dependency, lalu jalankan pengujian dan build. Tidak ada SQL baru untuk V6.12. Jangan menimpa data naskah/cover di Supabase.
