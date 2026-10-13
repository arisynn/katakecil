# KataKecil V6.11 — Immersive Reader & Sapphire Loading

**Basis:** V6.10. **Database:** tidak ada migrasi baru. **Konten:** judul dan naskah asli tidak diubah.

## Yang berubah

1. **Pinch-to-minimize kembali aktif.** Pinch inward membuka Reader dalam bentuk halaman yang mengecil, pinch outward menutup kontrol. Tap tengah dan tombol menu tetap alternatif aksesibilitas. Transform hanya mengubah presentasi, bukan ukuran kolom pagination.
2. **Judul bab otomatis.** `readerHeading()` mengubah `Episode 5 — Judul`, `Bab 5: Judul`, `5. Judul`, dan judul polos menjadi `BAB 5` di tengah, diikuti judul di bawahnya. `Prolog` dan `Epilog` ditangani khusus. Nomor berasal dari metadata episode/urutan chapter; judul database tidak ditulis ulang. Prefix yang bertentangan dengan nomor metadata tidak dihapus secara diam-diam.
3. **Kontrol ringkas.** Header berisi kembali, judul, penanda, dan menu. Menu tambahan menampung daftar isi, pengaturan, pencarian, navigasi antar-bab, dan fullscreen. Footer berisi slider dan tombol halaman sebelumnya/berikutnya. Daftar isi dan penanda menggunakan bottom sheet di mobile.
4. **Loading baru untuk semua konteks.** Splash awal (sebelum React), loading Public, Studio, dan Reader berbagi simbol buku beranimasi, tiga indikator indeterminate, dan teks kontekstual. Semua dibuat dengan CSS/SVG inline; tidak ada aset wallpaper. Tema aktif diterapkan sejak HTML pertama untuk mencegah flash warna terang pada mode gelap. `prefers-reduced-motion` mematikan animasi.
5. **Audit warna.** Warna langsung pada indikator jadwal Studio diganti token. Seleksi teks, halaman recovery Reader, heading, panel, dan loading kini menggunakan Arctic Blue/Midnight Sapphire. `npm run audit:colors` memverifikasi tidak ada warna hexadecimal langsung di komponen UI dan keberadaan palet global.

## Batasan audit warna

Source lama masih memiliki sekitar **1.200 deklarasi warna hexadecimal di stylesheet historis** (termasuk warna status, bayangan, dan aturan yang sudah tertimpa). Ini **bukan** berarti ada 1.200 masalah visual, tetapi audit statis tidak dapat membuktikan seluruh CSS cascade pada setiap halaman. Pengujian visual langsung kedua tema tetap diperlukan sebelum mengklaim 100% konsisten.

## Validasi yang berhasil

- `npm run test:current`: **14 kelompok tes regresi lulus**, termasuk pengujian perilaku pure-function heading dan gesture.
- `npm run audit:colors`: lulus, 30 komponen UI tanpa kode warna langsung.
- `npm run check:structure`: lulus.
- Parser CSS `tinycss2`: stylesheet V6.11 dan CSS boot tanpa error sintaks.
- File keamanan dan pagination `secureReader.ts`, `supabase.ts`, `pagination.ts`, `PageMeasurer.tsx`, dan `content-protection.css` identik dengan baseline V6.10 (hash SHA-256).

## Belum dapat diverifikasi

- `npm run lint` belum selesai: `vite/client` tidak ditemukan karena dependency npm belum terpasang.
- `npm run build` belum selesai: executable Vite tidak tersedia. Percobaan instalasi npm mengalami timeout.
- Chromium headless tidak berhasil menghasilkan screenshot fixture; visual runtime dan pinch dua-jari pada perangkat nyata belum teruji.
- Supabase staging dan alur navigasi/publikasi live belum diuji.

## Checklist integrasi sebelum deploy

1. `npm install`, `npm run lint`, `npm run test:current`, `npm run audit:colors`, `npm run build`.
2. Android Chrome: pinch inward/outward, tap tengah, swipe halaman, tap area luar, perubahan bab, modal daftar isi, penanda, dan pengaturan.
3. Reader: perubahan font/margin, rotasi, mode spread, reload, progres terakhir, Prolog/Epilog, nomor episode yang melompat, judul dengan prefix, dan naskah dengan heading di dalam isi.
4. Splash dan loading Public/Studio/Reader: light/dark, cold load, jaringan lambat, reduced motion, serta tidak ada kilatan warna yang salah.
5. Public, Studio, Reader, dan dialog: audit warna aktual pada mobile 360/390/430px, tablet, desktop, termasuk error/loading/empty state.
6. Verifikasi endpoint publik tetap hanya mengirim episode yang terbit dan akses Studio tetap privat.

**Status:** source V6.11 untuk pengujian integrasi, belum diklaim siap produksi.
