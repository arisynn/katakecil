# Deployment KataKecil V7.2

Ikuti [START_HERE_V72.md](../../START_HERE_V72.md), lalu [QA dan deployment](../v72/QA_DAN_DEPLOY.md).

Frontend V7.2 memerlukan migrasi RPC V7.2 lebih dahulu. Jangan mengulang migrasi lama berdasarkan nomor versi frontend; periksa skema dan riwayat database. Build Vercel: `npm run build`, output: `dist`.

Jika menyalin paket bersih ke folder lama, jalankan `npm run clean:obsolete` untuk meninjau sisa file lama, lalu `npm run clean:obsolete -- --apply` untuk menghapus file yang masih identik dengan daftar audit. File yang telah diedit sendiri akan dilewati.
