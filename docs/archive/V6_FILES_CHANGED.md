# KataKecil V6 — File manifest

## File kode yang diubah

- `package.json` — versi 6.0.0 dan perintah test:v6
- `metadata.json` — versi metadata
- `src/App.tsx` — import stylesheet V6
- `src/pages/PublicLibrary.tsx` — implementasi baru homepage, listing, detail, koleksi, empty state
- `src/components/public/PublicHeader.tsx` — header desktop/mobile dan navigasi publik
- `src/components/Cover.tsx` — ilustrasi fallback baru, mempertahankan cover Supabase
- `src/pages/Studio.tsx` — dashboard, analytics, settings, navigasi, toolbar editor
- `src/components/ReaderPage.tsx` — atribut tema untuk CSS (tanpa mengubah geometri)
- `src/components/ReadingSettingsModal.tsx` — UI pengaturan membaca
- `src/types/reader.ts` — tambah opsi tema calm, tidak menghapus tema lama
- `src/utils/theme.ts` — tema Calm dan label tema V6

## File kode baru

- `src/design/v6.css` — sistem visual V6
- `src/utils/collection.ts` — koleksi lokal ID buku
- `scripts/test-v6.mjs` — static regression contract V6
- `RELEASE_V6.md` — panduan dan laporan pengujian
- `V6_FILES_CHANGED.md` — manifest ini

## Aset baru

- `public/assets/v6/hero-library-sunset.webp`
- `public/assets/v6/hero-library-sunset-mobile.webp`
- `public/assets/v6/studio-ambience.webp`
- `public/assets/v6/empty-library.webp`
- `public/assets/v6/reader-paper-texture.webp`
- `public/assets/v6/detail-backdrop.webp`
- `public/assets/v6/covers/01-senja.webp`
- `public/assets/v6/covers/02-langit.webp`
- `public/assets/v6/covers/03-jejak.webp`
- `public/assets/v6/covers/04-ruang.webp`
- `public/assets/v6/covers/05-hujan.webp`
- `public/assets/v6/covers/06-rumah.webp`
- `public/assets/v6/covers/07-tertunda.webp`
- `public/assets/v6/covers/08-bunga.webp`

## File keamanan dan database yang dipertahankan

- `src/SecureReaderApp.tsx`, `src/ReaderApp.tsx`, `src/components/PageMeasurer.tsx`, `src/utils/pagination.ts`
- `src/data/*`, `src/pages/ManuscriptImporter.tsx`, `src/pages/StudioManagement.tsx`, `src/pages/TrashManager.tsx`
- Seluruh `supabase/migrations/*`, `supabase/functions/*`, dan `supabase/tests/*`
