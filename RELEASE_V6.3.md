# KataKecil V6.3 — iOS-Inspired Mobile-First Refresh

Tanggal: 13 Oktober 2026

## Perubahan utama

- Public mobile mengikuti arah mockup iOS gelap/terang: glass header yang tetap terlihat saat scroll, bottom tab bar dengan selected state, hero editorial, kartu cerita bersudut lembut, grid perpustakaan dua kolom, detail cerita sinematik, dan panel bab yang nyaman dibaca.
- Hero mobile **gelap** memakai `hero-library-sunset-mobile.webp`; hero mobile **terang** memakai `empty-library-mobile.webp`. Desktop tetap menggunakan aset komposisi desktop dari V6.1/V6.2.
- Palet baru: light warm ivory `#F8F2E9` dan dark deep navy `#091424`; accent light bronze `#925C29` dan dark champagne `#F4D29A`. Teks, permukaan, border, dan glass material memiliki token masing-masing.
- Menu mobile hanya berisi akses Studio (tetap melewati autentikasi/otorisasi yang ada) dan pilihan tema Otomatis/Terang/Gelap. Navigasi utama tetap hanya ada di bottom bar; pencarian memakai kolom pencarian halaman Perpustakaan, bukan duplikasi.
- Brand tidak menjadi tombol Beranda kedua. CTA utama membaca membuka reader langsung ketika bab terbit tersedia, atau Perpustakaan ketika belum ada bab. Link “Lihat Semua” yang berulang di bagian Terbaru dihapus.
- Detail cerita mobile memakai satu tombol kembali ke Perpustakaan; global header/tab bar tidak digandakan di layar detail.
- Reader: chrome kontrol iOS transparan yang mengikuti **tema Reader sendiri**, termasuk ketika tema Reader berbeda dari tema aplikasi. Sistem gesture/pagination/proteksi tetap sama. Pengaturan membaca memakai tile tema dan grouped controls.
- Studio mobile: cards, quick actions, bottom nav, dan editor diselaraskan secara visual dengan desain baru; mekanisme auth, autosave, publikasi, impor, dan data tidak diubah.

## File yang ditambah/diubah

- `src/design/v63-ios.css` (baru)
- `src/components/public/PublicHeader.tsx`
- `src/pages/PublicLibrary.tsx`
- `src/components/ReaderControls.tsx`
- `src/components/ReadingSettingsModal.tsx`
- `src/App.tsx`
- `scripts/test-v63.mjs` (baru)
- `package.json` (versi dan script tes)

## Aset

Seluruh 28 aset WebP dari V6.2 disertakan. Tidak ada cover Supabase yang ditimpa, tidak ada cerita contoh yang disimpan ke database, dan tidak ada aset baru yang wajib diunduh.

## Verifikasi yang dijalankan

- `npm run test:v63` — PASS
- `npm run test:v62` — PASS
- `npm run test:v61` — PASS
- `npm run test:v2`, `v3`, `v4`, `v42`, `v421`, `v43`, `v45`, `v5`, `v51` — PASS
- Pemeriksaan sintaks TypeScript transpile seluruh 43 modul — PASS (bukan typecheck penuh)
- Parser CSS V6.3 — PASS
- Screenshot fixture HTML/CSS Chromium: gelap dan terang, Homepage, Library, Detail, dan Reading Settings pada 390×844 — PASS
- Pemeriksaan 24 kombinasi halaman/tema/resolusi 320/390/600 px tanpa horizontal overflow — PASS
- Header fixture tetap fixed setelah scroll — PASS
- Kontras pasangan warna utama ≥4.5:1 — PASS
- `npm run test:v53`, `test:v54`, `test:v6` — FAIL pada baseline/hash atau struktur UI lama (sudah berubah pada V6.2), bukan bukti kerusakan reader.
- `npm run lint` — belum dapat dijalankan lengkap: `vite/client` tidak tersedia di node_modules.
- `npm run build` — belum dapat dijalankan: `vite` tidak terinstal. Percobaan npm install terhalang konektivitas/timeout registry.

## Batas verifikasi

Pratinjau V6.3 berasal dari fixture HTML yang menggunakan CSS dan aset asli, **bukan** screenshot aplikasi React terhubung ke Supabase. Autentikasi Studio, autosave, publikasi, impor, pengujian gesture pada perangkat nyata, dan production build tetap harus diuji setelah dependency tersedia.

## Cara menjalankan

```bash
npm install
npm run lint
npm run test:v63
npm run build
npm run dev
```

Gunakan variabel lingkungan Supabase sesuai `.env.example` dan kebijakan keamanan versi sebelumnya. Tidak ada migrasi database V6.3.
