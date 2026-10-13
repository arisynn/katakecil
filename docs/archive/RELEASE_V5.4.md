# KataKecil V5.4 — Reader First Experience & Writer Workflow

## Perubahan source

- `index.html`: set tema sebelum React; loader awal tidak putih; branding metadata diperbaiki.
- `src/hooks/useUiTheme.ts`: preferensi System/Light/Dark dengan listener OS, storage, dan sinkronisasi tab.
- `src/components/ThemeToggle.tsx`: pilihan tiga tema melalui menu kecil yang mudah diakses.
- `src/components/ThemeLoading.tsx`: komponen loading global.
- `src/components/public/PublicHeader.tsx`: top header minimal, navigasi publik mobile bawah, perilaku scroll.
- `src/design/v54.css`: tokens dan penyesuaian tema global tanpa menyentuh CSS Reader.
- `src/pages/Studio.tsx`: hapus hamburger mobile header, pintasan kembali ke publik, bulk publish dan status Finale.
- `src/data/bulkPublishing.ts`: RPC client untuk publikasi massal dengan validasi respons.
- `supabase/migrations/20261012210000_katakecil_v54_bulk_publish.sql`: fungsi author-only, atomic, finale metadata.
- `src/utils/theme.ts`, `src/components/ReadingSettingsModal.tsx`: pilihan empat palette tanpa mengubah Reader flow.
- `src/pages/ManuscriptImporter.tsx`: checklist hasil parsing dan konfirmasi penyimpanan.
- `src/components/ReaderPanels.tsx`: label merek KataKecil Reader.
- `src/data/library.ts`, `src/pages/PublicLibrary.tsx`: Finale hanya untuk episode akhir yang benar-benar sudah terbit, dengan dukungan fallback sebelum migrasi V5.4.
- `scripts/test-v54.mjs`: regression check offline V5.4.

## Tidak diubah

- Komponen mesin `ReaderApp`, `SecureReaderApp`, `ReaderPage`, `ReaderControls` dan mekanisme navigasi / hitung halaman.
- Source Edge Function Secure Reader dan kebijakan keamanan lama.
- Naskah pribadi atau isi episode produksi: tidak ada dalam ZIP atau dalam diff.
- Tidak melakukan operasi ke Supabase proyek live.

## Potensi regresi yang wajib dicek setelah deploy

1. Chrome Android (light/dark), Safari mobile: tema mengikuti sistem, header muncul kembali saat scroll naik, bottom nav tidak menutupi isi.
2. Reader: landscape, portrait, touch navigation, progress, bookmark, font-size, semua palette, fullscreen.
3. Studio: auth, hamburger hilang, semua menu bottom bar, konfirmasi publikasi, jadwal lama, draft kosong, buku privat, halaman buku.
4. Impor EPUB: dari file picker Android, cover/no cover, halaman buku, validasi batch, error recovery, data masuk ke Studio.
5. Desktop: halaman utama, listing, detail, navigation, Studio management, tema terang/gelap.
