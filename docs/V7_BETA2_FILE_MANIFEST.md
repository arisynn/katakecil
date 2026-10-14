# KataKecil V7.0 Beta.2 — File Manifest

**Basis:** V7.0 Beta.1. Tidak ada migrasi Supabase baru.

## Aset baru
- **76 file SVG** di `public/assets/v7/icons/` (stroke 1,85 / viewBox 24×24).
- `public/brand/katakecil-wordmark-light.svg` dan `katakecil-wordmark-dark.svg` — wordmark berbentuk path vektor.

## File baru selain ikon
- `docs/RELEASE_V7_BETA2.md`
- `public/brand/katakecil-wordmark-dark.svg`
- `public/brand/katakecil-wordmark-light.svg`
- `qa/check-beta2-browser.py`
- `qa/screenshots/studio-dark-1440.png`
- `qa/screenshots/studio-dark-390.png`
- `qa/screenshots/studio-light-1440.png`
- `qa/screenshots/studio-light-390.png`
- `qa/studio-beta2-fixture.html`
- `scripts/test-v7beta2.mjs`
- `src/components/BrandIcon.tsx`
- `src/design/v70-beta2.css`

## File diubah
- `scripts/audit-v7beta.mjs` — audit sekarang mencakup CSS Beta.1 dan Beta.2.
- `README.md`
- `package.json`
- `qa/screenshots/collection-dark-1440.png`
- `qa/screenshots/collection-dark-390.png`
- `qa/theme-fixture.html`
- `scripts/test-v7alpha.mjs`
- `scripts/test-v7alpha3.mjs`
- `scripts/test-v7alpha4.mjs`
- `scripts/test-v7beta1.mjs`
- `src/App.tsx`
- `src/components/BrandLogo.tsx`
- `src/components/ReaderControls.tsx`
- `src/components/ReaderEpisodeLoading.tsx`
- `src/components/ReaderPanels.tsx`
- `src/components/ReadingSettingsModal.tsx`
- `src/components/StudioErrorBoundary.tsx`
- `src/components/ThemeToggle.tsx`
- `src/components/public/PublicHeader.tsx`
- `src/features/public/components/DiscoveryNotices.tsx`
- `src/features/public/components/FeaturedHeroCarousel.tsx`
- `src/features/public/components/LibraryUI.tsx`
- `src/features/public/components/StoryCard.tsx`
- `src/features/studio/components/AnnouncementManager.tsx`
- `src/features/studio/components/BookManagement.tsx`
- `src/features/studio/components/ChapterEditor.tsx`
- `src/features/studio/components/StudioNavigation.tsx`
- `src/features/studio/components/StudioOverview.tsx`
- `src/features/studio/components/StudioShared.tsx`
- `src/pages/BookSections.tsx`
- `src/pages/ManuscriptImporter.tsx`
- `src/pages/PublicLibrary.tsx`
- `src/pages/Studio.tsx`
- `src/pages/StudioManagement.tsx`
- `src/pages/TrashManager.tsx`

## File dihapus
- Tidak ada.

## Komponen fungsional yang sengaja tidak diubah
- `src/data/secureReader.ts` — autentikasi konten publik.
- `src/utils/pagination.ts`, `src/components/PageMeasurer.tsx` — mesin pagination.
- Migrasi Supabase, RLS, isi naskah, dan cover penulis.

## Catatan pengujian
- `qa/check-beta2-browser.py` dan `qa/check-theme-browser.py` menggunakan fixture CSS statis, bukan aplikasi React lengkap.
- `npm run test:current` menjalankan tes V4–V7 Beta.2.
- Build/lint belum dapat dijalankan karena dependency Vite dan React tidak tersedia di lingkungan ini.
