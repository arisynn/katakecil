# KataKecil V7.0.0-alpha.4 — Smart Reader & Sapphire Recovery

**14 Oktober 2026 — Source untuk pengujian staging; bukan deployment produksi.** Basis: Alpha.3. Fitur Pengumuman Studio Alpha.3 tetap tersedia dan **masih memerlukan migrasi Supabase Alpha.3** sebelum digunakan.

## Perubahan fungsional

1. **Tanda bab selesai manual.** Menu Reader kini memiliki `Tandai bab selesai` / `Batalkan tanda selesai`. Status disimpan sebagai array nomor episode di `localStorage` dengan key `kk-reader-completed-v1-<bookId>` dan ditampilkan sebagai indikator **Selesai** pada Daftar Isi. Metadata disimpan per cerita/perangkat; tidak ada konten naskah, teks episode, atau akun pembaca yang disimpan.
2. **Perkiraan waktu tersisa.** Kontrol Reader menampilkan perkiraan menit tersisa berdasarkan jumlah kata episode terbit, rasio halaman tersisa, dan asumsi 220 kata/menit. Ini estimasi, bukan pelacakan perilaku pembaca; ketika sampai halaman terakhir ditampilkan `Halaman terakhir`.
3. **Loading bab lebih informatif.** Loading menampilkan `BAB N` dan judul dari indeks episode yang telah terbit, jika sudah tersedia. Saat indeks belum dimuat, tampilkan loading generik. Episode 0 ditampilkan sebagai `BAB 0` (tanpa mengubah data server).
4. **Sapphire recovery.** Layar error/pemulihan Reader, overlay panel, shadow dan hover pembaca kini memakai token global terang/gelap. Warna krem hardcoded pada recovery screen dihapus.
5. **Reader UI tetap aman.** Tidak mengubah `src/data/secureReader.ts`, `src/utils/pagination.ts`, `src/components/PageMeasurer.tsx`, atau `src/content-protection.css`. Gesture pinch, swipe, pencarian, bookmark, posisi teks, dan otorisasi server tetap menggunakan mekanisme lama.

## Validasi lokal

- `npm run test:current`: **PASS — 16 kelompok pengujian kontrak/regresi**, termasuk Alpha.4.
- `npm run test:v7alpha4`: **PASS** (normalisasi status, toggle, estimasi waktu, wiring UI, parse TS/TSX).
- `npm run audit:v7-theme`: **PASS** (CSS V7 hanya token, recovery bebas warna literal, enam pasangan kontras AA).
- `npm run audit:colors`: **PASS** untuk kontrak audit komponen, tetapi masih ada **1.104 literal warna di CSS historis**. Turun dari 1.115 pada Alpha.3. Ini **bukan** bukti bahwa seluruh halaman telah sempurna secara visual.
- `npm run check:structure`: **PASS**.
- `npm install`: **GAGAL** — DNS `EAI_AGAIN` pada `registry.npmjs.org`.
- `npm run build`: **BELUM LULUS** — `vite: not found` akibat dependency tidak terpasang.
- `npm run lint`: **BELUM LULUS** — tipe `vite/client` tidak tersedia.
- **Browser runtime, Supabase staging, mobile visual QA, dan deployment: BELUM DIUJI**.

## Pemeriksaan staging sebelum rilis

1. Jalankan `npm ci`/`npm install`, `npm run lint`, `npm run build`, dan tes di lingkungan dengan akses registry.
2. Gunakan Supabase staging; jika fitur pengumuman diperlukan, terapkan `supabase/migrations/20261014010000_v7_public_announcements.sql` dari Alpha.3 setelah backup dan uji RLS.
3. Buka Reader pada 320, 375, 390, 430 px, tablet, dan desktop; verifikasi pusat halaman saat pinch, rotasi, tema terang/gelap, dan loading ketika pindah bab.
4. Tandai Bab 0 dan bab lain sebagai selesai; muat ulang, buka Daftar Isi, dan batalkan tanda selesai. Periksa bahwa status buku lain tidak terpengaruh.
5. Ubah font, margin, dan ukuran layar. Pastikan posisi membaca tetap benar, tidak ada duplikasi halaman atau teks hilang.
6. Uji error jaringan Reader untuk memastikan recovery screen tidak berubah menjadi krem pada dark mode.
7. Periksa alur publik Temukan/Koleksi dan Studio (autosave/publikasi) sebelum deployment Vercel.

## Catatan kompatibilitas dan batasan

- Tidak ada migrasi database **baru** untuk Alpha.4. Alpha.3 masih membutuhkan migrasi pengumuman.
- Completion status hanya di perangkat/browser ini; tidak disinkronkan lintas perangkat.
- Status bab selesai **manual**, bukan otomatis saat sampai halaman terakhir.
- Perkiraan waktu tidak mengumpulkan telemetry dan tidak menentukan apakah pengguna telah membaca seluruh isi.
- Tidak ada Web Push atau PWA offline dalam rilis ini.
- Audit CSS historis menyisakan pekerjaan untuk Beta; hindari mengganti semua warna secara membabi buta tanpa pemeriksaan cascade dan browser.
