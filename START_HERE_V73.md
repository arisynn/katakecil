# Mulai dari sini — KataKecil V7.3 RC1

Pembaruan ini menambahkan sampul cerdas di atas V7.2. Katalog tetap rapi dalam bingkai 2:3; gambar dapat ditampilkan utuh atau memakai potongan yang dipilih penulis. Halaman detail memperlihatkan gambar utuh.

## Yang tersedia

- Pemeriksaan JPG/PNG/WebP sebelum decode: 15 MiB, 20 megapiksel, sisi maksimum 8.192 px; gambar animasi ditolak.
- Orientasi dari HP dinormalisasi; putar manual, geser, zoom, reset, serta preview katalog/detail/Studio.
- Ukuran publik WebP dibuat di server; master asli tetap privat. Tidak bergantung pada paket transformasi gambar berbayar.
- Simpan privat dan terbitkan adalah dua tindakan berbeda. Publikasi versi baru tidak mengubah status/jadwal cerita.
- Riwayat 30 sampul terbaru di pengaturan; versi tersimpan tidak dihapus otomatis. Versi lama yang pernah dipublikasikan dapat digunakan kembali.
- ZIP/EPUB menampilkan beberapa kandidat sampul. Sampul gagal dapat dicoba lagi tanpa mengimpor bab ulang.
- Placeholder netral, pemulihan URL gagal, gambar responsif, dan lihat sampul lebih besar.
- PWA tetap memerlukan internet untuk membaca cerita. Tidak menambahkan penyimpanan naskah offline.

## Urutan pemasangan

Paket ini adalah kandidat rilis untuk diuji pada staging. Kode baru belum dipasang ke layanan produksi dari sesi pengerjaan ini.

1. Simpan cadangan database dan pastikan versi V7.2 yang menjadi dasar sudah berfungsi. Jangan menjalankan ulang seluruh migrasi lama pada database yang riwayat migrasinya tidak lengkap.
2. Pada database V7.2, jalankan **hanya** `supabase/migrations/20261015080323_v73_smart_covers.sql` di staging. Migrasi menambah tabel/RPC dan dua bucket baru; tidak mengubah isi naskah atau menghapus sampul lama. Untuk pemasangan baru, ikuti rantai migrasi dasar sesuai panduan V7.2 dahulu.
3. Deploy fungsi `cover-assets` dengan `verify_jwt = true`, mengikuti `supabase/config.toml`. Fungsi memverifikasi sesi dan keanggotaan penulis lagi di server. Kredensial server disediakan oleh lingkungan Supabase; tidak ada kunci rahasia tambahan yang perlu dimasukkan ke Vite.
4. Pasang frontend preview V7.3. `.env.local` hanya berisi URL proyek dan publishable key seperti `.env.example`.
5. Jalankan smoke test dengan anon, akun biasa, dan penulis. Uji master privat, publikasi, dua tab, retry, serta gambar dari HP. Checklist ada di `docs/v73/QA_DAN_DEPLOY.md`.
6. Periksa kembali penguatan akses naskah V7.2 yang sudah disertakan. Pemeriksaan live terakhir masih mendapati SELECT body melalui REST; patch berada di `supabase/REVIEW_ONLY_v72_reader_access.sql`. Ikuti urutan staging pada `docs/v72/AUDIT_SUPABASE.md` sebelum menerapkannya agar editor lama tidak putus.
7. Setelah staging lulus, rollout backend lalu frontend dan minta penulis memuat ulang tab Studio.

Katalog dan `cover_url` lama tetap didukung saat metadata sampul baru belum ada. Upload baru membutuhkan migrasi dan fungsi V7.3; memasang frontend saja tidak cukup.

## Menjalankan dan memeriksa

Gunakan Node 22.12+ atau Node 24.

```sh
npm ci
npm run check
npm run audit:v7-theme
npm run audit:v7beta
npm run build
npx playwright install chromium --only-shell
npm run test:browser
npm run test:edge
```

`test:edge` menggunakan Deno 2.9.6 melalui npm, menguji entry point nyata dengan jaringan keluar dan native FFI tidak diizinkan. Deno untuk pengujian tidak harus dipasang global. Pengunduhan runtime pertama membutuhkan internet. Uji ini melengkapi, bukan menggantikan, Supabase staging.

Baca [panduan penulis](docs/v73/PANDUAN_SAMPUL.md), [arsitektur sampul](docs/v73/ARSITEKTUR_SAMPUL.md), dan [QA/deploy](docs/v73/QA_DAN_DEPLOY.md). Saran update berikutnya tetap tercatat dalam [rencana yang disetujui](docs/v73/RENCANA_DISETUJUI.md).
