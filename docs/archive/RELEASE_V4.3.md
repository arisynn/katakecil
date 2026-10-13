# KataKecil V4.3 — Seamless Episode Reader + Smart EPUB + Episode 0

## Apa yang berubah

1. **Reader publik:** satu permintaan API mengambil **satu episode yang sudah terbit**, bukan seluruh novel dan bukan 1.800 karakter. Seluruh halaman dalam satu episode dipaginasikan secara lokal tanpa request tambahan ketika swipe. Saat pindah episode, state naskah lama diganti. Tidak ada naskah yang disimpan ke localStorage / IndexedDB.
2. **API tambahan:** `secure-episode` memeriksa apakah novel sudah publik, episode diaktifkan, `release_at` sudah lewat, dan batas request. Respons `Cache-Control: private, no-store`. API lama `secure-reader` **tidak dihapus** sebagai rollback.
3. **EPUB importer:** halaman sampul, daftar isi, hak cipta, pengantar, dedikasi, kolofon, tentang penulis, dan halaman bernama serupa ditandai sebagai **non-episode** lalu dikecualikan otomatis, *tetapi tetap tersedia untuk review manual*. Bagian dengan struktur ambigu wajib diperiksa. Prolog/epilog dan episode bernama puitis tetap bisa diimpor.
4. **Episode 0:** termasuk `Episode 0`, `Bab 0`, `Chapter 0`, input nomor episode di Studio, database, URL `/baca/:slug?episode=0`, indeks dan pembacaan. Prolog tanpa nomor **tidak secara otomatis diubah menjadi Episode 0**; penulis bisa menomorinya secara manual.
5. **Tidak diubah:** desain reader, gesture, pengaturan font, watermark Karisyono, anti-copy, anti-print, jalur login Studio, 44 episode lama, dan jadwal rilis.

## Urutan deploy penting (belum siap langsung Production)

**JANGAN jalankan Stage 2 dulu dan jangan langsung deploy kode ke branch utama.**

### 1. Migrasi tambahan Episode 0 via Termux

Ekstrak patch ZIP V4.3 ke root repository lokal, lalu:

```bash
cd ~/storage/shared/katakecil
bash migrate-v43-termux.sh --check
bash migrate-v43-termux.sh --apply
bash migrate-v43-termux.sh --check
```

Skrip membutuhkan koneksi PostgreSQL tanpa password di URL dan meminta password secara tersembunyi. Skrip membuat backup `.dump` sebelum mengubah CHECK constraint dan fungsi impor. Skrip menolak migrasi jika Stage 1 tidak terpasang atau Stage 2 sudah diterapkan. Validasi pascamigrasi menggunakan snapshot nomor episode, tanggal rilis, status, dan hash naskah.

### 2. Deploy Supabase Edge Function BARU

Nama: **`secure-episode`** (bukan `secure-reader`). Source:

`supabase/functions/secure-episode/index.ts`

Pakai Supabase Dashboard → Edge Functions → Deploy new function → Via Editor, atau minta ChatGPT melakukan deploy memakai koneksi Supabase. Untuk fungsi publik ini set **Verify JWT: OFF** karena validasi publikasi dan rate limit dilakukan di backend. Gunakan `READER_RATE_SALT` yang telah dibuat pada V4.2; jangan menaruh kunci rahasia ke frontend. CORS sudah disiapkan.

**Uji dulu function** dengan POST:

```json
{"bookId":"peta-jalan-pulang","episodeNumber":1}
```

Target respons HTTP 200 berbentuk `{episodeNumber,title,arc,content}` dengan isi **satu episode**. Pastikan tidak ada `totalParts` dan respons `Cache-Control` mengandung `no-store`. Coba juga nomor episode yang belum terbit: harus 404. Untuk menguji Episode 0, buat dahulu novel tes privat + draft Episode 0, jadwalkan terbitnya secara sadar, baru coba endpoint; jangan mempublikasikan naskah pribadi sekadar untuk uji.

### 3. Deploy frontend via Vercel Preview

```bash
cd ~/storage/shared/katakecil
git switch -c v4.3-preview
git status
# Pastikan tidak ada .env, backup .dump, atau naskah mentah yang ditambahkan.
git add src scripts/test-v43.mjs package.json supabase/functions/secure-episode/index.ts supabase/migrations/20261012060000_episode_zero_v43.sql migrate-v43-termux.sh RELEASE_V4.3.md
git commit -m "KataKecil V4.3 seamless reader and episode zero"
git push -u origin v4.3-preview
```

Buka Vercel Preview Deployment untuk branch tadi. ENV tetap `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY`.

Uji di HP: baca 5+ halaman dalam 1 episode tanpa teks menggantung; swipe kanan/kiri; akhir episode memindahkan ke episode berikutnya; pengaturan font tidak merusak posisi; pencarian satu episode; bookmark; impor EPUB dummy berisi halaman sampul + daftar isi + bab 0 + bab 1; bagian non-episode tidak dicentang, Episode 0 terdeteksi. Uji Studio setelah login dan pemeriksaan akses naskah terjadwal. Pastikan tidak ada layar putih di browser.

### 4. Hanya setelah lolos Preview

Merge/push ke main untuk Production. Verifikasi lagi pembaca, importer, jadwal dan keamanan. **Stage 2 adalah cutover terpisah; jangan jalankan hanya karena berhasil build.** Setelah Production tervalidasi, evaluasi Stage 2 beserta pemeriksaan keamanan Studio terlebih dahulu.

## Batas keamanan yang harus dipahami

Web tidak dapat mencegah semua screenshot atau ekstraksi konten. Saat satu episode ditampilkan, isi episode itu tersedia sementara di browser pembaca. Perlindungan terutama berasal dari penolakan akses episode belum terbit, penguncian akses langsung naskah lengkap (Stage 2), rate limit, no-store, serta watermark/anti-copy. Reader seharusnya nyaman sekaligus realistis mengenai batas keamanan.

## Status pengujian lingkungan pembuatan

- Lolos: `node scripts/test-v43.mjs` (Episode 0, pengecualian frontmatter, parser episode, API server dengan Supabase mock, no-store, inspeksi sintaks 34 file).
- Lolos: tes V2, V3, V4 dan pemeriksaan sumber publik.
- Lolos: `bash -n migrate-v43-termux.sh`.
- Belum diverifikasi: build Vite penuh karena instalasi dependensi npm timeout; integrasi Edge Function terhadap DB langsung, tampilan actual Chrome Android dan uji EPUB penuh dalam browser.

Jangan menganggap V4.3 Production-ready sebelum langkah integrasi di atas selesai.
