# KataKecil V7.1 RC.1 — Five Minds Refinement

**Tanggal:** 14 Oktober 2026  
**Basis:** V7.0 Beta.2  
**Status:** **release candidate source; belum siap deployment produksi tanpa QA staging**  
**Arah:** refinement sedang, visual Sapphire dipertahankan; Public dan Studio mendapat prioritas seimbang.  
**Tim review virtual:** Nara (visual), Raka (public UX), Kirana (Studio UX), Bima (integrasi), Tara (QA). Ini pembagian review dalam satu implementasi, bukan lima proses coding independen.

## Yang diimplementasikan

### Public — Raka & Nara

- Filter status Temukan kini memiliki **Semua / Berlangsung / Tamat / Jeda**. Sebelumnya `hiatus` salah masuk `Berlangsung`.
- Hasil Temukan memperlihatkan jumlah dan **Reset semua filter** termasuk urutan sortir; status tidak diklaim sebagai trending atau ranking pembaca.
- **Katalog gagal dimuat** sekarang dibedakan dari **belum ada cerita terbit**, dengan pesan yang mudah dipahami, detail error, dan tombol **Coba lagi**. Gagal memuat metadata tambahan tidak menggagalkan katalog utama.
- **Koleksi** memberi tombol **Lanjut baca** untuk progres yang masih merujuk bab publik; rute `/baca/:slug` **tanpa** parameter episode mempertahankan offset.
- **Detail Cerita** memberi petunjuk progres, label `Jeda` yang konsisten, dan urutan bab yang benar (prolog ditandai `P`).
- Akses Studio tetap tersedia di header desktop sebagai tindakan sekunder, dan di menu tambahan mobile. Autentikasi/RLS tetap menjadi batas keamanan yang sesungguhnya.
- CSS publik menggunakan token Sapphire yang sudah ada; tidak mengganti cover, wordmark, atau layout dasar.

### Studio — Kirana & Nara

- Dashboard menampilkan waktu edit terakhir draft dari `updated_at` yang nyata, dalam WIB.
- Editor menampilkan error autosave dekat toolbar dan tombol **Coba simpan** bahkan pada mode fokus; footer tidak menyamarkan status gagal menyimpan. Logika queue, flush, navigasi, dan publikasi **tidak diubah**.
- Daftar **Karya Saya** memiliki filter **Semua / Publik / Privat**, jumlah hasil, dan reset ketika tidak ada kecocokan.
- Daftar bab memperlihatkan jumlah hasil dan reset filter; Bab 0 ditandai `P`.
- Pengumuman memakai **WIB (UTC+07:00) untuk input dan tampilan** terlepas dari timezone perangkat, menggunakan helper `fromWib`/`toWibInput` yang sudah ada. Waktu akhir divalidasi harus setelah waktu mulai.
- Menu Alat Studio menandai item yang aktif melalui `aria-current`.

### Architecture & QA — Bima & Tara

- Versi paket `7.1.0-rc.1`.
- Dua stylesheet scoped baru (`public-experience.css`, `studio-experience.css`), bukan `v71.css` global; warna hanya dari token tema.
- Tes baru `test-v71-public.mjs` dan `test-v71-studio.mjs`, dimasukkan ke `test:current` tanpa menghapus tes lama.
- Reader Engine dibekukan dan diverifikasi terhadap **lima hash SHA-256 baseline**.
- Tes historis hanya diperluas untuk menerima versi RC.1; assertion fitur lama tetap dijalankan.
- Tidak ada perubahan skema Supabase, migrasi, secret, atau data cerita.

## Verifikasi lokal

| Pemeriksaan | Hasil | Catatan |
|---|---|---|
| `npm run check:structure` | **PASS** | 103 source files, 288 referensi lokal |
| `npm run test:current` | **PASS** | Seluruh tes V4.2–V7.0 + V7.1 (via TypeScript global yang ditautkan sementara) |
| `npm run test:v71` | **PASS** | Semantik status, retry, WIB, dan guard Reader |
| `npm run audit:v7-theme` | **PASS** | Dua tema, 6 pasangan kontras yang diaudit |
| `npm run audit:v7beta` | **PASS** | CSS Beta lama tidak bertambah literal warna |
| `node scripts/verify-public-build.mjs` | **PASS** | Pemeriksaan source bundle publik, **bukan** Vite build |
| `npm run lint` | **BLOCKED** | Dependensi `vite/client` belum terpasang; bukan bukti kesalahan source |
| `npm run build` | **BLOCKED** | Executable `vite` belum tersedia; registry npm tidak dapat diakses |
| Browser React runtime | **NOT RUN** | Perlu `npm install` dan konfigurasi Supabase |
| Supabase staging + negative RLS | **NOT RUN** | Perlu proyek dan akun staging yang disetujui |
| iOS Safari/Android gesture QA | **NOT RUN** | Perlu perangkat/browser nyata |

**Tidak boleh dinyatakan production-ready** sampai lint/build, runtime, RLS, dan gesture QA lulus.

Matriks lengkap status QA tersedia di [`V7_1_QA_MATRIX.md`](V7_1_QA_MATRIX.md).

## Acceptance staging yang masih harus diselesaikan

1. `npm ci` atau `npm install` pada lingkungan online, lalu jalankan seluruh perintah pemeriksaan di README.
2. Screenshot **runtime React** di 320, 375, 390, 430, 768, 1024, dan 1440 px, tema terang/gelap; periksa overflow, fokus, CTA, dan safe area.
3. Uji Temukan: ongoing/completed/hiatus, filter kombinasi, reset, pencarian kosong, katalog error, retry, dan tidak ada data publik.
4. Uji Koleksi: bookmark, reload, Bab 0, progres valid/tidak valid, lanjut baca memulihkan offset; tidak ada klaim sinkronisasi akun.
5. Uji Reader: pinch, swipe, pagination, pengaturan font, rotasi, bookmark, episode eksplisit, resume offset, preview; pastikan tidak ada isi naskah di localStorage.
6. Uji Studio sebagai anonim, akun bukan penulis, dan pemilik: RLS `qr_author_members`, CRUD, impor, autosave offline/retry, jadwal, publikasi, sampah/restore.
7. Uji Pengumuman WIB pada perangkat timezone `Asia/Jakarta` dan timezone lain (misalnya `UTC`), termasuk jadwal berakhir dan draft.
8. Pastikan migrasi `supabase/migrations/20261014010000_v7_public_announcements.sql` telah diterapkan di staging bila fitur pengumuman digunakan.

## Rollback

- Simpan ZIP V7.0 Beta.2 yang asli dan backup staging sebelum deploy.
- Jika ada regresi, kembalikan source/build V7.0 Beta.2. Tidak ada migrasi V7.1 yang perlu di-rollback.
- Jangan rollback database produksi tanpa prosedur backup terpisah.
- Data buku, episode, cover, bookmark browser, dan key progress Reader **tidak diubah** oleh update source ini.

## Known limitations

- Belum ada build Vite yang terverifikasi; tidak ada deployment.
- QA CSS/kontrak bukan pengganti tes aplikasi React asli.
- Perilaku menu tambahan, touch, dan screen reader memerlukan pengujian browser nyata.
- Studio dan data Supabase tidak dapat diuji tanpa kredensial staging; tidak ada klaim akses RLS telah diverifikasi.
