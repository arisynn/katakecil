# Arsitektur KataKecil V7.2

Rujukan utama: [Arsitektur dan privasi](../v72/ARSITEKTUR_DAN_PRIVASI.md).

- `src/pages`: komposisi halaman publik, Studio, dan impor.
- `src/features`: komponen fitur publik, Studio, PWA, dan worker ZIP.
- `src/SecureReaderApp.tsx`: mesin reader publik dan pratinjau bersama.
- `src/data`: akses Supabase dan otorisasi melalui RPC.
- `src/design`: stylesheet aktif; urutan cascade masih diperlukan.
- `supabase`: migrasi, Edge Functions, dan audit SQL yang tetap dibutuhkan.
- `scripts/fixtures/v72`: fixture sintetis untuk browser QA, tidak masuk build produksi.

Modul carousel lama, prefetch reader lama, dan alias preferensi tema yang tidak lagi dipakai telah dihapus. Sampul varian mobile dipilih secara dinamis dan tetap disertakan.
