# KataKecil V5.4 — Cara Memasang Update

**Ini adalah source code V5.4 yang telah diedit**, bukan prompt untuk AI coder.

## Cara termudah (project GitHub + Vercel yang sudah berjalan)

1. **Backup** repository dan data Supabase terlebih dahulu. Simpan salinan naskah penting di luar hosting.
2. Buka project GitHub lokal milikmu (yang sudah tersambung ke `origin/main`). Salin isi ZIP V5.4 ke folder project itu dengan opsi **timpa file bernama sama**, **jangan hapus file lokal yang tidak ada di ZIP**. ZIP tidak menyertakan folder `.git` supaya riwayat repository-mu aman.
3. **Sebelum menggunakan Bulk Publish**, buka Supabase SQL Editor dan jalankan **satu** migration baru:
   `supabase/migrations/20261012210000_katakecil_v54_bulk_publish.sql`.
   Migration menambah metadata `is_finale` dan fungsi `qr_bulk_publish_drafts` dengan pengecekan author. Tidak otomatis mempublish data lama.
4. Di folder project, jalankan:
   ```bash
   npm install
   npm run lint
   npm run test:v54
   npm run build
   ```
5. Review dengan `git diff`/`git status`, lalu push ke branch GitHub seperti biasa dan biarkan Vercel deploy.
6. Setelah deploy, cek menu Tema (System/Light/Dark), halaman baca (empat palette), Studio → Karya → pilih novel → Penerbitan cepat, dan impor EPUB menggunakan file uji. Untuk menguji Bulk Publish, **pakai cerita uji** terlebih dahulu (jangan naskah produksi), lalu verifikasi halaman publik.

## Ringkasan fitur

- App Theme: **System (default)**, Light (Mist Blue), Dark (Midnight Mist Blue). Kunci tersimpan: `appThemePreference`. Preferensi V5.3 dimigrasikan, dan Reader memiliki penyimpanan terpisah.
- No-white-flash: tema diterapkan sejak `index.html`, dilanjutkan dengan komponen `ThemeLoading` global.
- Header publik mobile bersih (logo + tema); navigasi Beranda/Perpustakaan/Penulis berada di bottom bar. Header menyusut/hilang saat scroll turun dan muncul saat naik. Layout desktop tetap menggunakan navigasi header.
- Studio mobile menggunakan bottom tabs, tidak lagi punya hamburger di header. Tombol `Publik` ada di kanan atas; `Keluar akun` tersedia di menu Lainnya dan toolbar desktop.
- Reader: palette Mist Paper (default untuk pembaca baru), Sepia Classic, Night Blue, OLED Dark. Pengguna lama tetap menggunakan pilihan yang sudah tersimpan. Mekanisme halaman, gesture, pagination, dan secure-reader tidak diubah.
- Bulk publish: transaksi server satu novel, menghitung draft di bawah lock; jika jumlah berubah/ada draft kosong, semua dibatalkan. Tidak mengubah jadwal lama. Menandai Tamat sekaligus memberi atribut `is_finale` pada episode bernomor tertinggi (bahkan jika belum tayang).
- Impor: checklist proses, deteksi cover dan episode, dan verifikasi penyimpanan database sebelum menyebut selesai.

## Catatan keselamatan

- **Jangan aktifkan Bulk Publish di produksi sebelum migrasi SQL sukses**. Tanpa migrasi, tombol memberi pesan kesalahan dan tidak menerbitkan episode.
- Bulk Publish **membuat novel tampil di perpustakaan** (`is_published=true`) dan menjadikan seluruh draft pada novel itu langsung terbaca; pastikan sudah benar saat konfirmasi.
- Episode dengan jadwal mendatang **tidak** ditarik maju. Finale baru tampak di publik setelah episodenya sendiri terbit.
- Status `Draft` pada UI direpresentasikan oleh novel privat dan/atau episode tidak diterbitkan. Kolom status novel yang sudah ada (`ongoing`/`completed`/`hiatus`) dipertahankan demi kompatibilitas; migrasi tidak mengubah enum atau status data lama.
- Jangan menghapus/mengulang migrasi lama atau menyisipkan SQL melalui browser. Supabase RLS & Secure Reader tetap ada.
- `npm run test:v54` adalah regression tests tingkat sumber/kontrak. Pengujian transaksi Supabase nyata dan pemeriksaan visual mobile/desktop masih wajib saat deploy.

## Batas verifikasi di lingkungan pengerjaan

Pengujian parser TypeScript/TSX, test tanpa browser V2–V5.4, dan pengecekan source publik dilakukan. Instalasi `npm install` untuk build browser tidak berhasil di lingkungan pengerjaan (akses registry npm terhenti), sehingga **build produksi Vite, visual QA browser, dan SQL terhadap database live belum diverifikasi**. Jalankan perintah di atas sebelum push ke production.
