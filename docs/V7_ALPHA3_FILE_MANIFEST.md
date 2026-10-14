# KataKecil V7.0 Alpha.3 — File Manifest

## Ditambahkan

- `src/data/announcements.ts` — model, validasi, query publik dan CRUD Studio.
- `src/features/studio/components/AnnouncementManager.tsx` — pengelola pengumuman privat.
- `src/design/v70-alpha3.css` — gaya responsif Studio dan Temukan dengan token Sapphire.
- `supabase/migrations/20261014010000_v7_public_announcements.sql` — tabel tambahan dan RLS.
- `scripts/test-v7alpha3.mjs` — regresi domain, privasi, integrasi source, sintaks.
- `docs/RELEASE_V7_ALPHA3.md` — release notes dan instruksi staging.
- `docs/V7_ALPHA3_FILE_MANIFEST.md` — manifest ini.

## Diubah

- `src/pages/Studio.tsx` — route pengelola pengumuman di balik auth/author membership.
- `src/features/studio/components/StudioNavigation.tsx` — Pengumuman di dropdown Alat Studio.
- `src/pages/PublicLibrary.tsx` — memuat pengumuman opsional, meneruskan ke Temukan, refresh metadata berkala.
- `src/features/public/components/DiscoveryNotices.tsx` — carousel pengumuman + rilis + jadwal, tanpa tombol palsu.
- `src/App.tsx` — import CSS Alpha.3.
- `scripts/test-v7alpha.mjs` — kontrak integrasi baru.
- `scripts/test-v7alpha2.mjs` — pengujian lintas versi Alpha.
- `scripts/audit-v7-theme.mjs` — memasukkan CSS Alpha.3 dalam audit warna.
- `package.json` — versi dan pengujian Alpha.3.
- `README.md` — entrypoint rilis Alpha.3.

## Tidak diubah

- Reader engine, gesture, pagination, content protection.
- Naskah, data cerita, cover asli, koleksi local-first, Supabase Auth.
- Logo, brand assets, tema global terang/gelap.
