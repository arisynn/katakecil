# KataKecil V4.1.1 — Android File Picker Fix

Patch khusus untuk masalah **Studio → Impor**: setelah memilih EPUB/MD/TXT di pemilih berkas Android, kembali ke browser tetapi tidak ada progres/hasil.

## Perubahan source

- `src/pages/ManuscriptImporter.tsx`: proses event `input` maupun `change` dari pemilih dokumen native Android (satu file hanya diproses sekali), ambil referensi `File` sebelum mereset input agar file yang sama bisa dipilih lagi, dukung EPUB MIME `application/epub+zip` dan teks walau ekstensi nama file tidak lengkap, serta tampilkan nama berkas, status analisis, hasil sukses/gagal.
- `src/studio-v4.css`: perbesar input file dari **1×1 px** menjadi kontrol transparan yang mengisi seluruh area upload dan dapat disentuh langsung. Tetap mempertahankan desain visual Studio.
- `src/App.tsx`: periksa kembali status privacy curtain ketika halaman mendapat `focus` setelah kembali dari sistem picker Android. Tab tersembunyi tetap ditutup tirai putih sesuai preferensi proteksi sebelumnya.
- `package.json`: nomor versi patch `4.1.1`.

## Cara pasang

1. Backup kode/repository sebelum mengganti versi.
2. Ekstrak seluruh berkas zip ini ke root project (sejajar `package.json`), dengan menimpa source V4.1. **Jangan menimpa `.env.local`** bila sudah ada: tidak ada ENV baru.
3. Push dan deploy ke Vercel Preview lebih dulu. Uji dari Chrome Android di `/studio/impor` dengan EPUB dummy dan MD dummy.
4. Setelah memilih file, area **status** harus menampilkan nama dan status analisis, kemudian hasil episode atau pesan error yang bisa dibaca. Jika file gagal, kirim pesan error dan jenis file agar penyebabnya dapat dipastikan.
5. Pastikan tidak ada publikasi otomatis. Semua hasil impor yang disimpan tetap draft, jadwal rilis lama tidak diubah.

Tidak ada migrasi Supabase, akun baru, atau perubahan reader. Jangan jalankan ulang migrasi V2–V4.

## Pemeriksaan lokal

- 27 file TypeScript/TSX lolos pemeriksaan **sintaks parse** (bukan typecheck penuh).
- Tes parser/utilitas V2, V3, dan V4 lulus.
- Headless Chromium mode mobile pada 320, 360, 390, dan 412 px: area upload memunculkan native file picker; pemilihan EPUB dummy menghasilkan event berkas dengan nama file pada tiap ukuran.
- Belum ada uji langsung pada perangkat Android pengguna, database aktif, atau build Vite penuh karena dependensi npm dari registry tidak bisa dipasang di lingkungan ini. Uji Vercel Preview tetap wajib.

## Perlindungan dan batasan

Anti-copy, anti-print, tirai privasi saat tab tersembunyi, watermark `Karisyono`, dan pengaturan zoom reader tetap dipertahankan. Tidak ada perlindungan web yang dapat menjamin screenshot selalu menjadi putih.
