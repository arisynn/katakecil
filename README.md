# KataKecil V4.2 — Secure Reader + Upload Android + Karisyono

**PENTING: Jangan langsung menimpa production dengan seluruh berkas dan menjalankan semua SQL.**
Migrasi V4.2 dibagi menjadi dua tahap untuk menghindari putusnya pembacaan novel yang sedang berjalan. Baca [DEPLOY_V4.2.md](./DEPLOY_V4.2.md) dan jalankan `--check` dahulu.

V4.2 menambahkan:
- Reader publik yang hanya meminta potongan Markdown kecil melalui Supabase Edge Function (bukan seluruh naskah terbit melalui browser).
- Lockdown hak SELECT `content_md` pada tabel `qr_episodes` **setelah** frontend baru siap (migrasi tahap 2).
- Author-only `qr_author_get_episodes` RPC agar Studio dapat membuka seluruh naskah dan membuat backup.
- Studio tidak lagi remount saat navigasi. Verifikasi sesi tidak diulang pada token refresh ketika file picker Android dibuka.
- Input file Android satu event `change`, status file picker dan pesan pemulihan.
- Branding Halo, Karisyono dan Memverifikasi akses Karisyono.
- Anticopy, antiprint, watermark **Karisyono** di reader publik tetap aktif.

Keamanan: chunking dan watermark adalah hambatan scraping, **bukan DRM absolut**. Teks yang sampai ke browser tetap dapat direkam/diambil melalui perangkat atau otomasi. Pengaturan layar putih saat tab tidak aktif hanya berlaku bagi reader, bukan Studio.

Di reader, tampilan halaman, tema, ukuran huruf, swipe dan fullscreen tetap berbasis komponen yang sama. **Perubahan perilaku:** indikator jumlah halaman dihitung untuk *potongan aktif*, dan pencarian teks saat ini hanya pada potongan aktif. Navigasi episode, penanda baca, serta posisi terakhir memakai identitas potongan. Peningkatan pencarian lintas episode dapat dilakukan kemudian dengan API yang membatasi hasil.

Tidak ada naskah atau password disertakan dalam ZIP. Jangan simpan Service Role Key, DATABASE_URL atau READER_RATE_SALT dalam variabel `VITE_*` ataupun GitHub.

## Pengujian

`npm install && npm run test:v2 && npm run test:v3 && npm run test:v4 && npm run test:v42 && npm run lint && npm run build`

Tes sintaks, utilitas impor, simulasi Edge Function dan ukuran chunk sudah dijalankan. **Build produksi penuh, deploy Edge Function, dan uji riil Android belum selesai di lingkungan pembuatan paket**, sehingga preview wajib sebelum production.

---

# KataKecil V4.1.1

**Perbaikan upload Android:** lihat [RELEASE_V4.1.1.md](RELEASE_V4.1.1.md) untuk instruksi dan hasil pengujian. Tidak perlu migrasi Supabase/ENV tambahan.

# KataKecil V4.1 — Smart Manuscript Importer + Mobile Stability + Content Protection

Website publikasi cerita pribadi berbasis React + Vite + Supabase. V4 meneruskan V1–V3 **tanpa merombak mesin Reader** dan tanpa menimpa jadwal novel pertama.

> **Pembaruan V4.1:** perbaikan Studio mobile dan tab Impor, error boundary, serta perlindungan konten dengan watermark **Karisyono**. Lihat [RELEASE_V4.1.md](./RELEASE_V4.1.md) untuk batasan keamanan, panduan deploy, dan hasil pengujian. Tidak ada migrasi database baru.

## Fitur V4

**Studio → Impor** (`/studio/impor`), juga dapat dibuka dari halaman novel:

1. **Baca EPUB 2/3** langsung di browser, termasuk metadata judul, nama penulis, bahasa, sampul yang didukung (JPG/PNG/WebP), OPF/spine, daftar isi NCX (EPUB 2) atau XHTML nav (EPUB 3), heading dan anchor bab.
2. **Pemisahan episode otomatis:** memahami `Episode 1`, `Bab 01`, `Chapter IV`, prolog/epilog, judul di daftar isi, dan banyak bab yang disimpan dalam satu dokumen XHTML. Mengenali label arc dari hierarki daftar isi bila tersedia. Urutan mengikuti **spine**, bukan alfabet nama berkas.
3. **Markdown/TXT** tetap diterima; .txt dengan heading `Bab N`/`Episode N` dibagi otomatis. Untuk Markdown beberapa episode gunakan heading `# Episode N ...` seperti importer lama.
4. **Wizard mobile-first:** lihat judul, metadata, jumlah bab, peringatan deteksi; pilih novel lama atau buat novel privat baru; ganti judul, arc dan nomor; urutkan naik/turun; aktifkan/nonaktifkan; gabungkan dengan berikutnya; pecah di posisi kursor; koreksi teks Markdown.
5. **Simpan semua sebagai DRAFT:** tidak langsung menerbitkan, tidak otomatis menjadwalkan. Cek nomor atau konten yang sudah ada sebelum menyimpan. Server `qr_import_drafts` memasukkan seluruh batch dan metadata audit dalam satu transaksi; jika ada konflik maka seluruh batch dibatalkan.
6. **Riwayat impor** tampil di Database Manager V3 dengan nama berkas, asal novel, jumlah episode, waktu impor—**tidak menyimpan naskah dalam log**.
7. **Sampul opsional:** saat membuat novel dari EPUB, unggah sampul hanya bila secara eksplisit dipilih. Sampul yang diunggah berada di bucket **publik**, sekalipun novel tersebut privat.

## Persyaratan dan cara menjalankan

Node.js >=20, npm, proyek Supabase yang sama dengan novel lama.

```sh
npm install
cp .env.example .env.local
# Isi URL project Supabase dan publishable key
npm run dev
npm run lint
npm run test:v2
npm run test:v3
npm run test:v4
npm run build
```

`.env.local` (hanya nilai PUBLIK untuk frontend):

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_REPLACE_ME

# Opsional fallback reader lama
VITE_BOOK_ID=novel-pertama
VITE_BOOK_TITLE=Novel Pertama
```

**Tidak perlu API key AI baru.** Analisis EPUB berbasis metadata/heading, bukan AI online. Jangan tempatkan `service_role`, secret key, kredensial SQL, database password, atau naskah pribadi ke `VITE_*` maupun source publik.

**Dependensi EPUB:** `jszip@3.10.1`. Proyek V4.1 menggunakan npm. Jalankan `npm install` dan commit `package-lock.json` baru agar dependensi produksi konsisten; lock Bun lama sengaja dikeluarkan karena isinya tidak sinkron dengan `package.json`.

## Migrasi Supabase tanpa merusak jadwal lama

**Jangan deploy migrasi secara otomatis ke database aktif tanpa backup dan pemeriksaan.** ZIP ini hanya berisi source dan SQL; **tidak ada database live yang diubah**.

1. Jalankan backup database tepercaya (Supabase backup atau tool pengelolaan yang dipercaya); simpan ekspor dari `supabase/tests/v4_readonly_preflight.sql`, termasuk `book_id,episode_number,release_at,is_enabled` sebelum migrasi.
2. Untuk database novel lama yang sudah memiliki `qr_episodes`, jalankan secara berurutan **V2** `20261012010000_library_studio_v2.sql`, lalu **V3** `20261012020000_publishing_management_v3.sql`, hanya jika belum pernah dijalankan. **Jangan jalankan ulang migrasi V1 dengan reset/drop data**. Aktifkan akun penulis sesuai instruksi V3.
3. Jalankan **V4** `supabase/migrations/20261012030000_smart_manuscript_import_v4.sql` melalui jalur migrasi terkontrol. Ini **hanya membuat** `qr_import_batches` dan RPC `qr_import_drafts`; **tidak melakukan UPDATE/DELETE pada episode/jadwal lama**.
4. Tinjau `supabase/tests/v4_security_review.sql`, jalankan pemeriksaan RLS sebelumnya dan Supabase Security Advisor. Pastikan tidak ada akses impor untuk anon, dan login hanya penulis yang diotorisasi.
5. Bandingkan status, nomor dan tanggal `release_at` semua episode lama dengan snapshot awal. Coba impor EPUB dummy ke novel privat baru sebagai **draft**, lalu cek kalender V3 tetap sama.

Setelah V4, aksi impor memilih novel yang ada atau membuat novel privat baru; semua episode baru disimpan dengan `is_enabled=false` dan `release_at=NULL`. Aturan pola jadwal V3 tidak akan dijalankan tanpa tindakan penulis.

## Batasan dan perlindungan

- EPUB harus berupa EPUB ZIP biasa **tanpa DRM/enkripsi**. EPUB berisi halaman gambar/fixed-layout tanpa teks, isi tulisan berupa gambar, atau EPUB yang rusak tidak dapat dikonversi dengan andal.
- HTML/XHTML EPUB diproses sebagai DOM inert (bukan disuntikkan ke halaman); `script`, `iframe`, elemen form, SVG dan media tidak disalin. Deklarasi entitas XML diblokir. Diterapkan batas file terkompresi (18 MB), jumlah entri (800), ukuran total dekompresi yang diumumkan (70 MB) serta panjang teks (12 juta karakter), namun tetap hindari EPUB tidak tepercaya yang sangat besar di perangkat lemah.
- *Inline* bold/italic, paragraf, heading, pemisah adegan, daftar sederhana diubah ke Markdown. **Ilustrasi di tengah bab tidak ikut diimpor**; importer menampilkan peringatan dan pengarang perlu menangani gambar sendiri setelah impor. Tidak semua tata letak cetak dapat direkonstruksi sempurna.
- Pembagian otomatis adalah **usulan**, bukan jaminan. EPUB dengan daftar isi/heading tidak baku perlu koreksi manusia. Bagian pendahuluan tertentu otomatis tidak dipilih; periksa manual.
- Pembacaan file dan preview berlangsung **di browser Studio**, belum mengunggah naskah ke pihak ketiga. Saat konfirmasi, naskah baru dikirim ke Supabase milikmu dan disimpan sebagai draft. Simpan backup naskah asli di luar situs.
- Importer menerima 1 berkas per sesi impor; batch maksimal **120 episode terpilih**. Jika >120, pecah naskah per arc dan impor bertahap. Jika ada bentrok nomor atau konten dengan episode lama, impor ditolak (bukan menimpa).
- Satu-satunya perubahan V4 ke Reader adalah **tidak ada**. Pengaturan tampilan, pagination, gesture, bookmark dan pencarian masih memakai komponen V3/V2 yang sama.

## Pengujian saat pengembangan

- Lolos tes utilitas V2/V3 dan V4 (penomoran, deteksi judul, duplikasi, operasi gabung/pisah).
- Lolos uji EPUB sintetis di Chromium: metadata, EPUB 2 NCX, EPUB 3 nav, urutan spine, beberapa episode dalam satu XHTML, anchor dan penolakan entitas XML.
- Sintaks semua file TS/TSX diperiksa melalui `typescript.transpileModule` tanpa error.
- **Belum dapat menjalankan npm install, tsc build penuh, maupun pengujian integrasi dengan Supabase aktif**, karena registry npm tidak dapat diakses (`EAI_AGAIN`). Jalankan langkah verifikasi di mesin dev/CI sebelum produksi.

## Riwayat versi

- V1: Quiet Reader dan jadwal satu novel.
- V2: perpustakaan multi-novel, halaman detail, Studio mobile-first.
- V3: kalender rilis, pengelolaan database, perencanaan jadwal massal tanpa overwrite.
- V4: EPUB/Markdown smart importer dan riwayat impor privat.

## Migrasi lewat Termux

Untuk Android/Termux tersedia `migrate-katakecil-termux.sh` dan panduan lengkap di `TERMUX_MIGRATION.md`. Jalankan `--check` dahulu, baru `--apply` setelah backup. Skrip tidak memasukkan password atau service role ke source/frontend.

## Versi V4.3 — Episode Reader dan EPUB

Lihat [`RELEASE_V4.3.md`](RELEASE_V4.3.md) untuk **urutan deploy aman**: migrasi nomor Episode 0 (tanpa mengubah episode lama), deploy fungsi `secure-episode`, uji Vercel Preview, kemudian Production. Reader mengunduh satu episode terbit dan memaginasi tanpa request antarhalaman; parser EPUB mengecualikan frontmatter yang dikenali dengan review manual. Hindari Stage 2 sampai sistem baru diuji menyeluruh.
