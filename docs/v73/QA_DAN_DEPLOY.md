# QA, deployment, dan rollback V7.3 RC1

## Hasil verifikasi lokal

| Pemeriksaan | Hasil dan batas bukti |
|---|---|
| TypeScript dan struktur | Lulus; 121 berkas sumber, 329 referensi lokal, tidak ada target hilang |
| Build produksi | Lulus; pemeriksa sumber menolak impor naskah privat. WASM pemrosesan server tidak masuk bundle browser |
| Regresi aktif | 10 suite lulus, mencakup seluruh gate V7.2 serta suite sampul baru |
| SQL PostgreSQL lokal | PGlite mengeksekusi migrasi V7.2 + V7.3 pada fixture: grant/RLS, izin penulis, UUID replay, payload berbeda, input Storage immutable, lease, konflik versi, receipt, dan tombstone cleanup |
| Renderer publik | 2:3, 9:16, 3:4, 1:1, lanskap, 1:5, 5:1; contain/crop, tanpa upscale, header dan dimensi WebP cocok |
| Impor kandidat | Beberapa sampul diberi urutan rekomendasi, gambar rusak dilewati dengan alasan, dan gambar tidak menjadi bab |
| Browser V7.3 | Chromium headless: 320/390/768/1440 px, tema terang/gelap, judul sejajar, tanpa overflow katalog, dialog detail dan Escape, URL gagal lalu pulih, crop/putar/reset/keyboard, berkas invalid, delapan orientasi EXIF, pilihan A lalu B, simpan privat, respons publikasi hilang, pemulihan versi, serta retry sampul tanpa mengimpor bab ulang |
| Browser V7.2 | Reader, preview tanpa banner, daftar isi, editor/konflik, panah kembali, ikon Sapphire, ZIP worker, retry commit, PWA online-only dan tidak menyimpan body tetap lulus |
| Runtime Edge lokal | Entry point fungsi nyata lulus typecheck dan berjalan pada Deno 2.9.6. Jaringan keluar dan native FFI tidak diberi izin. PNG 1600×1600 diproses menjadi tiga kartu + detail WebP; satu pengukuran lokal sekitar 354 ms setelah inisialisasi codec |
| Visual | Screenshot sintetis diperiksa untuk katalog terang/gelap, preview sampul, dan pengelola riwayat. Hasil QA tidak disertakan sebagai berkas pengguna |
| Kebocoran penyimpanan | Tes browser tidak menemukan naskah sintetis atau master cover dalam localStorage/sessionStorage. Auth session memakai penyimpanan SDK yang sudah ada |

Bundle terukur: JS awal sekitar 324,98 kB / gzip 99,65 kB; Studio sekitar 141,41 kB / gzip 38,30 kB; worker sampul sekitar 4,98 kB; CSS sekitar 334,89 kB / gzip 60,51 kB. Ini ukuran hasil build, bukan jaminan waktu muat pada perangkat nyata.

Fixture jadwal CLI yang menggunakan tanggal 15 Oktober 2026 kini mengakui bahwa tanggal itu dapat sudah berlalu melalui flag konfirmasi pada tes saja. Tes terpisah tetap membuktikan guard menolak rilis masa lalu tanpa konfirmasi. Perilaku produksi CLI tidak dilonggarkan.

## Pemeriksaan Supabase live, 15 Oktober 2026

Pemeriksaan hanya membaca metadata proyek KataKecil `wlckxrricnyiltdfmvdb`; tidak mengambil naskah dan tidak menulis data.

- RPC status V7.2 tersedia dan bucket V7.2 sudah ada pada pemeriksaan awal.
- Tabel `qr_cover_assets` V7.3 belum ada pada pemeriksaan akhir.
- Daftar development branch kosong; belum ada staging terpisah yang tersedia melalui koneksi ini.
- Role anon dan authenticated masih memiliki privilege SELECT pada `qr_episodes.content_md`. Ini menunjukkan patch pembatasan akses REST V7.2 belum aktif. RLS baris tetap harus diperiksa; privilege tersebut sendiri tidak membuktikan draft privat terbuka.

**Tidak ada migrasi V7.3, deployment fungsi/frontend, penghapusan objek, atau perubahan izin produksi dari sesi pengerjaan ini.** Hasil lokal belum membuktikan Auth/Storage/PostgREST produksi atau kebijakan JWT gateway di proyek nyata.

## Checklist staging sebelum rollout

1. Cadangkan database dan inventaris Storage. Cocokkan skema dengan V7.2; jangan mengulang migrasi lama hanya berdasarkan migration history.
2. Terapkan `20261015080323_v73_smart_covers.sql`, lalu jalankan pemeriksaan grants dan RLS/advisor di staging. Tabel baru memakai grant eksplisit, sesuai perubahan kebijakan Data API Supabase.
3. Deploy hanya fungsi sampul yang baru. Contoh CLI 2.121.0 berikut telah dicocokkan dengan bantuan CLI; ganti `REF_STAGING` dengan ref lingkungan uji:

```sh
npx supabase@2.121.0 functions deploy cover-assets --project-ref REF_STAGING --use-api
```

Konfigurasi `verify_jwt = true` dipertahankan. WASM disematkan pada source sehingga tidak memerlukan file statis eksternal atau Docker untuk opsi deploy API ini. Jangan gunakan `--prune` atau mematikan verifikasi JWT untuk fungsi ini.

4. Pasang frontend preview dengan publishable key staging. Uji anon, akun biasa, dan penulis: unduh master privat harus ditolak bagi bukan penulis; client tidak boleh menulis manifest/bucket publik atau menimpa input immutable.
5. Uji HTTP sesungguhnya: token kedaluwarsa/logout, upload batal, koneksi putus setelah unggah, setelah private prepare, dan setelah commit publikasi. Retry tidak membuat versi/request kedua. Cek header dan URL turunan yang disimpan.
6. Uji dua koneksi/tab bersamaan. Lease dan versi buku harus menahan proses/penimpaan yang bertabrakan; tes PGlite lokal belum merupakan uji concurrency jaringan multi-client.
7. Uji foto HP besar dan gambar transparan pada Android Chrome serta Safari/iOS nyata. Verifikasi orientasi/mirroring, warna, sentuhan, fallback canvas, memori, waktu CPU fungsi, dan batas ukuran. Viewport Chromium bukan pengganti perangkat tersebut.
8. Pastikan manuskrip tetap diimpor tepat satu kali saat sampul gagal. Coba simpan sampul terpisah; publikasi novel tidak otomatis memublikasikan sampul privat.
9. Uji `cover-cleanup.mjs` dalam dry run dengan data sintetis dahulu. Jika `--apply` diuji, hanya objek expired yang sudah diklaim dan belum commit boleh hilang. Aset siap/aktif dan receipt commit harus tetap ada. Alat ini tidak dijalankan pada live dalam sesi ini.
10. Selesaikan penguatan akses REST naskah V7.2 dengan patch REVIEW_ONLY sesuai panduan sebelumnya, kemudian uji editor dan reader lagi. Jangan menganggap pemasangan fitur sampul menutup jalur lama itu.
11. Periksa reader/PWA dan jalur sampul lama, lalu rollout backend → frontend dan muat ulang tab Studio lama.

## Rollback

Kembalikan frontend ke V7.2 bila perlu. `cover_url` tetap menunjuk turunan publik terakhir sehingga sampul tetap terlihat oleh versi lama. Pertahankan tabel, bucket, master, dan receipt V7.3; jangan rollback dengan drop tabel atau penghapusan objek karya. Nonaktifkan tindakan sampul baru bila backend sedang bermasalah, lalu pulihkan fungsi dari source yang sudah diperiksa.

Perbaikan akses naskah memiliki urutan tersendiri karena frontend lama yang mengambil body langsung dapat terpengaruh. Lihat `docs/v72/AUDIT_SUPABASE.md`.

## Cakupan berikutnya

Riwayat revisi isi editor, tampilan perbandingan konflik, kalender rilis lanjutan, dan konsolidasi CSS menyeluruh masih berupa saran tahap berikutnya. Rilis ini menyelesaikan fitur sampul beserta integrasinya dan mempertahankan perbaikan reader/PWA terdahulu. Pengenalan teks/AI dan konversi HEIC/AVIF belum termasuk.
