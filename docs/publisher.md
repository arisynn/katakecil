# Publisher dan ekspor file

## Tampilan 1.2.4

Panel login, pemulihan kata sandi, daftar buku dan editor memakai kelas permukaan kaca bersama; kebeningan, blur, tema dan ambient mengikuti Pengaturan → Liquid Glass. Kolom input dan kontrol kecil tidak menambahkan blur kedua. Judul bagian jadwal/bab, tombol responsif dan respons tekan mengikuti gaya aplikasi; preferensi yang disinkronkan tidak mengganti form atau menghapus teks yang sedang diisi.

Toast aplikasi, termasuk “Backup saved”, mengikuti tema dan ambient dengan backing 70–100% untuk keterbacaan. Pengaturan blur tetap dipakai; timer dan role status/aria-live yang sudah ada dipertahankan. Fallback tanpa backdrop blur memakai latar solid.

[Rilis 1.2.4 dan daftar uji HP](releases/v1.2.4.md) · [Bukti pemeriksaan](generated/1.2.4-stable-validation.json). Uji UI memakai auth dan API fixture lokal; tidak mengubah akun, buku atau jadwal produksi. Riwayat implementasi fungsional berikut dipertahankan.

## Alur publikasi

Buka Settings → Advanced → Publisher. Akun Auth belum dibuat oleh agent: pemilik membuat akun/password melalui Create account, memverifikasi email, lalu masuk. Email pemilik yang disetujui disimpan sebagai hash di server; hanya akun tersebut dengan email terverifikasi dapat memperoleh membership publisher otomatis. Auth mailer confirmation aktif; URL callback sudah diperbarui pengguna dan diverifikasi mengarah ke app. Publisher key lama tetap didukung dan tidak disimpan ke localStorage.

Unggah EPUB untuk buku baru. Pilih Completed untuk menerbitkan seluruh isi sekaligus, atau Ongoing untuk menentukan berapa episode baru yang terbit sekarang dan jarak rilis berikutnya. EPUB satu file yang berisi beberapa bab dipecah agar bab dapat dijadwalkan terpisah. Struktur arc, penekanan teks, gambar tertanam dan cover diproses menggunakan parser EPUB/JSZip yang ada. File asli juga diarsipkan private.

Untuk memperbarui buku, pilih Update lalu impor TXT, MD/Markdown, HTML/XHTML atau EPUB. Judul/nomor bab mencocokkan target; kecocokan ambigu harus dipilih pengguna. ID dan tanggal rilis lama dipertahankan. Jika masih ada bab terjadwal, tambahan baru secara default dimulai setelah jadwal terakhir. Pratinjau menunjukkan tambah/ganti dan tanggal rilis; perubahan hanya disimpan setelah Apply changes. Konflik versi dan request ulang memakai RPC atomic/idempotent kk_terminal_save yang sudah tersedia. Bab tidak dihapus karena tidak tercantum pada file pembaruan.

Download EPUB pada Publisher mencakup seluruh naskah, termasuk bab yang belum terbit, dan memerlukan akses publisher. Server merakit serta mengarsipkan EPUB private setelah publikasi. Endpoint Reader biasa tetap membaca section terbit melalui RLS dan tidak menerima sesi publisher.

Web Save backup/Export notes kini memakai unduhan Blob, bukan Web Share sehingga tidak memerlukan izin berbagi. Export anotasi reader juga menangani kegagalan penyimpanan. Android memakai ACTION_CREATE_DOCUMENT dengan grant URI write/read dan mode tulis yang didukung provider; saveFile EPUB ditambahkan. Build Preview3 memakai versionCode3 dan kunci Karisyono yang sama. Tes HP fisik tetap diperlukan.

Pemeriksaan yang dijalankan: build, check, typecheck, 10 tes Node terkait publisher/struktur EPUB/ekspor, 3 regresi judul/arc/catalog, 3 tes Deno akses/sanitasi EPUB, Deno check fungsi Publisher, npm audit produksi (0 temuan), serta Chromium dengan publisher fixture yang diintersep lokal. Chromium menguji import tamat, update ongoing sambil mempertahankan ID/jadwal bab lama, dan unduhan EPUB/backup/notes ke file nyata. Fixture tidak menerbitkan data ke Supabase. Android release build, unit tests, lint dan verifikasi tanda tangan juga dijalankan; tidak mengklaim QA perangkat nyata.

Tidak ada schema/migrasi/RLS baru atau perubahan isi/jadwal buku produksi oleh pengujian fitur ini. kk_author_members hanya ditambah untuk pemilik terverifikasi ketika mereka masuk. CORS dibatasi origin app/native; server memvalidasi JWT dengan getUser serta membership, bukan user_metadata. Token terminal lama tetap diverifikasi melalui hash. Sesi/password/key tidak masuk ke backup. SDK Supabase/Marked di-load hanya ketika diperlukan Publisher.

Rollback: kembalikan frontend ke 8d57618 dan deploy ulang fungsi Publisher versi3 dari backup operasional. Ini menonaktifkan UI publisher browser baru tanpa menghapus buku yang sudah diterbitkan. Jangan rollback data buku atau jadwal secara massal. APK versionCode tidak boleh diturunkan untuk pemasangan ulang; distribusikan build koreksi dengan code lebih tinggi bila diperlukan.
