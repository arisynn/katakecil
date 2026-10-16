# KataKecil V7.4 RC1

Aplikasi membaca cerita dan Studio privat penulis dengan palet Sapphire, sampul berbagai rasio, impor ZIP/EPUB/Markdown, riwayat revisi privat, tinjau konflik editor, serta PWA yang memerlukan internet untuk membaca.

Mulai dari [START_HERE_V74.md](START_HERE_V74.md) untuk pemasangan, migrasi editor/sampul, pengujian, dan batas verifikasi. Paket sumber belum berarti perubahan telah diterapkan ke produksi. Frontend editor V7.4 memerlukan migrasi V7.4.

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
