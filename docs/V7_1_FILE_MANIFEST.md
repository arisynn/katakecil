# V7.1 RC.1 — File Manifest & Ownership

**Basis:** V7.0 Beta.2 ZIP. Seluruh file yang tidak disebut sebagai berubah dipertahankan dari basis.

| File | Pemilik persona | Perubahan |
|---|---|---|
| `src/pages/PublicLibrary.tsx` | Raka | Retry katalog, filter, reset, Koleksi resume, Detail/prolog |
| `src/features/public/storyFilters.ts` | Raka | **Baru** — pemetaan status yang dapat diuji |
| `src/components/public/PublicHeader.tsx` | Raka | Akses Studio sekunder, fokus Escape menu |
| `src/design/public-experience.css` | Nara | **Baru** — CSS scoped publik, token Sapphire |
| `src/features/studio/components/StudioOverview.tsx` | Kirana | Timestamp resume draft nyata |
| `src/features/studio/components/BookManagement.tsx` | Kirana | Filter Publik/Privat, reset, Bab 0 |
| `src/features/studio/components/ChapterEditor.tsx` | Kirana | Error autosave + retry terlihat, tanpa edit engine save |
| `src/features/studio/components/AnnouncementManager.tsx` | Kirana | Konversi input WIB dan validasi rentang |
| `src/features/studio/components/StudioNavigation.tsx` | Kirana | `aria-current` menu alat |
| `src/design/studio-experience.css` | Nara | **Baru** — CSS scoped Studio |
| `src/App.tsx` | Bima | Import dua stylesheet scoped |
| `package.json` | Bima | Versi RC.1 dan runner tes V7.1 |
| `metadata.json` | Bima | Nama versi |
| `scripts/test-v7alpha*.mjs` (beberapa file) | Tara | Perluasan guard versi untuk RC.1 |
| `scripts/test-v7beta1.mjs`, `scripts/test-v7beta2.mjs` | Tara | Perluasan guard versi untuk RC.1 |
| `scripts/test-v71-public.mjs` | Tara | **Baru** — tes status dan kontrak publik |
| `scripts/test-v71-studio.mjs` | Tara | **Baru** — WIB, autosave guard, hash Reader |
| `README.md` | Bima | Instruksi dan status release candidate |
| `docs/RELEASE_V7_1.md` | Tara | **Baru** — changelog, QA, rollback |
| `docs/V7_1_FILE_MANIFEST.md` | Tara | **Baru** — daftar file |
| `docs/V7_1_QA_MATRIX.md` | Tara | **Baru** — matriks status acceptance |
| `docs/V7_1_IMPLEMENTATION_SPEC.md` | Semua | **Salinan** spesifikasi yang disetujui |

**Batas kontrak:** `src/SecureReaderApp.tsx`, `src/ReaderApp.tsx`, `src/utils/pagination.ts`, `src/utils/readerGesture.ts`, dan `src/components/PageMeasurer.tsx` tidak diubah; hash dibandingkan terhadap baseline. Tidak ada migrasi database atau penambahan dependensi npm.
