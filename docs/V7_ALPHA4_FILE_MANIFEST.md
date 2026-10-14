# KataKecil V7.0 Alpha.4 — File Manifest

## Ditambahkan

- `src/utils/readerCompletion.ts` — metadata penyelesaian bab dan perkiraan menit tersisa, pure functions.
- `src/design/v70-alpha4.css` — gaya status dan loading Reader menggunakan token Sapphire.
- `scripts/test-v7alpha4.mjs` — regresi Alpha.4.
- `docs/RELEASE_V7_ALPHA4.md` — catatan rilis dan validasi.
- `docs/V7_ALPHA4_FILE_MANIFEST.md` — daftar perubahan.

## Diubah

- `src/SecureReaderApp.tsx` — penyimpanan status bab selesai, estimasi waktu, loading metadata, dan integrasi kontrol/daftar isi.
- `src/components/ReaderControls.tsx` — tombol status selesai di menu dan informasi waktu pada footer.
- `src/components/ReaderPanels.tsx` — indikator bab selesai di Daftar Isi.
- `src/components/ReaderEpisodeLoading.tsx` — BAB N dan judul yang tersedia dari indeks.
- `src/utils/readerHeading.ts` — mendukung BAB 0.
- `src/utils/theme.ts` — overlay Reader dari token global.
- `src/secure-reader.css` — recovery/error screen tanpa warna krem hardcoded.
- `src/index.css` dan `src/design/v610-reader-experience.css` — scrim, shadow, hover memakai token global.
- `src/design/sapphire-tokens.css` — token scrim light/dark.
- `src/App.tsx` — impor CSS Alpha.4.
- `scripts/test-v611.mjs` — regresi BAB 0.
- `scripts/test-v7alpha3.mjs` — validasi kompatibilitas versi Alpha.4.
- `scripts/audit-v7-theme.mjs` — sertakan CSS Alpha.4 dan recovery dalam audit.
- `package.json` — versi Alpha.4 dan skrip tes.
- `README.md` — dokumentasi entrypoint Alpha.4.

## Tidak diubah

- Mekanisme akses episode server, Supabase Auth/RLS, pagination engine, text measurer, proteksi konten, manuskrip, cover, dan skema database.
