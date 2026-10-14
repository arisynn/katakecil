# Pemeriksaan Supabase — 14 Oktober 2026

Plugin Supabase terhubung. Proyek KataKecil diidentifikasi melalui keberadaan tabel `qr_books`, `qr_episodes`, dan `qr_author_members`: **supabase-champagne-umbrella** (`wlckxrricnyiltdfmvdb`, PostgreSQL 17.11). Pemeriksaan hanya membaca katalog skema, grants, policy, metadata migrasi, advisor, dan sumber Edge Function. Tidak mengambil isi naskah atau mengubah data. Daftar branch kosong; belum tersedia lingkungan staging terpisah dalam proyek ini.

## Temuan dan tindakan

| Temuan yang diamati | Dampak | Perbaikan dalam paket / tindak lanjut |
|---|---|---|
| `anon` dan `authenticated` memiliki SELECT pada `qr_episodes.content_md` | RLS membatasi baris publik, tetapi bab yang sudah terbit bisa dibaca lewat REST langsung, melewati budget/rate limit Edge. Ini bukan bukti draft privat terbuka | `supabase/REVIEW_ONLY_v72_reader_access.sql` mencabut SELECT tabel dan grant kolom body, lalu memberi SELECT metadata termasuk `is_finale`. Penulis mengambil body melalui RPC yang memeriksa keanggotaan |
| Policy publik buku/episode belum menyertakan `deleted_at IS NULL` | Publikasi yang berada di Sampah masih berpotensi lolos melalui jalur yang tidak memfilter sendiri | Patch akses yang sama menambah pemeriksaan Sampah pada buku dan episode. Policy penulis tetap mempertahankan akses pemulihan |
| `secure-episode` versi 1 yang terpasang belum memfilter Sampah | Endpoint menggunakan kredensial server, sehingga filter RLS saja tidak cukup | Sumber `secure-episode` dan `secure-reader` dalam paket sudah memfilter buku/episode terhapus; perlu deploy ulang setelah staging |
| RPC V7.2, receipt, dan bucket `story-covers-private` belum terpasang | Frontend V7.2 belum bisa dipasang sendiri | Migrasi `20261014085124_v72_online_pwa_smart_import.sql` disertakan; jalankan dahulu pada staging |
| RPC author lama tidak dapat dieksekusi anon; fungsi author/import yang diperiksa memiliki pemeriksaan `auth.uid()` dan keanggotaan | Jalur penulis mempunyai penjagaan server | Tetap uji akun biasa vs penulis dengan sesi sebenarnya di staging. Grant `authenticated` sendiri bukan bukti otorisasi cukup |
| Riwayat migrasi terdaftar hanya lima entri, sedangkan skema memuat fitur tambahan | Sebagian SQL tampaknya dipasang di luar migration history | Cocokkan skema, jangan menjalankan ulang seluruh migrasi lama hanya karena tidak tercatat |

## Patch akses bertahap

`REVIEW_ONLY_v72_reader_access.sql` sengaja berada di luar folder migrasi otomatis. Urutan: backup → migrasi V7.2 → Edge staging → frontend preview dan smoke test penulis/reader → patch akses di staging → uji ulang → rollout terkontrol. Berkas ini menggantikan kebutuhan menjalankan `REVIEW_ONLY_stage2_metadata_grants.sql` lama untuk rilis V7.2; **jangan menjalankan keduanya tanpa menilai urutannya**. Patch V7.2 mempertahankan metadata finale dan memeriksa grants efektif setelah pencabutan.

Patch gagal dan rollback jika RPC penulis belum tersedia, nama policy berbeda, atau akses body tetap diwariskan oleh role lain. Perubahan hanya policy/grant, tidak menghapus atau menulis ulang karya. Pemanggil direct `SELECT *` pada `qr_episodes` akan ditolak; frontend baru memakai kolom metadata eksplisit dan RPC penulis. Muat ulang tab lama setelah rollout.

Pengujian PostgreSQL lokal lulus untuk penolakan body anon/authenticated, metadata publik, penyembunyian episode/buku di Sampah, update body penulis dengan RETURNING metadata, dan RPC body penulis. Ini belum menggantikan pengujian PostgREST, Auth, Storage, dan dua koneksi bersamaan di Supabase staging.

Dokumentasi rujukan: [Column Level Security](https://supabase.com/docs/guides/database/postgres/column-level-security). Privilege tabel dan kolom perlu diperiksa bersama; RLS mengatur baris, bukan pemilihan kolom.

## Advisor di luar perubahan inti

Advisor proyek juga melaporkan RLS nonaktif pada tabel `players`, `scores`, dan `hint_transactions`. Tabel tersebut bukan bagian sumber KataKecil yang diberikan, sehingga tidak diubah tanpa memahami aplikasi pemiliknya. Tindak lanjuti [RLS disabled in public](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public).

Peringatan `authenticated security definer function executable` perlu ditinjau per fungsi terhadap otorisasi internal, search path, dan kebutuhan bypass RLS, bukan dicabut massal karena akan memutus fitur penulis. Lihat [panduan advisor](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable). Advisor juga menyebut leaked-password protection belum aktif; tinjau [password security](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection) pada konfigurasi Auth.

**Status akhir: tidak ada migrasi/deployment/perubahan produksi dari sesi ini.** Penguatan akses yang disertakan belum mengubah izin live. PWA tidak menjanjikan pencegahan penyalinan mutlak; konten yang sudah ditampilkan tetap berada di perangkat pembaca selama digunakan. Tidak disediakan fitur membaca/menyimpan naskah offline.

## Pemeriksaan kecocokan lanjutan

Signature `qr_import_manuscript_v5` live sesuai delapan parameter migrasi V7.2, termasuk nama argumen. Kolom yang dipakai pada `qr_import_batches` dan `qr_book_sections` tersedia. Policy Storage lama untuk unggah/ubah/hapus sampul secara eksplisit membatasi `bucket_id = story-covers`; tidak ada grant SELECT lintas bucket pada daftar policy yang diamati. Uji RPC author dalam transaksi read-only tanpa identitas ditolak sesuai guard; tidak ada naskah dikembalikan. Ini pemeriksaan kecocokan awal, bukan penerapan migrasi live.
