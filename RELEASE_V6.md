# KataKecil V6 — Mockup-led UI/UX Redesign

## Cakupan perubahan

Versi 6 memperbarui tampilan publik, katalog, detail cerita, navigasi, Studio privat, editor, dan pengaturan membaca tanpa mengganti mekanisme keamanan, autentikasi, atau penyimpanan naskah.

### Halaman publik
- Beranda dengan ilustrasi perpustakaan senja, judul editorial, Lanjut Membaca, Cerita Pilihan, dan Terbaru Ditambahkan.
- Perpustakaan dengan filter genre, pencarian, pengurutan, grid sampul responsif.
- Detail cerita dengan backdrop sampul, metadata riil, tombol membaca yang aktif hanya jika bab tersedia, daftar bab, dan tautan koleksi.
- `/koleksi`: penyimpanan ID buku di localStorage pembaca (tidak menyimpan isi naskah dan tidak membutuhkan migrasi database). Fitur ini bersifat lokal per perangkat.
- Navigasi bawah publik: Beranda, Perpustakaan, Koleksi, Tentang.
- Mode contoh hanya jika Supabase belum dikonfigurasi. Delapan cerita visual contoh **tidak** diinsert ke database dan tidak dapat dibaca sebagai novel sungguhan.

### Studio privat
- Dashboard dengan 4 angka yang dihitung dari `getStudioLibrary()` (novel, bab, draft, terbit), quick actions, karya aktif, dan publikasi mendatang.
- Nama sapaan berasal dari `user.user_metadata` (display_name, full_name, name) atau email akun.
- Sidebar dan bottom navigation Studio berbeda dari publik.
- `/studio/analytics` menampilkan hanya metrik publikasi yang tersedia, bukan angka pembaca atau rating fiktif.
- `/studio/settings` berisi tautan manajemen dan sign-out yang fungsional.
- Editor mendapat tata letak navy, panel publikasi, toolbar Markdown yang benar-benar menyisipkan format, serta aksi simpan/pratinjau/publikasi.
- Fitur lama impor naskah, manajemen karya, penjadwalan, publikasi massal, sampah/pemulihan, dan database tetap menggunakan implementasi V5.4.

### Reader
- SecureReaderApp.tsx, ReaderApp.tsx, PageMeasurer.tsx, dan pagination.ts **tidak diubah**.
- ReaderPage.tsx hanya mendapat atribut `data-reader-theme` untuk tekstur kertas yang aman bagi geometri halaman.
- ReadingSettingsModal.tsx diperbarui: Paper, Malam, Sepia, Calm, ukuran teks, font, jarak baris, lebar halaman, perataan, dan spread.
- Tema `black` (OLED V5) tetap ada untuk preferensi yang tersimpan; jika pengguna sedang memakainya, tema tersebut tetap muncul sebagai opsi legacy.
- Pinch, swipe, tap, bookmark, posisi baca, proteksi konten, dan pagination masih dijalankan oleh engine asli.

## Aset baru

Semua berformat WebP di `public/assets/v6/`:

- `hero-library-sunset.webp` — 2400×1350
- `hero-library-sunset-mobile.webp` — 1080×1920
- `studio-ambience.webp` — 1920×1080
- `empty-library.webp` — 1600×900
- `reader-paper-texture.webp` — 1200×1200
- `detail-backdrop.webp` — 1200×800
- `covers/01-senja.webp` s.d. `covers/08-bunga.webp` — masing-masing 800×1200

Ilustrasi dihasilkan sebagai satu artwork sheet lalu dipotong menjadi aset terpisah tanpa label/teks UI. Beberapa file di-upscale dari ilustrasi sumber, sehingga resolusi nominal lebih besar dari detail asli; periksa ketajaman pada layar resolusi tinggi. Sampul penulis yang tersimpan di Supabase tetap diprioritaskan dan ditampilkan dengan `object-fit: contain` di atas backdrop blur.

## Menjalankan

```bash
npm install
npm run lint
npm run test:v6
npm run build
npm run dev
```

Buat `.env` dari `.env.example`, isi kredensial Supabase **publik** yang benar sesuai dokumentasi V5.4. Jangan menyimpan service-role key di frontend. Tidak ada migrasi SQL V6.

## Hasil validasi di lingkungan pembuatan

| Pemeriksaan | Hasil |
|---|---|
| TypeScript transpilation / parsing semua file TS/TSX | Lulus (0 syntax diagnostics) |
| CSS parsing `src/design/v6.css` | Lulus |
| `node scripts/test-v6.mjs` | Lulus |
| `node scripts/verify-public-build.mjs` | Lulus |
| Test V4.2.1, V4.5, V5.1 | Lulus |
| Test V2/V3/V4/V4.2/V4.3/V5.4 | Tidak dapat dijalankan: dependency `typescript` lokal tidak terpasang |
| Test V5 dan V5.3 | Gagal karena ekspektasi visual/hash V5 yang sengaja berubah pada V6 |
| `npm install` | Terhalang DNS registry npm dalam lingkungan eksekusi |
| `npm run lint` / production build | Belum dapat diverifikasi tanpa `node_modules` |
| Browser visual comparison | Percobaan Chromium headless timeout; belum tervalidasi pada browser riil |
| Supabase Auth, RLS, autosave, publish end-to-end | Perlu pengujian dengan project Supabase pengguna |

## Pemeriksaan manual sebelum deploy

1. Di perangkat yang punya akses npm, jalankan instalasi, lint, semua tes yang relevan, dan build.
2. Buka halaman publik di 390×844, 768×1024, 1440×900; bandingkan dengan mockup dan perbaiki bila perlu.
3. Pastikan semua cover asli tampil tanpa cropping yang merusak dan fallback WebP bekerja.
4. Dengan akun penulis yang diizinkan, uji login, create/update buku, create/update bab, autosave setelah mengetik, impor, jadwal, publikasi, unpublish, trash/restore.
5. Dengan akun yang tidak diizinkan, pastikan `/studio/*` tidak membocorkan data.
6. Buka reader pada iOS/Android dan desktop; uji pinch-menu, swipe antarhalaman/bab, bookmark, posisi baca, font-size/margin/tema, dan perubahan pagination.
7. Validasi RLS dan fungsi secure-episode di Supabase staging sebelum produksi.

**Status:** Implementasi source V6 tersedia, tetapi **belum boleh diklaim production-verified** sebelum build dan tes browser/database di lingkungan dengan dependency dan Supabase yang tersedia.
