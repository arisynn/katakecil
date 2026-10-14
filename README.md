# KataKecil V7.0 Alpha.2 — Sapphire Consistency & Collection Polish

Lihat [`docs/RELEASE_V7_ALPHA2.md`](docs/RELEASE_V7_ALPHA2.md) untuk perbaikan empty state Koleksi dan audit dua tema.

# KataKecil V7.0 Alpha.1 — The Living Library

**Alpha untuk staging, belum siap langsung menggantikan production.** Fokus: logo brand baru, Beranda editorial, Temukan dengan kabar nyata, Koleksi yang selalu terlihat, dan sampul bersih. Secure Reader dan Studio privat tetap memakai mekanisme V6.12.1.

Baca [catatan rilis dan keterbatasan](docs/RELEASE_V7_ALPHA.md) serta [manifest perubahan](docs/V7_ALPHA_FILE_MANIFEST.md).

# KataKecil V6.11 — Immersive Reader & Sapphire Loading

KataKecil adalah aplikasi membaca cerita publik dan **Studio privat untuk satu penulis** berbasis React, TypeScript, Vite, dan Supabase. Dua tema global tetap **Arctic Blue** (terang) dan **Midnight Sapphire** (gelap).

V6.11 menambahkan **pinch-to-minimize**: halaman mengecil saat cubit ke dalam, kontrol muncul, dan kembali fullscreen saat cubit ke luar. Heading `BAB N` dan judul ditata otomatis dari metadata episode tanpa mengubah database. Loading screen awal, Reader, Public, dan Studio kini memiliki desain Sapphire Blue yang konsisten, menggunakan SVG/CSS tanpa ilustrasi background.

Beranda V6.8.1 dan Studio V6.9 tetap dipertahankan. Akses episode publik masih melalui Secure Reader yang hanya memuat episode terbit.

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
npm run audit:colors
npm run test:current
npm run lint
npm run build
```

`npm run test:v611` menguji normalisasi judul, arah pinch, dan kesamaan hash modul keamanan/pagination. `npm run audit:colors` memeriksa literal warna pada komponen; stylesheet historis masih perlu QA browser. Full lint/build membutuhkan dependency npm terpasang.

## Komponen Reader

- `src/SecureReaderApp.tsx` — akses dan posisi membaca episode publik yang telah terbit.
- `src/ReaderApp.tsx` — pratinjau naskah di Studio.
- `src/components/ReaderControls.tsx` — navigasi ringkas dan menu utilitas.
- `src/components/ReadingSettingsModal.tsx` — dua tema global, tipografi, dan layout.
- `src/components/ReaderPanels.tsx` — daftar isi, penanda, dan pencarian teks.
- `src/hooks/useReaderDialogFocus.ts` — fokus keyboard pada panel modal.
- `src/design/v610-reader-experience.css` — baseline Reader V6.10.
- `src/design/v611-immersive-reader.css` — pinch visual, heading, panel, warna, dan loading V6.11.
- `src/utils/readerHeading.ts` dan `readerGesture.ts` — logika tampilan yang dapat diuji.

## Keamanan dan deployment

- Studio tetap dibatasi oleh Supabase Auth dan otorisasi penulis. Jangan memasukkan service-role key ke frontend.
- Tidak ada migrasi database baru untuk V6.11.
- Jika fitur jadwal bab publik V6.8 belum aktif, migrasi V6.8 masih perlu diterapkan.
- Tidak ada cover, naskah, atau data Supabase yang diganti oleh rilis ini.
- **Uji di staging** sebelum deployment: pinch, swipe, tap, pergantian bab, rotasi, pagination setelah perubahan font, pemulihan posisi, penanda, serta pratinjau Studio.

[Catatan Rilis V6.11](docs/RELEASE_V6.11.md) · [Arsitektur](docs/architecture/README.md) · [Deployment](docs/deployment/README.md)

## V6.12 — Adaptive Reader

Perbaikan viewport/pinch, loading episode, dan palet Sapphire global. Detail perubahan dan batasan pengujian terdapat pada `docs/RELEASE_V6.12.md`. Tes regresi: `npm run test:current`; audit warna: `npm run audit:colors:v612`.

## V6.12.1 — Sapphire CTA Hotfix

Tombol **Mulai Membaca** pada halaman detail cerita (mode gelap) kini mengikuti aksen biru global; override kuning emas V6.2 dihapus. Tombol utama Studio juga mengikuti token Sapphire. Lihat `docs/RELEASE_V6.12.1.md`. Jalankan `npm run test:v6121` untuk pemeriksaan khusus.
