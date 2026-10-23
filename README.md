# KataKecil V7.5 RC1

**UI 1.5:** [Library, Studio, dialog dan reader dirapikan](docs/UI_POLISH.md).
Rak tetap hanya sampul, reader tetap hybrid, dan alur penerbitan tidak diubah.
Source dan APK disiapkan pada cabang terpisah; produksi belum diubah.

**Reader hybrid 1.4:** [satu halaman membaca untuk episode dan EPUB](docs/HYBRID_READER.md).
EPUB tetap utuh dan privat; beranda, reader, dan pratinjau Studio memakai
komponen pembaca yang sama. [Laporan uji 1.4](docs/HYBRID_TEST_REPORT.md).

**Migrasi Web Push:** [Supabase Edge Functions + Cron, cutover dan rollback](docs/WEB_PUSH_SETUP.md)
dan [hasil uji](docs/WEB_PUSH_EDGE_TEST_REPORT.md). Kunci VAPID dan subscription
lama dipertahankan; tidak ada aktivasi atau perubahan produksi otomatis.

**Pembaruan 1.3:** [EPUB utuh, penerbitan per episode, aktivasi backend dan build](docs/EPUB_UPDATE.md)
dan [laporan uji 1.3](docs/EPUB_TEST_REPORT.md).
File asli tetap privat; beranda dan reader hanya menampilkan episode/halaman yang terbit.
Source dan APK belum mengaktifkan fitur ini di produksi: migrasi tambahan dan API server
harus dipasang pada lingkungan tujuan. Buku episode lama tetap didukung.

**Pembaruan terbaru 1.2:** [rak sampul, APK, unduhan web dan pemeriksaan versi](docs/SHELF_UPDATE.md),
[aktivasi push web](docs/WEB_PUSH_SETUP.md), dan [laporan uji](docs/SHELF_TEST_REPORT.md).
PWA di web sudah diganti dengan unduhan APK; push web membutuhkan aktivasi server
terpisah. Website/database produksi tidak diubah oleh pengerjaan source ini.

**Versi Library & Writer Studio:** [petunjuk web/APK dan batas notifikasi](docs/CRYSTAL.md)
serta [laporan uji](docs/CRYSTAL_TEST_REPORT.md). Versi ini menyederhanakan beranda,
merombak Studio dengan tata letak padat, dan menambahkan Android Capacitor.
Integrasi antarmuka ini tidak menjalankan SQL atau mengubah produksi.

Aplikasi membaca cerita dan Studio privat penulis dengan palet Sapphire, sampul berbagai rasio, impor ZIP/EPUB/Markdown, riwayat revisi privat, tinjau konflik editor, serta aplikasi Android. Membaca dan menyimpan memerlukan internet.

Mulai dari [START_HERE_V75.md](START_HERE_V75.md) untuk pemasangan SQL V7.5, impor dengan penerbitan otomatis, hapus massal, pengujian, dan batas verifikasi. Paket sumber belum berarti perubahan telah diterapkan ke produksi. Fitur pengelolaan V7.5 memerlukan paket SQL V7.5 setelah seluruh migrasi V7.4.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Isi `.env.local` dengan URL dan publishable key proyek pengujian. Jangan menaruh secret/service-role key pada variabel Vite.

```sh
npm run check
npm run build
npm run test:browser
npm run test:edge
```

- [Panduan revisi dan konflik](docs/v74/PANDUAN_REVISI.md)
- [Arsitektur, QA dan rollout V7.4](docs/v74/RILIS_DAN_PEMASANGAN.md)
- [Panduan sampul](docs/v73/PANDUAN_SAMPUL.md)
- [Arsitektur dan privasi sampul](docs/v73/ARSITEKTUR_SAMPUL.md)
- [QA, deployment, dan rollback](docs/v73/QA_DAN_DEPLOY.md)
- [Panduan V7.2](START_HERE_V72.md)
- [Audit Supabase sebelumnya](docs/v72/AUDIT_SUPABASE.md)
- [Pembersihan sumber sebelumnya](docs/v72/PEMBERSIHAN.md)

Migrasi dan tes keamanan aktif tetap dipertahankan. CSS lama yang masih diimpor tetap diperlukan; jangan menghapus berdasarkan nomor versi saja. Folder `dist`, `node_modules`, dan hasil screenshot QA tidak termasuk ZIP sumber.
