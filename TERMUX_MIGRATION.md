# Migrasi KataKecil V4 langsung dari Termux

Paket ini menyertakan `migrate-katakecil-termux.sh`. Skrip dijalankan dari **folder hasil ekstrak proyek V4**, bukan dari direktori GitHub yang belum berisi migrasi.

## 1. Persiapan Termux

```bash
pkg update
pkg install postgresql unzip
termux-setup-storage
mkdir -p ~/katakecil-v4
cd ~/katakecil-v4
unzip -o ~/storage/downloads/KataKecil_V4_Termux_Ready.zip
```

Nama file ZIP bergantung pada nama yang disimpan Android. Sesuaikan path bila berbeda.

## 2. Dapatkan database connection string

Buka [Supabase Dashboard](https://supabase.com/dashboard), masuk ke **project yang menyimpan novel pertama**, lalu klik **Connect → Session pooler (port 5432)**.

Contoh format URL **tanpa password** yang dimasukkan saat diminta skrip:

```
postgresql://postgres.PROJECT_REF@POOLER_HOST:5432/postgres
```

Ambil **host, port, dan user** dari halaman Connect (jangan menebak host). Hapus `:[YOUR-PASSWORD]` sebelum `@`; skrip akan meminta **password database** pada baris berikutnya secara tersembunyi. Password itu **bukan** Supabase publishable key/API key.

Koneksi melalui port `6543` (transaction pooling) ditolak. Bila tersedia koneksi langsung yang mendukung IPv6, direct connection port 5432 juga dapat dipakai. SSL diwajibkan.

## 3. Jalankan prapemeriksaan (tanpa perubahan)

```bash
bash migrate-katakecil-termux.sh --check
```

Skrip mendeteksi status V1–V4, termasuk jika migrasi sudah dipasang. Jika ada migrasi *sebagian* atau RLS V1 bermasalah, skrip berhenti dan tidak akan menerapkan migrasi otomatis.

## 4. Backup tambahan dan jalankan migrasi

Sebelum produksi, buat backup project Supabase dari mekanisme yang didukung plan kamu. Lalu jalankan:

```bash
bash migrate-katakecil-termux.sh --apply
```

Skrip akan:

1. Memeriksa koneksi dan status skema.
2. Membuat snapshot `id`, `book_id`, `episode_number`, `release_at`, dan `is_enabled` semua episode lama.
3. Membuat arsip `pg_dump` untuk tabel novel terkait, di `~/katakecil-backups/<timestamp>/`.
4. Memverifikasi arsip bisa dibaca, dan **meminta ketikan `MIGRASI`**.
5. Menjalankan berkas migrasi yang belum terpasang V2→V3→V4 dalam **satu transaksi** SQL.
6. Membandingkan snapshot jadwal episode *sebelum dan sesudah* secara byte-for-byte. Tidak mengubah tanggal rilis lama.

Jika backup gagal atau ada ketidaksesuaian kondisi tabel/policy, migrasi tidak dilanjutkan. Jika SQL gagal, transaksi migrasi dibatalkan. Jangan mengedit episode bersamaan dengan proses migrasi untuk menghindari hasil snapshot yang berubah karena pengguna lain.

> Backup memuat naskah pribadi. Folder backup diberi permission ketat. Jangan mengunggahnya ke GitHub, membagikan, atau menaruh password/connection string di `.env` frontend.

## 5. Sesudah migrasi

- Tambahkan akun penulis **Auth user UUID** ke tabel `qr_author_members` melalui SQL Editor Supabase (dari dashboard milikmu):

```sql
insert into public.qr_author_members(user_id)
values ('UUID_AKUN_AUTH_KAMU')
on conflict (user_id) do nothing;
```

- Jalankan pemeriksaan `supabase/tests/v4_security_review.sql`, periksa Supabase Security Advisor, dan uji Studio dengan EPUB dummy sebagai draft.
- Pastikan kalender novel pertama dan reader publik tetap sesuai sebelum deploy production.

**Catatan:** Arsip `pg_dump` yang dibuat adalah backup tabel KataKecil terpilih, bukan backup seluruh sistem Supabase termasuk Auth, Storage, dan project configuration. Simpan juga backup native Supabase yang tersedia. Arsip ini sebaiknya diuji pemulihannya ke project pengujian terlebih dahulu.
