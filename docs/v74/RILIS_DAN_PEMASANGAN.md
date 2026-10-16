# V7.4 RC1 — arsitektur, QA, dan rollout

## Kontrak penyimpanan

`qr_episodes.editor_version` adalah nomor monoton yang ditentukan trigger, bukan nilai yang dipercaya dari client. Setiap UPDATE menaikkannya, termasuk perubahan jadwal, Sampah, dan edit client lama. Penyimpanan editor V7.4 menggunakan RPC `qr_episode_save_v74` dengan UUID, nomor versi yang dilihat editor, judul, arc, isi, dan alasan operasi. Server mengunci bab, memeriksa keanggotaan `qr_author_members`, menolak bab/buku di Sampah, lalu memeriksa versi. Kode SQLSTATE `40001` menjadi konflik yang memerlukan tinjauan.

Penyimpanan hanya mengubah judul, arc, dan isi. Publikasi tetap tindakan terpisah dengan filter nomor versi dan konfirmasi. Respons simpan dan receipt berisi metadata, tanpa salinan body. UUID sama dengan payload berbeda ditolak. Receipt yang sama dikembalikan jika respons commit hilang. Paling banyak 200 receipt terakhir per bab disimpan; retry yang sudah melewati batas itu tidak dijamin mendapat receipt, tetapi pemeriksaan versi tetap mencegah penimpaan versi baru.

`kk_private.episode_revisions` menyimpan teks lama sebelum perubahan; snapshot otomatis dibatasi sekitar lima menit. Checkpoint dapat dibuat pada isi yang sama. Penyelesaian konflik dan pemulihan yang mengubah isi memaksa snapshot versi server sebelumnya. Penambahan snapshot, pembatasan ke 30 revisi, perubahan isi, dan receipt berada dalam transaksi yang sama. Tidak ada job TTL, backfill semua karya, atau penghapusan otomatis naskah utama. Pemindahan ke Sampah mempertahankan riwayat; hard delete bab oleh operator mengikuti foreign key cascade.

Tabel riwayat dan receipt berada di schema privat, RLS aktif, dan seluruh akses tabel langsung untuk anon/authenticated dicabut. Wrapper RPC publik menggunakan SECURITY INVOKER, grant eksplisit hanya ke authenticated. Implementasi internal dengan SECURITY DEFINER memeriksa `auth.uid()` dan membership pada setiap jalur baca/simpan, memakai search_path kosong dan nama tabel lengkap. Helper snapshot/trigger tidak diberi EXECUTE kepada client. Seperti Studio sebelumnya, penulis yang ada pada daftar anggota dapat mengelola karya Studio; ini belum mengubahnya menjadi kepemilikan per pengguna.

`qr_episode_revisions_v74` mengambil metadata maksimum 30 baris. `qr_episode_revision_v74` mengambil satu isi, harus cocok dengan bab yang diminta dan bab/buku aktif. RPC memakai `Cache-Control: private, no-store, max-age=0`; client SDK sudah memakai fetch no-store. Tidak menambahkan penyimpanan body di browser. Auth session SDK tetap mengikuti mekanisme yang sudah ada.

`EditorSession` menserialisasi simpan, mempertahankan operasi yang responsnya belum pasti di RAM, dan menghentikan autosave setelah konflik. Dialog tinjauan mengunci editor di belakangnya. Respons pemuatan yang tiba setelah panel ditutup diabaikan. Penyegaran server mempertahankan hasil gabungan manual dan membatalkan centang tinjauan. Diff baris memakai LCS hanya untuk bagian kecil; perubahan besar memakai blok dan ringkasan dibatasi tanpa mengubah isi.

## Hasil pengujian lokal

- TypeScript, struktur impor/aset, dan 11 suite regresi aktif lulus, termasuk seluruh gate reader/impor/sampul terdahulu.
- PGlite mengeksekusi migrasi nyata dengan role anon/authenticated, grant tabel/kolom, RLS dan patch pengamanan body. Riwayat/baca isi privat, laziness metadata, checkpoint, interval snapshot, batas 30, CAS, UUID replay/mismatch, validasi judul/arc/2 MB, jadwal/finale, Sampah, edit client lama, dan versi yang tidak dapat dipalsukan diuji.
- Pengujian sesi memeriksa serialisasi, respons hilang lalu teks baru, retry UUID/payload sama, blok autosave konflik, rebase eksplisit, saran bidang, serta diff besar tanpa alokasi jutaan baris DOM.
- Chromium menjalankan editor nyata dengan request RPC yang diteruskan ke fungsi PostgreSQL lokal: flush sebelum riwayat, body dipilih bertahap, checkpoint/pulih, konflik dua versi lalu konflik kedua saat tinjauan, teks gabungan bertahan ketika server dimuat ulang, retry commit tanpa kenaikan versi kedua, pesan migrasi hilang, Escape, tema Sapphire terang/gelap dan lebar 320/390/768/1440 px.
- Regresi browser reader dan sampul tetap lulus; sentinel teks sintetis tidak ditemukan pada localStorage/sessionStorage dan Cache Storage tetap kosong. Screenshot QA hanya dipakai internal dan tidak disertakan dalam ZIP.
- Build produksi dan audit tema lulus. Tidak ada penambahan dependency runtime. Entry publik tetap sekitar 325 kB sebelum gzip; fitur editor berada di chunk Studio yang dimuat terpisah. Angka build terperinci dapat diperiksa saat menjalankan build.
- Regresi runtime Edge sampul juga dijalankan ulang: entry nyata lulus pemeriksaan Deno 2.9.6, decode PNG, crop/resize, dan encode WebP tanpa jaringan keluar atau native FFI. Fixture sintetis 1600×1600 selesai sekitar 406 ms setelah inisialisasi; ini bukan jaminan performa fungsi produksi.

Batas bukti: pengujian database lokal dan browser terintegrasi bukan pengujian Auth/JWT gateway, Storage, PostgREST produksi, atau transaksi dua koneksi PostgreSQL nyata yang berjalan serentak. Uji CAS menggunakan versi yang dibuat usang dan perubahan dua tab yang disimulasikan dengan RPC SQL. Renderer Edge V7.3 tidak diubah; uji Deno/codec yang disertakan pada rilis sampul tetap tersedia. Tidak mengklaim uji perangkat Android/iOS fisik.

## Status Supabase terhubung

Pemeriksaan read-only pada 15 Oktober 2026 UTC / 16 Oktober WIB untuk proyek KataKecil `wlckxrricnyiltdfmvdb`:

- RPC pengambilan isi penulis V7.2 tersedia.
- Tabel sampul `qr_book_covers` V7.3 belum ada.
- Anon dan authenticated masih memiliki privilege SELECT pada `qr_episodes.content_md`; patch penutupan jalur body REST belum aktif. Ini tidak dengan sendirinya membuktikan draft privat dapat diakses karena RLS masih membatasi baris.
- Development branch kosong. Tidak ada migrasi, deploy, perubahan izin, atau pembacaan isi karya produksi pada pengerjaan V7.4 ini.

Changelog dan dokumentasi Supabase diperiksa kembali. Perubahan grant eksplisit Data API yang dijadwalkan 30 Oktober 2026 sudah diantisipasi: akses RPC/grant metadata dinyatakan eksplisit; tabel revisi tidak diekspos. Referensi: https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically dan https://supabase.com/docs/guides/database/postgres/row-level-security.

## Checklist staging dan rollback

1. Cadangkan database; inventaris versi skema, policy, grants, fungsi, serta client lama. Siapkan lingkungan staging yang sesuai tanpa menyalin karya ke frontend publik.
2. Cocokkan V7.2 terlebih dahulu. Uji body RPC dan secure reader; terapkan patch REVIEW_ONLY hanya setelah seluruh prasyaratnya terpenuhi. Patch dalam paket ini kompatibel dengan pemasangan V7.4 sebelum maupun sesudahnya.
3. Pasang migrasi/fungsi sampul V7.3 jika seluruh paket dipakai. Lihat checklist Auth/Storage/codec pada panduan V7.3.
4. Terapkan migrasi V7.4 yang sudah dibuat dengan Supabase CLI 2.121.0. Jangan menambah `kk_private` ke Exposed schemas. Jalankan Supabase Security/Performance Advisors terhadap skema staging setelah migrasi dan tangani temuannya sebelum rollout.
5. Uji melalui HTTP asli: anon dan pengguna biasa ditolak oleh ketiga RPC; penulis aktif dapat mengambil metadata dan satu body; pengguna yang membership-nya dicabut ditolak. Coba UUID dari bab lain, buku/Sampah, token kedaluwarsa dan sesi logout. Periksa header no-store dan batas respons.
6. Uji dua tab/koneksi serentak: hanya satu CAS yang berhasil; perubahan server baru saat panel terbuka kembali ditolak. Uji koneksi putus sebelum commit dan sesudah commit; retry harus memakai UUID/payload sama, tanpa revisi ganda.
7. Pulihkan bab draft, terjadwal, dan terbit; periksa release_at, is_enabled, nomor, book_id dan is_finale. Buat 31 checkpoint untuk melihat retensi dan pesan UI. Uji judul panjang, isi Unicode 2 MB, dan payload invalid.
8. Periksa bahwa SELECT body REST ditolak tetapi metadata reader, editor, operasi jadwal, secure-episode, dan secure-reader tetap berfungsi. Grant `editor_version` authenticated harus tetap tersedia setelah hardening.
9. Pasang frontend setelah backend lulus; muat ulang tab Studio lama. Jika perlu rollback, kembalikan frontend V7.3 dengan body RPC V7.2 dan patch keamanan yang sudah diuji. Pertahankan kolom, trigger, riwayat, receipt, dan aset V7.3; jangan drop tabel atau menghapus karya untuk rollback.

## Tahap berikutnya

Prioritas berikut dalam rencana yang telah disetujui: perbandingan konflik isi/judul/nomor pada impor, riwayat batch, dan pemulihan impor draft yang belum berubah. Kalender rilis dan konsolidasi CSS tetap di backlog. Tahap itu belum dimasukkan ke V7.4 agar batas pemulihan editor dapat diuji dengan jelas.
