# Deployment V6.5

## Prasyarat

- Node.js yang kompatibel dengan Vite 8 dan TypeScript 7.
- Kredensial Supabase milik proyek Anda, sesuai `.env.example`.
- Database yang sudah memiliki migrasi yang relevan; **jangan** mengulang migrasi secara sembarangan.

## Perintah

```bash
npm install
npm run check:structure
npm run test:current
npm run lint
npm run build
npm run preview
```

`npm run check` dan `npm run publish` adalah perintah pemeriksaan/publikasi lama; jangan jalankan `npm run publish` pada lingkungan produksi tanpa memahami efeknya. V6.5 tidak membutuhkan migrasi SQL baru.

## Pemeriksaan manual sebelum produksi

- Uji mode terang/gelap di homepage, detail, Reader, daftar bab, dan Studio.
- Uji login penulis dan akses non-penulis, tanpa membuka akses publik ke Studio.
- Uji autosave, publikasi, impor EPUB/Markdown, sampah/pemulihan.
- Uji pinch, swipe, pagination, bookmark, dan progres Reader di perangkat nyata.
- Periksa console browser dan layout pada iOS/Android serta desktop.

Riwayat instruksi deployment lama disimpan di `docs/archive/`.
