# KataKecil V7.2 RC1 — mulai di sini

Paket ini melanjutkan sumber **V7.1 RC1** yang diberikan. PWA tetap memerlukan internet untuk membaca. Tidak ada unduh bab, cache naskah, atau antrean penyimpanan draft offline.

## Revisi 15 Oktober 2026

Banner tetap “Pratinjau penulis” dihapus sesuai permintaan. Ketuk layar untuk membuka kontrol reader, lalu tekan panah kembali untuk kembali ke editor. Editor kini mengambil judul, arc, isi, dan versi dari satu snapshot terbaru agar metadata lama tidak menimpa judul baru.

## Yang sudah ditambahkan

- **PWA:** menu pemasangan, panduan browser yang tidak menampilkan prompt, ikon maskable terpisah, pemberitahuan koneksi, dan pembaruan atas tindakan pengguna. Service worker tidak menulis Cache Storage.
- **Upload ZIP:** ekstraksi di worker, pemeriksaan arsip, MD/TXT dan satu EPUB di dalam ZIP, folder/arc, nomor Romawi/Chapter/nama file, pemisahan episode vs halaman/berkas lain, konfirmasi kandidat ambigu, filter, undo, gabung/pisah, dan tiga pilihan penomoran.
- **Simpan aman:** transaksi atomik, UUID operasi yang tetap saat retry, pemeriksaan status setelah respons terputus, dan riwayat keputusan tanpa salinan isi naskah. Hasil selalu draft.
- **Reader:** Studio dan publik memakai mesin halaman yang sama; nomor asli 0/12/48/9999, daftar isi sejajar, kegagalan memuat bab tidak menampilkan bab lama, retry menuju target yang benar, dan query navigasi diperhatikan.
- **Studio:** metadata dahulu, isi satu bab saat editor dibuka, pembersihan state saat logout, penjaga navigasi, dan deteksi konflik autosave antar-tab.
- **Sampul impor privat:** hanya tersedia bagi penulis. Penyalinan ke sampul publik harus dipilih dan dikonfirmasi dari pengaturan novel.

- **Ikon:** panah kembali detail cerita kembali terlihat pada ponsel; ikon menggunakan palet biru pada tema terang/gelap, dengan warna kontras di tombol biru. Label aksesibilitas ditambahkan.
- **Audit Supabase live:** koneksi berhasil diperiksa tanpa mengubah data; patch akses REST dan Sampah disertakan terpisah untuk staging.

## Urutan pemasangan

**Jangan mengganti frontend produksi sebelum migrasi V7.2 diterapkan.** Kode Studio baru memerlukan RPC metadata/editor V7.2.

1. Buat branch/backup repository dan backup database. Pertahankan konfigurasi lokal/Vercel milikmu; paket ini tidak menyertakan kredensial.
2. Salin isi folder sumber ke branch pengujian. Jangan menghapus berkas milikmu yang tidak berasal dari paket ini. Jangan menyalin `node_modules` dari proyek lain.
3. Untuk database yang sudah memakai semua migrasi V7.1, jalankan **hanya** `supabase/migrations/20261014085124_v72_online_pwa_smart_import.sql` di Supabase **staging**. Bisa melalui SQL Editor, atau alur migrasi CLI proyek yang sudah terhubung. Riwayat migrasi proyek live tidak lengkap terhadap skema; cocokkan skema sebelum menjalankan SQL lama. Untuk proyek baru, terapkan seluruh migrasi berdasarkan urutan nama, satu kali.
4. Deploy ulang Edge Functions `secure-episode` dan `secure-reader` dari paket ini. Keduanya menambah pemeriksaan Sampah. Pertahankan pengaturan gateway/JWT dan secrets yang memang dipakai proyek; jangan memasukkan service-role key ke variabel `VITE_`.
5. Gunakan Node **22.12+** atau Node 24. Jalankan:

```sh
npm ci
npm run lint
npm run test:current
npm run build
```

6. Untuk pengujian browser lokal/CI:

```sh
npx playwright install chromium --only-shell
npm run test:browser
```

7. Buat preview deployment Vercel menggunakan variabel `VITE_SUPABASE_URL` dan `VITE_SUPABASE_PUBLISHABLE_KEY` staging. Vercel: build `npm run build`, output `dist`. `vercel.json` menyertakan header worker/manifest/halaman sensitif.
8. Uji login penulis, editor, impor ZIP sintetis, retry, sampul privat, reader publik, dan instalasi pada perangkatmu. Terapkan dan uji `supabase/REVIEW_ONLY_v72_reader_access.sql` sesuai `docs/v72/AUDIT_SUPABASE.md` untuk menutup akses body REST langsung dan menegakkan Sampah pada RLS. Baru promosikan setelah checklist dalam `docs/v72/QA_DAN_DEPLOY.md` terpenuhi.

**Belum ada deployment, migrasi, atau perubahan data pada Supabase/Vercel produksi yang dilakukan dari sesi ini.** Paket adalah kandidat rilis untuk staging, bukan sertifikasi bahwa konfigurasi produksi sudah benar.

## Dokumen pendamping

- `docs/v72/PANDUAN_PENULIS.md`: penggunaan ZIP, konflik, dan pemulihan.
- `docs/v72/AUDIT_SUPABASE.md`: hasil pemeriksaan proyek terhubung dan patch akses bertahap.
- `docs/v72/QA_DAN_DEPLOY.md`: hasil uji, batasan, rollout, dan rollback.
- `docs/v72/ARSITEKTUR_DAN_PRIVASI.md`: kontrak data, storage, keamanan, dan temuan audit.
- `docs/v72/RENCANA_DISETUJUI.md`: rencana lengkap yang menjadi acuan.

Sumber naskah asli pengguna tidak dimasukkan ke test atau bundle. Skenario QA memakai teks sintetis.
