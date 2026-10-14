# V7.0.0-alpha.2 — Manifest Perubahan

| File | Perubahan |
|---|---|
| `src/features/public/components/LibraryUI.tsx` | Refactor empty state, tidak mewarisi kelas V6, CTA kontekstual |
| `src/pages/PublicLibrary.tsx` | Filter koleksi, pengurutan tersimpan, tampilan tanpa hasil |
| `src/features/public/collectionFilters.ts` | Helper pure sorting/filtering koleksi (baru) |
| `src/design/v70-alpha2.css` | Desain Sapphire untuk empty state, koleksi, header dan bottom nav (baru) |
| `src/App.tsx` | Impor CSS Alpha.2 |
| `scripts/audit-v7-theme.mjs` | Audit token, hardcoded colors, contrast (baru) |
| `scripts/test-v7alpha2.mjs` | Tes regresi Alpha.2 (baru) |
| `scripts/test-v7alpha.mjs` | Asersi versi kompatibel Alpha.2 |
| `package.json` | Versi 7.0.0-alpha.2 dan skrip test/audit |
| `docs/RELEASE_V7_ALPHA2.md` | Catatan rilis (baru) |
| `docs/V7_ALPHA2_FILE_MANIFEST.md` | Manifest (baru) |
| `README.md` | Pointer rilis Alpha.2 |

Tidak ada file SQL, migrasi Supabase, perubahan reader, atau penggantian aset cover penulis.
