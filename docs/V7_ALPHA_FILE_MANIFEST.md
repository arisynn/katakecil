# Manifest perubahan V7.0 Alpha.1

## Baru

- `src/components/BrandLogo.tsx` — brand lockup bersama.
- `src/features/public/components/DiscoveryNotices.tsx` — carousel kabar nyata dari rilis dan jadwal publik.
- `src/design/v70-alpha.css` — editorial homepage, Temukan, Koleksi, brand, responsivitas.
- `public/brand/katakecil-mark.svg` — vector feather mark.
- `public/brand/katakecil-icon.svg` — icon square vector.
- `public/brand/katakecil-icon-192.png` dan `katakecil-icon-512.png` — app icons.
- `public/favicon.png`, `public/apple-touch-icon.png`, `public/manifest.webmanifest`.
- `scripts/test-v7alpha.mjs` — alpha regression contract.
- `docs/RELEASE_V7_ALPHA.md`, `docs/V7_ALPHA_FILE_MANIFEST.md`.

## Diperbarui

- `src/App.tsx` — import stylesheet V7 dan rute fallback ke Temukan.
- `src/pages/PublicLibrary.tsx` — home editorial, discovery, collection shelf, detail save action, backward compatibility.
- `src/components/public/PublicHeader.tsx` — 4 tab tetap dan logo baru.
- `src/features/public/components/StoryCard.tsx` — cover bersih, bookmark dipindahkan ke detail.
- `src/features/public/components/LibraryUI.tsx` — copy empty state dan arah Temukan.
- `src/features/studio/components/StudioNavigation.tsx` — logo Studio.
- `src/pages/Studio.tsx` — logo login Studio dan copy tautan kembali.
- `src/components/ThemeLoading.tsx` — logo loading React.
- `index.html` — logo boot screen, manifest, favicon, metadata.
- `package.json` — versi `7.0.0-alpha.1`, tes alpha dan baseline relevan.
- `README.md` — penunjuk rilis alpha.

## Sengaja tidak diubah

`src/SecureReaderApp.tsx`, `src/ReaderApp.tsx`, `src/data/secureReader.ts`, `src/data/supabase.ts`, seluruh migrasi SQL lama, file naskah, dan cover asli.
