# QA, deployment, dan rollback — diperbarui 15 Oktober 2026

## Lulus pada lingkungan lokal

| Pemeriksaan | Bukti |
|---|---|
| TypeScript | `npm run lint` lulus |
| Struktur | 113 source files, 297 referensi lokal, tidak ada target hilang |
| Build produksi | `npm run build` lulus; pemeriksa bundle tidak menemukan impor naskah privat |
| Regresi aktif | 9 suite pada `npm run test:current` lulus |
| Parser | Pembuka tidak hilang, episode 0/Romawi/Chapter/nama file, dua arc, fenced heading, review, penomoran, gabung/pisah |
| ZIP | Klasifikasi, traversal, duplicate case, symlink, encryption, ukuran deklarasi berlebih, CRC rusak |
| PostgreSQL lokal | PGlite mengeksekusi migrasi V7.2 pada fixture schema: replay, mismatch, rollback, draft defaults, metadata tanpa body, Sampah, penulis/nonpenulis/anon, bucket privat/RLS; patch akses menolak body langsung sambil mempertahankan edit/RPC penulis |
| Edge functions | Mock runtime mempertahankan released-only, buku privat, jadwal masa depan, episode 0 pada endpoint baru, rate limit, validasi request, no-store |
| Detail cerita dan ikon | Panah kembali terlihat/berfungsi pada 320/390/1440 px, tema terang/gelap; aset SVG tersedia, ikon biru dan CTA kontras |
| Editor browser | Snapshot judul/arc/isi terbaru; penyimpanan sebelum navigasi; konflik menahan navigasi dan menjaga teks lokal serta isi server; ikon retry terlihat |
| Preview tanpa banner | Tidak ada overlay “Pratinjau penulis”; panah pada kontrol reader kembali ke editor; isi tidak disimpan ke browser storage |
| Chromium headless | Preview, TOC 320/390/768/1440 px, navigasi tab dengan keyboard, kegagalan bab berikut + retry target, purge offline + reload online |
| Import browser | Worker ZIP, exclude README/unsupported, respons commit hilang + retry memakai UUID/payload identik, isi tidak masuk localStorage/sessionStorage |
| EPUB browser | DOM parsing, prefix terjaga, perpindahan arc |
| Guard browser | Tolak/terima navigasi aplikasi dan tombol Back |
| PWA browser | Dialog pemasangan fallback, worker mengembalikan halaman generik saat origin tidak dapat diakses, Cache Storage tetap kosong |
| Visual | Screenshot sintetis diperiksa untuk preview/TOC/import/install; screenshot QA baru tidak dimasukkan sebagai deliverable |

Browser integration memakai endpoint Supabase palsu dan teks sintetis, bukan service produksi. Pengujian SQL memakai PostgreSQL WASM dengan fixture schema; bukan Supabase Auth/Storage/PostgREST sungguhan. Uji worker cold start mensimulasikan origin terputus (server lokal dihentikan), karena emulasi offline DevTools saja tidak selalu memutus fetch worker secara konsisten.

Build sebelum perubahan: JS awal 408.08 kB / gzip 124.08 kB; CSS 326.28 kB / gzip 58.80 kB. Build V7.2 sekitar JS awal sekitar 323 kB / gzip 99 kB; Studio sekitar 121 kB, EPUB sekitar 109.28 kB dimuat terpisah; worker sekitar 108.15 kB. CSS sekitar 331 kB / gzip 60 kB. Angka bundling bisa bergeser sedikit setelah perubahan presentasi akhir; ini bukan pengukuran waktu muat perangkat nyata.

## Suite historis

`test:current` sekarang menjalankan regresi aktif, termasuk test perilaku baru. Rantai lama dipertahankan sebagai `test:historical`, dan berkas `test-v*` tetap tersedia. Banyak test historis memeriksa hash reader yang dibekukan, string lokasi implementasi, versi persis 7.1, atau perilaku yang sengaja diganti (misalnya prolog tanpa nomor dan retry membuat ID baru). Sebagian harness lama juga menggabungkan modul tanpa mendukung import baru. Rantai historis **tidak dinyatakan lulus V7.2**. Hash lama tidak diganti secara mekanis. Kontrak baru diuji lewat parser/SQL/browser; lihat `scripts/test-current.mjs` untuk daftar suite yang benar-benar menjadi gate.

## Wajib dilakukan di staging

1. Terapkan migration chain yang sesuai versi database. Periksa RLS/GRANT efektif, lalu jalankan patch V7.2 `REVIEW_ONLY_v72_reader_access.sql` sesuai `AUDIT_SUPABASE.md` setelah smoke test penulis/reader. Jangan menjalankan berkas REVIEW_ONLY tanpa menilai keadaan database.
2. Verifikasi akses langsung RPC/body sebagai anon, akun biasa, penulis; uji buku privat, future release dan Sampah. Jangan hanya menyembunyikan UI.
3. Uji dua koneksi PostgreSQL bersamaan terhadap UUID sama dan operasi berbeda yang menggunakan nomor sama. PGlite lokal membuktikan replay/rollback, bukan beban concurrency multi-client Supabase.
4. Uji retry setelah commit benar-benar berhasil tetapi respons jaringan sengaja diputus, dan status setelah reload. Pastikan tidak ada buku/bab kedua.
5. Uji dua tab editor mengubah bab sama. Tab usang harus menampilkan konflik dan mempertahankan teks lokal. Uji logout saat request masih berjalan dan sesi Auth kedaluwarsa.
6. Upload sampul privat. Anon/public URL tidak boleh dapat membacanya. Penulis dapat melihatnya di pengaturan. Publikasi salinan memerlukan persetujuan dan tidak terjadi hanya karena novel dipublikasikan.
7. Periksa `/sw.js` mengembalikan JavaScript, `/manifest.webmanifest` JSON, scope `/`, HTTPS, header no-store, dan rewrite tidak mengubah aset menjadi HTML.
8. Pasang pada Android Chrome/Samsung Internet, iOS Safari + Home Screen, desktop Chromium, serta browser tanpa prompt. Test start_url/deep link, tombol Back, safe area, keyboard dan rotasi pada perangkat fisik.
9. Uji worker versi berikut saat editor dirty/import berlangsung, dua tab, dan tab background. Jangan ada reload sepihak. Uji kembali setelah ditunda.
10. Audit browser storage setelah baca/preview/import/logout. Gunakan sentinel sintetis; jangan unggah karya pribadi ke layanan QA eksternal.
11. Uji ukuran arsip mendekati batas pada ponsel kelas menengah, jeda UI, batal, penggunaan memori, dan EPUB bertingkat. Tidak ada klaim target p95 atau memori perangkat yang belum diukur.

Proyek live teridentifikasi melalui plugin Supabase dan diperiksa secara read-only. Tidak ada branch staging pada daftar proyek tersebut; gerbang integrasi staging di atas belum dinyatakan lulus. Lihat `AUDIT_SUPABASE.md` untuk izin body REST dan filter Sampah yang masih memerlukan rollout. Tidak ada perubahan produksi yang dilakukan.

## Rollout

Urutan: backup → migrasi staging → deploy Edge Functions staging → frontend preview → checklist di atas → rilis produksi terkontrol. Frontend V7.2 memerlukan RPC baru; migrasi kompatibel dengan frontend lama, sehingga backend dapat diterapkan lebih dahulu.

Frontend dipublish dari hasil `npm ci && npm run build`. Jangan mempublikasikan direktori sumber atau `scripts/fixtures`. Build Vite hanya memasukkan entry produksi dan aset public; fixture browser bukan bagian output.

## Rollback

- Rollback frontend ke release sebelumnya bila diperlukan, **tanpa** menghapus episode/halaman yang sudah diimpor.
- Pertahankan receipt dan bucket privat; jangan melakukan rollback destruktif dengan drop tabel. Frontend lama tidak menampilkan sampul privat tetapi naskah tetap ada.
- Bila worker bermasalah, kirim worker perbaikan pada URL `/sw.js` yang sama dan pertahankan no-store. Jangan menganggap menghapus file worker akan menonaktifkan worker yang sudah terpasang.
- Worker tidak mempunyai cache naskah untuk dipulihkan/dihapus. Jangan menjalankan `caches.delete` massal terhadap cache aplikasi lain.
- Endpoint legacy tetap tersedia untuk kompatibilitas. Jangan mengalihkannya menjadi reader utama: episode 0 dan kontraknya berbeda dari `secure-episode`.

## Pemeriksaan lanjutan

Build produksi lokal berhasil memasang service worker otomatis; manifest, PNG PWA, dan MIME JavaScript tersedia; Cache Storage kosong; halaman publik tidak memuat chunk Studio/EPUB lebih awal. Vite preview tidak meniru seluruh header Vercel. Pemeriksaan read-only live juga mengonfirmasi signature RPC impor lama sesuai migrasi, kolom tabel impor/halaman tersedia, serta policy Storage lama dibatasi pada bucket publik sehingga tidak otomatis membuka bucket privat baru. RPC author lama menolak konteks tanpa identitas pengguna. Tidak ada isi karya atau data produksi yang diubah.
