# KataKecil V6.10 — Reader Experience Redesign

KataKecil adalah aplikasi membaca cerita publik dan **Studio privat untuk satu penulis** berbasis React, TypeScript, Vite, dan Supabase. Dua tema global tetap **Arctic Blue** (terang) dan **Midnight Sapphire** (gelap).

V6.10 menyempurnakan pengalaman pembaca: halaman teks tanpa ilustrasi latar, kontrol ringkas yang muncul saat diminta, pemisahan navigasi halaman dan bab, pengaturan membaca berbentuk bottom sheet, serta pencarian nomor/judul bab dan panel penanda. Fullscreen hanya diaktifkan atas pilihan pembaca. Reader publik tetap menggunakan endpoint aman yang hanya memuat episode terbit, satu episode per permintaan. Konten belum terbit dan naskah pribadi tidak menjadi bagian dari payload publik.

Perubahan ini melanjutkan Beranda minimalis V6.8.1 dan Writer Studio V6.9 tanpa merombak kedua area tersebut.

## Menjalankan

```bash
npm install
cp .env.example .env.local
# Isi URL dan publishable key Supabase di .env.local
npm run dev
```

## Validasi

```bash
npm run check:structure
npm run test:current
npm run lint
npm run build
```

`npm run test:v610` menjalankan tes regresi khusus Reader. Tes historis yang menyimpan hash file telah diperbarui ke baseline V6.10 untuk file Reader yang memang berubah; hash modul Supabase, proteksi konten, dan engine pagination tetap mengacu pada baseline sebelumnya.

## Komponen Reader

- `src/SecureReaderApp.tsx` — akses dan posisi membaca episode publik yang telah terbit.
- `src/ReaderApp.tsx` — pratinjau naskah di Studio.
- `src/components/ReaderControls.tsx` — navigasi ringkas dan menu utilitas.
- `src/components/ReadingSettingsModal.tsx` — dua tema global, tipografi, dan layout.
- `src/components/ReaderPanels.tsx` — daftar isi, penanda, dan pencarian teks.
- `src/hooks/useReaderDialogFocus.ts` — fokus keyboard pada panel modal.
- `src/design/v610-reader-experience.css` — styling Reader untuk kedua tema.

## Keamanan dan deployment

- Studio tetap dibatasi oleh Supabase Auth dan otorisasi penulis. Jangan memasukkan service-role key ke frontend.
- Tidak ada migrasi database baru untuk V6.10.
- Jika fitur jadwal bab publik V6.8 belum aktif, migrasi V6.8 masih perlu diterapkan.
- Tidak ada cover, naskah, atau data Supabase yang diganti oleh rilis ini.
- **Uji di staging** sebelum deployment: pinch, swipe, tap, pergantian bab, rotasi, pagination setelah perubahan font, pemulihan posisi, penanda, serta pratinjau Studio.

[Catatan Rilis V6.10](docs/RELEASE_V6.10.md) · [Arsitektur](docs/architecture/README.md) · [Deployment](docs/deployment/README.md)
