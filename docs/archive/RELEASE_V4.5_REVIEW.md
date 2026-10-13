# KataKecil V4.5 Review Candidate

## Audit

Data terakhir dicek 2026-10-12 menggunakan koneksi Supabase read-only. `secure-episode` tidak tercantum pada fungsi terpasang. `secure-reader` V4.2 aktif. Database masih memakai `episode_number > 0`. Akses SELECT `content_md` untuk role anon/authenticated masih terbuka pada episode yang lolos kebijakan RLS.

## Patch

- Endpoint gabungan yang aman untuk **index metadata** dan **isi satu episode**.
- Keduanya server-validated: novel publik, episode aktif, tanggal rilis berdasarkan waktu server; tetap menggunakan rate limit SQL.
- Browser tidak lagi meminta indeks `qr_episodes` secara langsung untuk Reader.
- Menghindari penyimpanan teks ke localStorage (progress dan preferensi tetap disimpan).
- Tidak mengubah tampilan atau gesture Reader, rilis, editor, dan importer.
- Memisahkan SQL pengamanan SELECT body ke berkas `REVIEW_ONLY` yang tidak dapat ikut menjalankan migrasi otomatis.
- Menambahkan tes V4.5 self-contained terhadap mock database. Tes produksi dan mobile masih wajib.

## Batas klaim

Paket ini **bukan deployment** dan tidak mengandung source repository lengkap. Tanpa repository lengkap, build frontend dan integrasi Studio tidak dapat dipastikan lolos. Jangan menamai hasil ini production-ready sampai gate di dokumen arsitektur lulus.
