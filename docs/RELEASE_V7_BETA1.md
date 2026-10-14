# KataKecil V7.0 Beta.1 — Sapphire Refinement & Reading Continuity

**Tanggal:** 14 Oktober 2026. **Status:** kandidat pengujian staging, **bukan** deployment produksi. Basis: V7.0 Alpha.4.

## Perubahan yang sudah diterapkan

1. **Perbaikan root cause warna warisan.** Style V5/V6 mendefinisikan ulang `--kk-muted`, `--kk-border`, dan `--kk-shadow` di shell publik dan Studio. Tiga alias `--sapphire-*` yang bersumber dari dua tema global sekarang dipakai untuk mengunci nilai variabel tersebut pada kedua mode. Tidak ada warna baru di `v70-beta1.css`.
2. **Koleksi dan empty state responsif.** Empty state menggunakan permukaan Sapphire tanpa gradient krem, dengan padding adaptif dan tinggi konten, bukan kartu kosong setinggi layar. Perbaikan layar 320–600 px dan ruang aman di atas bottom navigation.
3. **Progress membaca yang lebih akurat.** Penyimpanan progress Reader kini mencatat `updatedAt` (metadata saja) untuk memilih cerita yang paling terakhir dibaca pada Beranda. Struktur lama `{ep,part,offset}` tetap dapat dibaca. Hanya episode yang sudah terbit yang memenuhi syarat sebagai target lanjutan.
4. **Melanjutkan posisi yang tepat.** Tombol Lanjut Membaca pada Beranda dan detail cerita membuka `/baca/:slug` **tanpa** `?episode=...`, agar Reader memulihkan offset tersimpan. Tautan eksplisit dari daftar bab tetap memakai query episode dan dimulai dari awal bab yang dipilih.
5. **Label Bab konsisten.** Daftar Bab menggunakan utilitas `readerHeading` untuk menampilkan `BAB N` dan judul bersih meski metadata server menggunakan `Episode N — Judul`. Tidak mengubah konten Supabase.
6. **Carousel Temukan lebih aksesibel.** Indikator slide memiliki area sentuh 44×44 px, mendukung tombol panah keyboard, menghormati reduced-motion, dan tidak langsung melanjutkan auto-slide setelah swipe yang disengaja.
7. **Pengumuman publik aktif.** Query menyingkirkan pengumuman yang kedaluwarsa sebelum limit delapan baris; pemeriksaan waktu di klien tetap dilakukan sebagai lapisan kedua.

## Keamanan dan kompatibilitas

- Tidak mengubah `src/data/secureReader.ts`, `src/utils/pagination.ts`, `src/components/PageMeasurer.tsx`, atau RLS.
- Tidak menyimpan teks naskah atau isi episode di localStorage. Progress hanya menyimpan nomor episode, offset, part, dan timestamp.
- Studio tetap privat; tidak ada perubahan autentikasi, publikasi, autosave, atau kebijakan akses.
- **Tidak ada migrasi baru untuk Beta.1.** Fitur Pengumuman dari Alpha.3 masih memerlukan `supabase/migrations/20261014010000_v7_public_announcements.sql` jika belum diterapkan.
- Tidak menimpa sampul, cerita, atau database Supabase.

## Hasil pemeriksaan di lingkungan ini

| Pemeriksaan | Hasil |
|---|---|
| `npm run test:current` | PASS — 17 kelompok kontrak/regresi (termasuk Beta.1) |
| `npm run check:structure` | PASS — semua import dan asset lokal terselesaikan |
| `npm run audit:v7-theme` | PASS — token tema, 6 pasangan kontras WCAG AA |
| `npm run audit:v7beta` | PASS — stylesheet Beta baru tidak memiliki literal warna |
| Fixture CSS di Chromium 320/390/768/1440 px × 2 tema | PASS — 8 konfigurasi, token publik/Studio, empty state, overflow, target carousel |
| `npm run lint` | BELUM — dependensi `vite/client` tidak tersedia |
| `npm run build` | BELUM — `vite` tidak tersedia; pre-build guard lulus |
| QA React runtime dan Supabase staging | BELUM DILAKUKAN |

**Audit historis:** 1.080 literal warna berada di stylesheet CSS non-V7 di luar token; angka ini adalah inventaris statis, bukan 1.080 bug visual. Jangan menghapus/mengganti massal tanpa visual regression dan audit cascade. Perbedaan angka dengan `audit:colors` disebabkan cakupan penghitung yang berbeda (termasuk token global).

## QA yang harus dilakukan sebelum deploy

1. Jalankan `npm install`, `npm run lint`, `npm run build` di lingkungan yang memiliki dependency dan registry npm.
2. Terapkan migrasi Pengumuman di Supabase **staging** bila belum ada; uji RLS draft/publik/penulis.
3. Uji Beranda, Temukan, Koleksi, Detail, Reader, Studio pada 320, 375, 390, 430, 768, 1024, 1440 px dalam dua tema.
4. Baca sebagian Bab 0 dan Bab 5, pindah cerita, buka Beranda, lalu tekan **Lanjut Membaca**: harus kembali ke offset tersimpan, bukan ke awal bab.
5. Pastikan perubahan font, rotasi, pinch, swipe, tap, fullscreen, bookmark, status selesai, dan pencarian tidak merusak pagination.
6. Uji pengumuman terjadwal/kedaluwarsa dan swipe carousel di HP.
7. Uji Studio: login tidak berwenang, draft, autosave, impor, upload, publish, jadwal, dan restore.
8. Backup database, uji staging, lalu deploy dengan rollback ZIP Alpha.4 jika regresi ditemukan.

`qa/check-theme-browser.py` adalah fixture **CSS statis** (bukan screenshot dari aplikasi React yang berjalan); jalankan dengan Python Playwright dan Chromium yang tersedia di lingkungan QA. Screenshot fixture berada di `qa/screenshots/`.
