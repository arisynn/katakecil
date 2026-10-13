# KataKecil V6.10 — Reader Experience Redesign

**Dasar:** V6.9. **Cakupan:** pengalaman membaca publik dan pratinjau penulis. **Database:** tidak ada migrasi baru.

## Perubahan yang diterapkan

1. **Reading Canvas.** Folio disederhanakan menjadi nomor halaman. Petunjuk bahasa Inggris yang sebelumnya berulang di setiap halaman dihapus. Saat kontrol ditampilkan, halaman tidak lagi diperkecil sehingga teks tetap nyaman dibaca dan perhitungan pagination tidak terganggu.
2. **Kontrol kontekstual.** Header hanya memuat kembali ke detail cerita, judul, penanda, daftar isi, pengaturan `Aa`, dan menu tambahan. Pencarian, fullscreen, kembali ke posisi tadi, serta menyembunyikan kontrol berada di menu tambahan. Footer memisahkan slider halaman dari tombol bab sebelumnya/berikutnya. Pada pratinjau penulis, label progres menyebut *naskah*, bukan *bab*.
3. **Fullscreen opsional.** Pemanggilan fullscreen otomatis ketika berpindah halaman dihapus dari Reader publik dan pratinjau. Pengguna masih bisa memilih fullscreen melalui menu.
4. **Pengaturan sederhana.** Dua tema global tetap satu sumber preferensi. Ukuran teks 90–160%, tiga pilihan font utama, serta pengaturan lanjutan untuk jarak baris, margin, perataan, mode halaman, dan font mono. Dialog dirancang sebagai bottom sheet pada mobile dan modal pada desktop.
5. **Daftar Isi.** Pencarian nomor/judul bab dan status bab aktif ditambahkan. Metadata 0 menit/0 kata tidak lagi ditampilkan untuk bab publik yang hanya memiliki metadata tanpa isi.
6. **Pencarian teks.** Label menunjukkan cakupan sebenarnya: bab aktif untuk Secure Reader dan naskah pratinjau untuk editor Studio. Tidak ada permintaan konten bab lain hanya untuk mencari.
7. **Gesture dan posisi.** Swipe, tap, pinch, perpindahan bab, dan penyimpanan progres tetap digunakan. Pinch kini memerlukan perubahan jarak dua jari agar tidak salah terdeteksi saat dua jari hanya menyentuh layar. Posisi saat berpindah ke akhir bab sebelumnya dan saat menuju penanda disimpan dengan lebih akurat.
8. **Aksesibilitas dan warna.** Dialog mempunyai focus trap dan pemulihan fokus. Kontrol memiliki label aksesibel, area sentuh 44px, safe area, serta dukungan reduced motion. Warna Reader, loading, dan error menggunakan token Arctic Blue/Midnight Sapphire.

## File yang berubah

- `src/App.tsx`
- `src/ReaderApp.tsx`
- `src/SecureReaderApp.tsx`
- `src/components/ReaderControls.tsx`
- `src/components/ReaderPage.tsx`
- `src/components/ReaderPanels.tsx`
- `src/components/ReadingSettingsModal.tsx`
- `src/hooks/useReaderDialogFocus.ts` (baru)
- `src/design/v610-reader-experience.css` (baru)
- `scripts/test-v610.mjs` (baru)
- `scripts/test-v65.mjs`, `test-v66.mjs`, `test-v67.mjs`, `test-v68.mjs`, `test-v69.mjs` (baseline dan kompatibilitas versi)
- `package.json`, `README.md`, dan dokumentasi rilis.

## Validasi dan keterbatasan

- **13 kelompok pengujian regresi** dalam `npm run test:current`: lulus pada pemeriksaan source dan utilitas.
- Pemeriksaan struktur: 76 file source dan 219 referensi import/aset, tanpa target hilang.
- Pemeriksaan sintaks TypeScript/TSX pada modul yang berubah: lulus melalui transpilation TypeScript.
- CSS baru berhasil diparse oleh PostCSS.
- Modul `src/data/secureReader.ts`, `src/data/supabase.ts`, `src/utils/pagination.ts`, `src/components/PageMeasurer.tsx`, dan `src/content-protection.css` tidak berubah dari baseline V6.9.
- **Full TypeScript typecheck belum berhasil dijalankan:** dependency `vite/client` tidak tersedia di lingkungan ini.
- **Production build belum berhasil dijalankan:** dependency `vite` tidak tersedia dan `npm install` gagal karena DNS registry npm.
- **Pemeriksaan screenshot Chromium tidak berhasil:** proses headless browser tidak menyelesaikan rendering di lingkungan ini. Tidak ada klaim bahwa UI telah diuji secara visual pada browser sebenarnya.
- **Supabase live dan gesture pada perangkat Android/iOS belum diuji.** Perlu staging dan pengujian manual.

## Checklist sebelum produksi

1. `npm install`, `npm run lint`, `npm run test:current`, `npm run build`.
2. Periksa Reader pada 360px, 390px, 430px, tablet, desktop, dan landscape untuk dua tema.
3. Uji pinch, swipe, tap tengah, fullscreen manual, bookmark, daftar isi, dan pencarian bab.
4. Uji perubahan ukuran font, margin, orientasi, dan pemulihan posisi setelah refresh.
5. Uji transisi bab, bab kosong, bab pertama/terakhir, loading gagal, serta jaringan terputus.
6. Verifikasi konten draft/terjadwal tidak dapat diakses melalui Reader publik dan endpoint tetap membatasi konten.
7. Uji pratinjau naskah Studio, serta akses Studio oleh akun yang berwenang dan tidak berwenang.

**Rilis ini merupakan source untuk pengujian integrasi, belum dinyatakan production-ready.**
