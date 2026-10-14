> **Arsip rencana yang disetujui.** Implementasi telah dilanjutkan atas instruksi pemilik. Untuk status aktual, hasil tes, dan batasan rilis lihat [`RELEASE_V7_1.md`](RELEASE_V7_1.md).

# KATAKECIL V7.1 — FIVE MINDS IMPLEMENTATION SPECIFICATION

**Status:** spesifikasi pra-implementasi (belum ada kode diubah)  
**Baseline:** `KataKecil_V7_0_Beta_2_Studio_Full_UI_Polish_Source-4.zip` (`package.json`: `7.0.0-beta.2`)  
**Arah:** refinement sedang, bukan redesign total  
**Prioritas:** seimbang antara pengalaman membaca publik dan Studio privat satu penulis  
**Pemilik keputusan produk:** pengguna/pemilik KataKecil  
**Tim virtual:** Nara (Visual), Raka (Public UX), Kirana (Studio UX), Bima (Architecture), Tara (QA/Security)

## A. Baseline dan keterbatasan audit

Pemeriksaan ulang terhadap source yang diberikan:

- `npm run check:structure`: **PASS** — 100 source files, 283 referensi import/aset lokal.
- `node scripts/audit-v7-theme.mjs`: **PASS** — dua tema Sapphire, enam pasangan kontras yang diaudit.
- `node scripts/audit-v7beta.mjs`: **PASS** — nol literal warna baru pada CSS Beta.1/Beta.2; inventaris 1.080 literal warna di CSS historis (bukan 1.080 bug).
- `node scripts/verify-public-build.mjs`: **PASS** — pemeriksaan sumber untuk bundle publik.
- `npm run test:current`: **belum berhasil dieksekusi ulang** karena dependensi `typescript` tidak terpasang di lingkungan audit; bukan bukti bahwa kode gagal.
- `npm run lint`, `npm run build`, QA React browser dan Supabase staging: **belum diverifikasi**.
- `qa/screenshots/` berisi hasil fixture CSS, **bukan screenshot runtime aplikasi React yang terhubung Supabase**.

## B. Aturan perubahan (non-negotiable)

1. Pertahankan React + TypeScript + Vite + Supabase, route dan kontrak data yang ada.
2. Pertahankan Arctic Blue/Midnight Sapphire, wordmark, feather, dan 76 ikon SVG; jangan membuat identitas brand baru.
3. Jangan mengubah engine Reader (`src/SecureReaderApp.tsx`, `src/ReaderApp.tsx`, `src/utils/pagination.ts`, `src/utils/readerGesture.ts`, `src/components/PageMeasurer.tsx`) kecuali bug yang dapat direproduksi dan disetujui.
4. Pertahankan perilaku Reader: pinch masuk/keluar menu, swipe halaman, bookmark, progress offset, pemulihan posisi, perubahan font/tema, serta pratinjau Studio.
5. Pertahankan mekanisme autosave dan publikasi Studio. Perubahan visual tidak boleh mengubah urutan penyimpanan atau bypass konfirmasi.
6. Studio hanya untuk akun anggota `qr_author_members`, diperkuat oleh RLS Supabase; tidak ada registrasi multi-author atau akun pembaca.
7. Jangan mengubah naskah, metadata karya, cover asli, storage, atau data produksi.
8. Tidak menambahkan komentar, followers, like, trending palsu, download cerita, sinkronisasi akun pembaca, atau statistik pembaca fiktif.
9. Hindari stylesheet bertumpuk bernama versi baru (`v71.css`). Lakukan perubahan terlokalisasi; gunakan CSS token dan review cascade.
10. Tidak deploy, migrasi produksi, atau edit kode sebelum keputusan implementasi terpisah dari pemilik.

## C. Temuan spesifik source yang menentukan pekerjaan

1. `src/pages/PublicLibrary.tsx` (323 baris) menampung Home, Listing/Temukan, Koleksi, Detail, dan Tentang. Ekstraksi komponen **opsional** bila benar-benar mengurangi konflik; jangan melakukan rewrite seluruh halaman.
2. Beranda sudah memiliki intro, Lanjut Membaca, Cerita Pilihan, dan Bab Baru. Fokus pada hierarki, bukan menambah hero besar.
3. Temukan sudah mempunyai pengumuman/kabar nyata, pencarian, filter status/genre, dan sort. Filter **Berlangsung** saat ini memilih semua yang tidak `completed`, termasuk `hiatus`; label/semantiknya perlu diperjelas.
4. Koleksi saat ini adalah bookmark lokal `katakecil:v6:collection`, dengan filter progres lokal. **Belum ada riwayat membaca penuh atau sinkronisasi lintas perangkat**; jangan mengklaim ada.
5. `readProgress()` membaca metadata `kk-secure-progress-${book.id}`; Reader menyimpan `ep`, `part`, `offset`, dan `updatedAt`, bukan isi naskah.
6. Tombol **Lanjut Membaca** harus membuka `/baca/:slug` **tanpa** `?episode`, karena Reader memulihkan offset. Pemilihan bab eksplisit tetap menggunakan `?episode=N` dan dimulai dari awal bab.
7. `FeaturedHeroCarousel.tsx` masih berada di source tetapi tidak digunakan oleh `PublicLibrary.tsx` aktif; jangan menghabiskan waktu merombak komponen yang tidak terpakai.
8. Kegagalan `getPublicLibrary()` saat ini dapat menampilkan pesan error bersamaan dengan empty state generik; perlu state error/retry yang jelas dan terpisah dari katalog kosong.
9. `PublicHeader.tsx` menampilkan tombol Studio di header publik. Usulan UX: turunkan prominensinya atau pindahkan ke menu sekunder; route `/studio` tetap tersedia dan **tetap dilindungi auth/RLS**. Ini keputusan UI, bukan mekanisme keamanan.
10. `StudioOverview.tsx` sudah memiliki resume draft, quick actions, statistik episode riil, daftar karya, alur penerbitan, dan jadwal. **Polish**, jangan bangun dashboard baru.
11. `ChapterEditor.tsx` memiliki autosave berantre, flush sebelum navigasi, konfirmasi publikasi, mode fokus, preview, dan retry. Bagian-bagian tersebut sensitif terhadap regresi.
12. `AnnouncementManager.tsx` menggunakan input datetime zona waktu perangkat dan menampilkan tanggal dalam WIB. Pastikan label jelas dan uji konversi lintas zona waktu.
13. Pengumuman membutuhkan migrasi `supabase/migrations/20261014010000_v7_public_announcements.sql` bila belum diterapkan pada staging. V7.1 **tidak merencanakan migrasi baru**.
14. Halaman Tentang memuat nama dan teks penulis statis; tidak mengubah identitas/konten tanpa persetujuan pemilik.

## D. Pembagian tanggung jawab lima persona

### Nara — Visual Guardian (pemilik design system)

**Karakter keputusan:** konservatif pada identitas, ketat pada konsistensi.  
**Tugas:** audit spacing, hierarchy, radius, tipografi, cover ratios, fokus, light/dark, dan CSS cascade; membuat pedoman visual singkat; mendukung Raka/Kirana dalam implementasi tampilan.  
**File utama:**

- `src/design/sapphire-tokens.css` — review token, ubah hanya jika perlu dan terbukti.
- `src/design/v70-alpha.css`, `src/design/v70-alpha2.css`, `src/design/v70-beta1.css`, `src/design/v70-beta2.css` — koreksi selektif yang relevan; tidak menghapus aturan legacy massal.
- `src/components/BrandLogo.tsx`, `src/components/BrandIcon.tsx`, `src/components/Cover.tsx` — review dan perbaikan presentasi bila ditemukan masalah.
- Jika benar-benar perlu stylesheet baru, gunakan nama semantik seperti `src/design/public-experience.css` dan `src/design/studio-experience.css` dengan import terkendali oleh Bima; jangan membuat `v71.css` generik.

**Tidak boleh:** mengganti palet utama, cover asli, ikon brand, atau mengubah Reader Engine.  
**Reviewer:** Raka (publik), Kirana (Studio), Bima (cascade/integrasi), Tara (aksesibilitas).

### Raka — Reader Advocate (pemilik public experience)

**Karakter keputusan:** mobile-first, mengurangi beban kognitif pembaca.  
**File utama:**

- `src/pages/PublicLibrary.tsx`
- `src/components/public/PublicHeader.tsx`
- `src/features/public/components/StoryCard.tsx`
- `src/features/public/components/LibraryUI.tsx`
- `src/features/public/components/DiscoveryNotices.tsx`
- `src/features/public/collectionFilters.ts` (hanya bila logika filter perlu koreksi)

**Paket pekerjaan:**

- **PUB-01 Beranda:** intro lebih ringkas, CTA jelas, Lanjut Membaca mudah ditemukan, cover pilihan dan Bab Baru tidak bertabrakan pada mobile; tidak menambah konten fiktif.
- **PUB-02 Temukan:** susun prioritas pengumuman → pencarian → filter → hasil, perjelas status termasuk hiatus, reset filter lengkap, empty search yang informatif.
- **PUB-03 Koleksi:** perjelas status bookmark/progres, akses langsung melanjutkan membaca bila ada progres valid, dan empty state dengan CTA ke Temukan. Tidak menambah riwayat/download yang belum ada.
- **PUB-04 Detail Cerita:** perjelas tombol Mulai/Lanjut, status cerita, jumlah bab, prolog/Bab 0, daftar bab, dan metadata jadwal.
- **PUB-05 Navigasi:** audit header dan bottom nav, active state, pencarian mobile, fokus, safe area, serta opsi menyederhanakan entry Studio di publik.
- **PUB-06 Error UX:** pisahkan loading, empty catalog, network error, dan retry. Retry harus mengulang query yang relevan tanpa memalsukan data.

**Reviewer:** Nara (visual), Bima (query/route/progress), Tara (QA).

### Kirana — Writer's Partner (pemilik Studio experience)

**Karakter keputusan:** efisiensi menulis dan penerbitan, bukan penambahan fitur.  
**File utama:**

- `src/features/studio/components/StudioOverview.tsx`
- `src/features/studio/components/StudioNavigation.tsx`
- `src/features/studio/components/BookManagement.tsx`
- `src/features/studio/components/ChapterEditor.tsx` (**hanya presentasi/UX; save logic dibekukan**)
- `src/features/studio/components/AnnouncementManager.tsx`
- `src/pages/ManuscriptImporter.tsx` dan `src/pages/StudioManagement.tsx` (**hanya jika ada masalah UX yang terbukti**)

**Paket pekerjaan:**

- **STU-01 Dashboard:** pertahankan resume draft, tiga quick actions, status episode nyata; optimalkan urutan dan kerapian di 320–1440 px.
- **STU-02 Navigasi:** jelas membedakan Dashboard, Karya, Analytics, Upload, dan Alat Studio; editor tetap mengaktifkan Karya; menu alat ditutup oleh Escape, klik luar, atau navigasi, serta fokus dikembalikan.
- **STU-03 Editor:** tampilkan status `Belum disimpan` / `Menyimpan…` / `Tersimpan` / `Gagal menyimpan` secara konsisten; pastikan retry terlihat dan publikasi tidak dapat dilakukan sebelum save sukses; jaga preview dan mode fokus.
- **STU-04 Karya & bab:** cari/filter, draft/published/scheduled, penanganan daftar kosong, kejelasan tindakan berisiko.
- **STU-05 Pengumuman, jadwal, importer:** pesan konfirmasi dan kegagalan yang jelas, format WIB, pemulihan setelah kesalahan, tanpa mengubah transaksi bisnis.

**Reviewer:** Nara (visual), Bima (autosave/CRUD), Tara (QA/security).

### Bima — System Architect (pemilik integrasi dan batas data)

**Karakter keputusan:** perubahan kecil, kontrak stabil, risiko terukur.  
**File utama:**

- `src/App.tsx` — import CSS, resolusi route, integrasi saja.
- `src/pages/Studio.tsx` — batas autentikasi dan router Studio.
- `src/data/library.ts`, `src/data/announcements.ts`, `src/data/publicSchedule.ts` — hanya untuk perbaikan terukur, tidak untuk menambah fitur sosial.
- `src/utils/nav.ts`, `src/utils/collection.ts`, `src/utils/readingProgress.ts` — review kontrak, tidak mengganti key storage.
- `src/data/supabase.ts`, `src/data/secureReader.ts`, `supabase/functions/`, `supabase/migrations/` — **review/read-only secara default**.
- `package.json`, `vite.config.ts` — hanya untuk integrasi test/build yang diperlukan.

**Paket pekerjaan:**

- **SYS-01:** baseline snapshot dan daftar invariant (route, storage keys, query publik, Reader, Studio).
- **SYS-02:** memastikan pemisahan data publik/pribadi; error/retry tidak membuka akses data privat.
- **SYS-03:** mengintegrasikan CSS dan komponen tanpa selector collision atau import circular.
- **SYS-04:** mempertahankan guard `quiet:before-navigate`, flush autosave, dan rute resume Reader.
- **SYS-05:** menyiapkan lint/build/test runner, audit bundle, dan rollback yang dapat dipulihkan.

**Reviewer:** Tara (security), Nara (theme), Raka/Kirana (behavior).

### Tara — Quality Gatekeeper (pemilik acceptance dan release)

**Karakter keputusan:** tidak menganggap fixture sebagai bukti runtime, menolak regresi kritis.  
**File utama:**

- `scripts/test-v7beta1.mjs`, `scripts/test-v7beta2.mjs` — dijadikan baseline, **jangan dilemahkan**.
- `scripts/quality/check-structure.mjs`, `scripts/verify-public-build.mjs`, `scripts/audit-v7beta.mjs` — audit yang harus tetap lulus.
- `scripts/test-v71-public.mjs`, `scripts/test-v71-studio.mjs` — **file baru yang direncanakan**, dengan pengujian perilaku/kontrak yang dapat dijalankan.
- `qa/` — fixture visual ditambah bukti runtime yang dibedakan secara jelas.
- `supabase/tests/check_rls.sql` dan pengujian staging tambahan — audit read-only dan negative cases.
- `docs/RELEASE_V7_1.md`, `docs/V7_1_FILE_MANIFEST.md` — **dokumen rilis baru yang direncanakan**.

**Paket pekerjaan:** baseline screenshot React nyata, matriks viewport × tema, regression Reader, uji auth/RLS, validasi error/empty states, review aksesibilitas, dan persetujuan release candidate.  
**Reviewer:** Bima (otomasi/teknis), Raka/Kirana (alur), Nara (visual).

## E. Aturan kepemilikan file dan konflik

- Satu file hanya punya **satu editor utama** dalam satu paket kerja.
- Nara menjadi pemilik perubahan CSS; Raka dan Kirana mengajukan kebutuhan selector/class tanpa menumpuk override masing-masing.
- Bima memegang `App.tsx`, kontrak data, auth, dan wiring integrasi. Raka/Kirana tidak mengubahnya tanpa review.
- Kirana boleh mengubah markup `ChapterEditor.tsx`, tetapi bagian `save`, `flush`, `updateRelease`, dan event navigation harus tetap identik kecuali ada bug teruji dan disetujui Bima/Tara.
- Tara tidak mengubah perilaku aplikasi demi membuat tes lulus; kegagalan dikembalikan ke pemilik perubahan.
- Tim adalah **lima persona review dan pembagian kerja**, bukan lima proses AI otonom yang berjalan bersamaan.

## F. Urutan kerja satu paket V7.1

1. **G0 — Baseline & visual inventory:** screenshot runtime aplikasi asli, daftar fitur, lint/build/test baseline, inventaris risiko.
2. **G1 — Parallel design proposals:** Nara menyepakati aturan visual; Raka dan Kirana menyiapkan perubahan markup terpisah; Bima menetapkan kontrak; Tara menulis acceptance tests.
3. **G2 — Public & Studio refinement:** kerjakan pekerjaan `PUB-*` dan `STU-*` tanpa mengubah engine Reader.
4. **G3 — Integration:** Bima menggabungkan perubahan, Nara mengaudit cascade dan tema, Tara menjalankan tes kontrak.
5. **G4 — QA runtime & staging:** semua alur kritis diuji di browser dan Supabase staging, termasuk negatif RLS.
6. **G5 — Release candidate:** siapkan ZIP source lengkap, changelog, manifest, bukti tes, known issues, dan rencana rollback. **Deployment hanya dengan persetujuan terpisah.**

## G. Acceptance criteria — Public

| ID | Kriteria lulus | Bukti |
|---|---|---|
| PUB-A01 | `/`, `/temukan`, `/koleksi`, `/tentang`, `/cerita/:slug` dapat dibuka dari navigasi dan deep link | Browser runtime, reload, back/forward |
| PUB-A02 | Tidak ada horizontal overflow pada lebar 320, 375, 390, 430, 768, 1024, 1440 px di kedua tema | Screenshot dan pemeriksaan `scrollWidth <= clientWidth` |
| PUB-A03 | Header dan bottom nav tidak menutupi konten atau CTA, termasuk safe-area mobile | Visual + tap test |
| PUB-A04 | Beranda menampilkan hanya cerita terbit, Bab Baru valid, dan Lanjut Membaca jika progres tersedia | Fixture data publik + staging |
| PUB-A05 | Lanjut Membaca memulihkan **episode dan offset**; memilih bab eksplisit memulai bab yang dipilih | Uji Reader end-to-end |
| PUB-A06 | Filter genre/status/sort/search dan reset bekerja; `hiatus` tidak salah diklaim sebagai `Berlangsung` | Data uji ongoing/completed/hiatus |
| PUB-A07 | Koleksi tersimpan per browser, bookmark dapat tambah/hapus, filter progres valid; tidak ada klaim sinkronisasi akun | Reload + storage test |
| PUB-A08 | Loading, katalog kosong, tidak ada hasil, dan error jaringan mempunyai tampilan yang berbeda; retry berfungsi | Network offline/failed request test |
| PUB-A09 | Pengumuman hanya tampil dalam rentang aktif, tanpa judul bab draft atau tautan karya privat | Clock boundary + anon staging test |
| PUB-A10 | Cover asli tetap dipakai; fallback hanya saat URL kosong/gagal, dan tidak mengubah data | Visual + network fail test |
| PUB-A11 | Semua kontrol utama bisa diakses keyboard, fokus terlihat, nama aksesibel tersedia | Keyboard/screen reader spot-check |

## H. Acceptance criteria — Studio

| ID | Kriteria lulus | Bukti |
|---|---|---|
| STU-A01 | Anon dan akun bukan anggota tidak dapat membuka konten Studio atau memodifikasi tabel privat | Auth UI + query negatif Supabase |
| STU-A02 | Akun pemilik dapat masuk, keluar, berpindah menu, dan tetap berada pada halaman aktif | Browser runtime |
| STU-A03 | Dashboard memakai angka episode nyata, tanpa statistik pembaca buatan | Bandingkan dengan dataset staging |
| STU-A04 | Draft terbaru bisa dibuka dari Dashboard, tanpa kehilangan konteks karya | End-to-end Studio |
| STU-A05 | Autosave menunjukkan state benar; perubahan berturut-turut tersimpan dalam urutan benar; gagal save bisa retry | Simulasi latency/offline/restore |
| STU-A06 | Navigasi saat ada perubahan tidak tersimpan tidak menghilangkan isi; preview/mode fokus tidak merusak draft | Navigasi dan editor regression |
| STU-A07 | Publish now, schedule WIB, dan tarik draft membutuhkan konfirmasi; save gagal memblokir publish | Staging test |
| STU-A08 | Upload/import, pengelolaan karya, jadwal, pengumuman, sampah/restore tetap berfungsi | Staging smoke flows |
| STU-A09 | Menu Alat Studio mendukung Escape, klik luar, perubahan rute, dan pengembalian fokus | Keyboard test |
| STU-A10 | Mobile Studio 320–430 px tetap dapat mengakses seluruh tindakan, keyboard input tidak tertutup nav | Android/visual test |
| STU-A11 | Pengumuman terjadwal, kedaluwarsa, draft, dan WIB berperilaku benar | Boundary & timezone test |

## I. Acceptance criteria — Reader, security, visual, quality

### Reader regression (wajib 100% lulus)

- Pinch inward membuka/minimize menu; pinch outward kembali ke mode membaca sesuai perilaku baseline.
- Swipe next/previous, tap, navigasi bab, Bab 0/prolog, pagination, rotasi, perubahan font/line-height/tema, bookmark, search, daftar isi, tanda bab selesai, dan fullscreen tetap berfungsi.
- Posisi baca tersimpan dan dipulihkan; tidak ada teks naskah di `localStorage`.
- Studio preview tidak mengubah status publikasi atau konten Reader publik.
- Konten draft/terjadwal tidak dapat diambil oleh pembaca publik melalui REST atau Edge Function sebelum waktunya.

### Visual/accessibility

- Dua tema konsisten, tidak ada teks gelap pada permukaan gelap atau sebaliknya.
- Kontras teks biasa **minimal 4.5:1** dan teks besar/indikator UI **minimal 3:1** untuk komponen yang relevan.
- Target sentuh utama **minimal 44 × 44 CSS px** bila memungkinkan; tidak ada elemen interaktif tertutup.
- `prefers-reduced-motion` dihormati, tidak ada animasi wajib untuk memahami status.
- Screenshot before/after halaman utama di 390 dan 1440 px, dua tema; screenshot tambahan di 320 dan 768 px untuk masalah responsif.
- Tidak ada penggantian wordmark, ikon, atau cover asli tanpa persetujuan.

### Build dan keamanan

- `npm run check:structure`, `npm run audit:v7-theme`, `npm run audit:v7beta`, `npm run test:current`, `npm run lint`, `npm run build`: **semua PASS** setelah `npm install`.
- Tambahkan tes V7.1 ke runner, bukan mengganti atau menghapus tes historis.
- Tidak ada error fatal console, promise rejection tak tertangani, atau asset 404 pada alur kritis.
- Tidak ada `service_role`/secret di frontend; RLS/Edge Function diuji dengan anon, akun tak berwenang, dan akun penulis.
- Tidak ada migrasi skema baru kecuali kebutuhan yang terdokumentasi dan disetujui secara terpisah.
- Backup staging dan rollback source tersedia sebelum kandidat deployment.

## J. Matriks QA minimal

**Viewport:** 320, 375, 390, 430, 768, 1024, 1440 CSS px.  
**Tema:** Arctic Blue (light) dan Midnight Sapphire (dark).  
**Browser:** Chrome Android, Safari iOS (jika perangkat tersedia), Chromium desktop, Firefox desktop (spot-check).  
**Data:** tidak ada karya, satu karya, banyak karya, ongoing/completed/hiatus, draft/terjadwal/terbit, Bab 0, sampul gagal, pengumuman aktif/berakhir, progres tersimpan/tidak ada, offline/slow network.  
**Akun:** anon, authenticated non-author, authorized author.  
**Catatan:** fixture CSS dapat membantu, tetapi bukti final harus berasal dari runtime React dan staging nyata.

## K. Definition of Done / Kriteria penolakan rilis

**Rilis ditolak bila:** reader pinch/swipe/offset rusak; naskah privat bocor; autosave kehilangan teks; publikasi tidak sesuai jadwal; auth/RLS gagal; build/lint gagal; layar utama overflow/CTA tertutup; atau perubahan visual menjauh dari Sapphire tanpa persetujuan.

**Rilis dapat diajukan bila:** seluruh acceptance kritis lulus, perbedaan visual dapat dijelaskan, hasil tes dilampirkan, daftar file berubah lengkap, dan source ZIP beserta rollback siap. Keputusan deploy tetap di tangan pemilik.

## L. Deliverables implementasi berikutnya

1. ZIP source `KataKecil_V7_1_Release_Candidate.zip` (nama target, **belum dibuat**).
2. `docs/RELEASE_V7_1.md` dan `docs/V7_1_FILE_MANIFEST.md`.
3. Matriks acceptance PASS/FAIL dengan bukti dan daftar known issues.
4. Screenshot before/after dari aplikasi React runtime di kedua tema.
5. Hasil audit auth/RLS staging dan instruksi rollback.

**Status dokumen:** siap dijadikan acuan coding; source Beta.2 belum diedit dalam penyusunan spesifikasi ini.
