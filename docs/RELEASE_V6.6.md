# KataKecil V6.6 — Dynamic Hero Carousel (Mobile-First)

**Basis:** source V6.5 Clean Architecture. **Cakupan:** homepage publik saja. Tidak ada perubahan Supabase SQL, Studio, autentikasi, Secure Reader, atau pengaturan tema global.

## Implementasi

- Hero statis diganti carousel yang mengambil **maksimal lima cerita publik dengan bab terbit** dari data `getPublicLibrary()`; urutan berdasarkan waktu rilis bab terbaru (`release_at`), bukan waktu edit draft.
- Cerita draft, terhapus, belum memiliki bab terbit, dan episode yang dijadwalkan untuk masa depan tidak memenuhi syarat. Data Supabase asli dan cover penulis tetap digunakan. Saat tidak ada cerita yang memenuhi syarat (termasuk saat demo offline), hero ilustrasi perpustakaan lama tetap tampil, **tanpa membuat slide fiktif**.
- Carousel memakai animasi geser horizontal 500 ms dengan loop mulus melalui slide kloning di tepi, autoplay 6 detik, swipe horizontal, dots, dan tombol navigasi pada desktop. Pada mobile, tombol panah disembunyikan agar indikator slide memiliki target sentuh 44×44 px; swipe dan dots tetap tersedia.
- Autoplay dijeda selama 10 detik setelah interaksi, berhenti saat pointer hover, dan saat tab tersembunyi. Pengaturan `prefers-reduced-motion: reduce` mematikan autoplay dan transisi.
- Hero mobile lebih pendek: `clamp(450px, 58svh, 535px)`; konten halaman memiliki padding untuk bottom navigation dan safe-area.
- Bagian *Lanjut Membaca* hanya muncul jika ada progres lokal yang cocok dengan bab terbit; rekomendasi dan cerita lain tidak mengulang buku yang ada di hero.
- Kategori genre pada blok *Jelajahi Perpustakaan* membuka daftar dengan filter `?genre=...` yang benar-benar aktif, bukan tombol dekoratif.
- Warna mengikuti dua tema global V6.4: midnight navy dan warm ivory. Aset ilustrasi desktop/mobile yang sudah tersedia digunakan kembali; tidak ada file gambar baru atau cover pengguna yang ditimpa.

## Berkas utama

- `src/features/public/components/FeaturedHeroCarousel.tsx` — komponen carousel, kontrol dan fallback.
- `src/features/public/featuredStories.ts` — seleksi dan urutan cerita berdasarkan tanggal rilis.
- `src/pages/PublicLibrary.tsx` — integrasi homepage, konten unik dan filter genre.
- `src/design/v66-featured-carousel.css` — layout mobile/desktop, dua tema, reduced motion, safe area.
- `src/App.tsx` — import stylesheet V6.6.
- `scripts/test-v66.mjs` — tes seleksi konten dan kontrak UI.

## Pengujian

| Pemeriksaan | Status |
|---|---|
| Tes regresi aktif V4.2, V4.2.1, V4.3, V4.5, V5, V5.1, V6.4, V6.5, V6.6 | Lulus |
| Struktur import dan aset lokal | Lulus |
| 13 file keamanan/Reader terhadap hash V6.5 | Identik; tes V6.5 lulus |
| Render fixture CSS Chromium 390px dan 1440px, terang/gelap | Lulus tanpa horizontal overflow; gambar termuat |
| Production build (`npm run build`) | Belum terverifikasi: dependensi Vite tidak tersedia |
| TypeScript full check (`npm run lint`) | Belum terverifikasi: `vite/client` tidak tersedia |
| Supabase langsung dan carousel React di browser | Belum diuji; membutuhkan konfigurasi deployment |

Screenshot pratinjau CSS berasal dari fixture statis, bukan render aplikasi React dengan Supabase. Pengujian tersebut memeriksa presentasi CSS, **bukan** membuktikan autoplay/swipe React berjalan pada perangkat asli.

## Sebelum deployment

1. Jalankan `npm install`, `npm run lint`, `npm run test:current`, dan `npm run build` pada lingkungan dengan akses npm.
2. Uji Supabase dengan satu cerita terbit, beberapa cerita terbit, tidak ada cerita terbit, dan cerita yang baru dijadwalkan.
3. Uji autoplay, swipe, dots, fokus keyboard, mode terang/gelap, dan safe-area pada perangkat mobile nyata.
4. Uji kembali login Studio, autosave, publikasi, dan seluruh gesture Reader. Tidak diperlukan migrasi database.

**Status:** source siap diuji dan diintegrasikan, belum dinyatakan production-ready.
