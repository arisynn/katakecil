# Arsitektur KataKecil V6.5

## Prinsip

- **Publik:** halaman utama dan perpustakaan tetap pada `src/pages/PublicLibrary.tsx`; komponen UI reusable berada di `src/features/public/components/`.
- **Studio privat:** route, autentikasi, otorisasi `qr_author_members`, dan pemuatan data berada di `src/pages/Studio.tsx`. Komponen navigasi, dashboard, pengelolaan cerita, dan editor berada di `src/features/studio/components/`.
- **Reader:** engine `src/SecureReaderApp.tsx` dan `src/ReaderApp.tsx` beserta pagination, keamanan, dan gesture tidak dipindah atau diformat agar kontrak perilaku tetap aman. Perubahan Reader harus didahului tes regresi.
- **Supabase:** `src/data/` berisi client dan query; `supabase/migrations/`, `supabase/functions/`, dan `supabase/tests/` dipertahankan apa adanya.
- **Aset:** `public/assets/v6/` dan `public/assets/v53/` dipertahankan; sebagian aset fallback mobile dipilih secara dinamis berdasarkan nama file.

## Peta folder

```text
src/
  App.tsx                     # routing utama & reader route resolution
  pages/
    PublicLibrary.tsx         # komposisi halaman publik
    Studio.tsx                # auth + router Studio privat
    ManuscriptImporter.tsx    # workflow impor transaksional
  features/
    public/components/
      StoryCard.tsx           # kartu cerita + bookmark
      LibraryUI.tsx           # empty state, heading, navigation action
    studio/components/
      StudioShared.tsx        # helper komponen + author display
      StudioNavigation.tsx    # sidebar, bottom navigation, tools
      StudioOverview.tsx      # dashboard, analytics, pengaturan
      BookManagement.tsx      # daftar karya, form, detail, bulk publish
      ChapterEditor.tsx      # editor dan autosave/publikasi
  components/                 # reader, theme, dan komponen bersama
  data/                       # query, storage, penerbitan
  hooks/                      # state tema
  utils/                      # parser, pagination, preferensi
  design/                     # CSS versi yang masih aktif
scripts/
  quality/                    # audit dependensi & regresi struktur
  fixtures/                   # fixture visual
supabase/
  migrations/                 # SQL berurutan, jangan hapus
  functions/                  # Edge Functions keamanan
  tests/                      # audit keamanan dan RLS
public/assets/                # aset yang dipakai aplikasi
```

## CSS dan risiko cascade

Stylesheet lama dan V6.4 **masih dimuat dalam urutan aslinya** dari `src/App.tsx`. File CSS besar sudah diformat tanpa mengubah urutan selector/deklarasi. Konsolidasi aturan/override yang bersifat semantik sengaja tidak dilakukan pada V6.5 karena perlu pemeriksaan visual penuh pada aplikasi berjalan. Hindari menambah stylesheet berbasis nomor versi lagi; gunakan modul yang sesuai saat melakukan redesign berikutnya.

## Batasan V6.5

V6.5 adalah rilis maintenance. Tidak ada migrasi database, perubahan API, perubahan gesture Reader, atau desain baru. Komponen dipindahkan dengan mempertahankan props, handler, dan pemanggilan fungsi. Seluruh pengujian pada aplikasi terhubung Supabase tetap perlu dilakukan sebelum deployment.
