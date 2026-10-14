# KataKecil V7.0 Beta.2 — Studio & Full UI Polish

**Tanggal:** 14 Oktober 2026  
**Basis:** V7.0 Beta.1  
**Status:** source kandidat staging; **belum dideploy ke Vercel/produksi**.

## Implementasi

### 1. Sapphire Asset Icon System

- **76 ikon SVG** baru pada `public/assets/v7/icons/`, seluruhnya `viewBox="0 0 24 24"`, stroke 1,85 dengan ujung dan sudut membulat.
- `src/components/BrandIcon.tsx` menggunakan SVG melalui CSS mask; warna mengikuti `currentColor` dari tema global, sehingga tidak memerlukan dua file per ikon.
- Migrasi iconography pada **seluruh komponen TSX yang sebelumnya mengimpor `lucide-react`**: navigasi publik, Studio, pengelolaan karya, editor, impor, jadwal, pengumuman, Reader, pengaturan membaca, daftar isi, empty state, dan tombol.
- Dependency `lucide-react` yang tidak digunakan dihapus dari `package.json`.
- Ikon tidak menjadi tombol sendiri; semantik, `aria-label`, handler, dan otorisasi tetap berada pada kontrol asal.

### 2. Wordmark KataKecil yang konsisten

- Dua aset wordmark SVG berisi **bulu pena dan lettering berbentuk path vektor**, bukan font eksternal: `public/brand/katakecil-wordmark-light.svg` dan `katakecil-wordmark-dark.svg`.
- `BrandLogo` menampilkan wordmark sesuai `data-app-theme`, dipakai bersama pada header publik, sidebar Studio, dan header Studio mobile.
- Logo aplikasi, favicon, dan ikon PWA lama dipertahankan; semua mengacu pada simbol bulu pena yang sama.
- Loading aplikasi dan Reader tetap memakai aset feather brand; Reader loading tidak lagi menggunakan gambar garis buku yang berbeda.

### 3. Studio writer-first polish

- Dashboard: resume draft terbaru, tindakan cepat **Upload Naskah**, **Jadwal Terbit**, dan **Pengumuman**.
- Statistik hanya dihitung dari status episode nyata: draft, terjadwal, dan terbit. Tidak ada statistik pembaca fiktif.
- Daftar karya terbaru, panel alur penerbitan berdasarkan data, dan jadwal publikasi terdekat jika tersedia.
- Tata letak desktop dua kolom dan mobile satu kolom; tombol cepat disusun dua kolom dengan baris terakhir penuh di mobile.
- Navigasi Karya tetap aktif ketika penulis sedang berada di editor bab.
- Menu alat Studio: tutup saat berpindah halaman, klik di luar, atau Escape; Escape mengembalikan fokus ke tombol pemicu.
- Perbaikan spesifisitas warna legacy untuk tombol Studio, header, serta bottom navigation dalam mode gelap.

### 4. Kompatibilitas dan keamanan

- Tidak ada perubahan skema Supabase, tabel, kebijakan RLS, autentikasi, atau data penulis.
- Tidak mengubah algoritma gesture/pinch, mesin pagination, pemeriksaan Secure Reader, atau alur autosave dan publikasi.
- Komponen lama yang hanya menggunakan ikon Lucide telah dialihkan ke SVG asset; aksi dan logika bisnisnya tidak diganti.
- Semua warna baru di `v70-beta2.css` menggunakan token Sapphire; tidak ada warna literal baru.

## Validasi yang dilakukan

| Pemeriksaan | Hasil |
|---|---|
| `npm run test:current` | **PASS** — 18 kelompok tes kontrak/regresi (V4–V7 Beta.2) |
| `npm run check:structure` | **PASS** — 100 source files dan import/aset lokal |
| `npm run audit:v7beta` | **PASS** — 0 warna literal di CSS Beta baru |
| Validasi 76 SVG (XML) | **PASS** |
| Validasi CSS Beta.2 (tinycss2) | **PASS** |
| Chromium CSS fixture Studio 320/390/768/1440 × terang/gelap | **PASS** — 8 konfigurasi, ikon, tema, overflow |
| Chromium CSS fixture Koleksi 320/390/768/1440 × terang/gelap | **PASS** — 8 konfigurasi, empty state, carousel target |
| TypeScript/TSX transpile parse | **PASS** — seluruh TSX diperiksa |
| `npm run lint` | **BELUM** — `vite/client` tidak tersedia karena dependency npm belum terpasang |
| `npm run build` | **BELUM** — pre-build source guard PASS, tetapi Vite tidak tersedia |
| QA React runtime / Supabase staging | **BELUM** — membutuhkan instalasi dependensi dan kredensial staging |

**Penting:** fixture CSS bukan aplikasi React yang dijalankan secara penuh. Screenshot fixture menggunakan teks dan angka ilustratif. Jangan menganggapnya sebagai data pengguna.

## Audit warna historis

`npm run audit:v7beta` masih menemukan **1.080 literal warna** di stylesheet historis non-V7. Angka tersebut merupakan inventaris literal, **bukan** jumlah bug yang terbukti. Audit cascade terhadap komponen aktual tetap diperlukan sebelum menghapus aturan lama secara massal.

## Sebelum deployment

1. Jalankan `npm install`, `npm run lint`, `npm run build`, dan `npm run test:current` pada mesin dengan akses registry npm.
2. Uji halaman publik, Koleksi, Temukan, Reader, Studio dashboard/editor, dan importer pada Chrome Android/iOS Safari di dua tema.
3. Periksa gambar wordmark dan ikon SVG pada jaringan lambat serta kondisi offline/PWA.
4. Uji otorisasi Studio (akun berwenang dan tidak berwenang), autosave, jadwal, pengumuman, impor, sampah, dan restore.
5. Uji gesture pinch/swipe, navigasi bab, perubahan font, bookmark, dan pemulihan posisi Reader.
6. Jika fitur Pengumuman Alpha.3 belum dimigrasikan, jalankan `supabase/migrations/20261014010000_v7_public_announcements.sql` **di staging terlebih dahulu**.
7. Setelah backup dan QA staging lulus, deploy ke Vercel dengan rencana rollback Beta.1.

Tidak ada tindakan terhadap database produksi atau Vercel yang dilakukan dalam pekerjaan ini.
