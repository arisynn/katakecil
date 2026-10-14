# KataKecil V7.0 Beta.1 — Manifest

Basis: `KataKecil_V7_0_Alpha_4_Smart_Reader_Sapphire_Source.zip`.

## File baru
- `src/utils/readingProgress.ts` — parser progress lama/baru dan pemilihan cerita terakhir dibaca.
- `src/design/v70-beta1.css` — penyelarasan alias tema, empty state, responsivitas, target carousel.
- `scripts/test-v7beta1.mjs` — tes logika dan kontrak Beta.1.
- `scripts/audit-v7beta.mjs` — inventaris warna CSS historis dan penjagaan token V7.
- `qa/theme-fixture.html`, `qa/check-theme-browser.py`, `qa/screenshots/*` — fixture dan bukti pemeriksaan CSS statis.
- `docs/RELEASE_V7_BETA1.md`, `docs/V7_BETA1_FILE_MANIFEST.md`.

## File diubah
- `src/design/sapphire-tokens.css` — alias tema global untuk nilai yang sebelumnya tertimpa CSS lama.
- `src/SecureReaderApp.tsx` — menambahkan timestamp pada metadata progress (tanpa perubahan mesin gesture/pagination).
- `src/pages/PublicLibrary.tsx` — resume posisi, urutan terakhir dibaca, heading bab konsisten.
- `src/data/announcements.ts` — filter pengumuman aktif sebelum limit query.
- `src/features/public/components/DiscoveryNotices.tsx` — navigasi keyboard dan swipe.
- `src/App.tsx` — import stylesheet Beta.1 paling akhir.
- `package.json` — versi Beta.1 dan skrip audit/tes.
- `README.md` — ringkasan rilis.
- `scripts/test-v6121.mjs`, `scripts/test-v7alpha.mjs`, `scripts/test-v7alpha2.mjs`, `scripts/test-v7alpha3.mjs`, `scripts/test-v7alpha4.mjs` — penyesuaian assertion historis agar menerima rilis Beta dan perubahan API resume, tanpa menghapus tes fungsi lama.

## Tidak diubah
- Skema Supabase dan seluruh migrasi.
- `src/data/secureReader.ts`, `src/utils/pagination.ts`, `src/components/PageMeasurer.tsx`, `src/content-protection.css`.
- File cover/naskah, konfigurasi autentikasi, dan otorisasi Studio.
