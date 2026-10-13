# KataKecil V4.5 — Desain Arsitektur, Kolaborasi 3 Persona, dan Release Gates

Versi: **4.5 review candidate**, 12 Oktober 2026. Dokumen rencana untuk menggabungkan patch V4.3 dengan repository lengkap dan menghubungkannya ke Supabase. **Bukan persetujuan untuk menulis ke database production.**

## Prinsip produk

- **Seamless reading**: satu episode dimuat sekali, halaman dihitung lokal; perpindahan halaman dalam episode tidak mengulang request.
- **No surprises**: tema, font, gestures, ukuran halaman, pencarian episode aktif, bookmark, judul, jadwal, Studio dan import EPUB tidak boleh berubah tanpa permintaan.
- **Drafts stay private**: hanya episode buku publik yang `is_enabled=true` dan `release_at <= now()` pada server boleh keluar dari API pembaca.
- **Single-episode memory**: konten episode berada sementara di memori Reader; pengaturan/progres/bookmark nonteks boleh di localStorage, teks novel tidak.
- **Graceful failure**: jika backend tidak tersedia, tunjukkan pesan jelas. Jangan otomatis fallback ke query langsung `content_md`.
- **No destructive migration**: 45 episode, 41 jadwal, 1 draft, dan penulis harus dipertahankan 1:1.

## Tiga persona AI yang bekerja bersama

### 1. ARKA — Lead Full-Stack Architect & Integrator (penanggung jawab desain alur dan coding utama)

- Mendesain kontrak `secure-episode` (index/content), state machine Reader, dependency map Vite + React, integrasi Supabase client, error fallback, dan dependency order.
- Mengkoordinasikan perubahan file/PR agar desain Reader V4.3 tidak menjadi rusak.
- Menulis kode frontend, menghindari rekayasa ulang tanpa kebutuhan. Melakukan review lintas file dan final merge.
- **Kriteria veto:** setiap solusi yang mengubah jadwal, merusak jalur Studio, atau membutuhkan penyimpanan teks di browser storage ditolak.

### 2. NARA — Supabase Backend, SQL & Security Engineer

- Penanggung jawab Edge Function, RLS, grants per kolom, JWT/anon mode, SQL migration, rate limiting, server-side validation dan threat model.
- Membuktikan dengan query read-only bahwa `content_md` tidak dapat dibaca anon setelah cutover, tetapi anggota Studio bisa lewat RPC.
- Membuat snapshot, melindungi naskah dan jadwal, serta meninjau SQL `SECURITY DEFINER` dan fungsi penulis.
- **Kriteria veto:** jangan deploy jika draf/episode terjadwal bocor, atau perubahan privilege merusak akses penulis.

### 3. LIRA — Reader UX, QA & Release Engineer

- Menentukan acceptance criteria untuk halaman baca smartphone: latensi berpindah halaman, konsistensi pagination, swipe, layar fullscreen, font, dark mode, navigasi, pencarian, dan resume bookmark.
- Membuat test unit/mocks, uji integration, mobile Android, regression matrix, serta rencana rollback.
- Menguji kondisi error (404/429/503/offline) tanpa membuka naskah yang seharusnya privat.
- **Kriteria veto:** jangan rilis saat fungsi kunci Reader gagal, data berubah, atau build/preview belum diverifikasi.

**Protokol kolaborasi:** Arka mengusulkan arsitektur → Nara mengaudit boundary keamanan → Lira membuat kasus uji sebelum merge → Arka menyatukan perubahan → Nara & Lira memberi persetujuan gate rilis. Isu yang diperdebatkan dicatat dengan bukti, bukan diputuskan berdasarkan rasa yakin. Tiga persona adalah peran kerja/review terstruktur; tidak dianggap sebagai tiga model independen yang benar-benar telah dijalankan.

## Diagram sistem target

```text
[Library / Public site]            [Studio penulis]
          |                               |
          v                               v
GET /baca/:slug                    Supabase Auth
          |                               |
          v                               v
cek buku published                qr_author_members / RLS
          |                               |
          v                               v
invoke secure-episode             qr_author_get_episodes RPC
  action=index                           |
          |                               v
          v                          Draft editor
Daftar judul terbit                      |
          |                          Auth-only updates
          v                               |
invoke secure-episode                     v
 episodeNumber=X                    qr_episodes
          |
          v
[Edge Function V4.5]
 validate ID -> rate budget -> qr_books published
          |                 |
          |                 +-- reject private book: 404
          v
qr_episodes is_enabled & release_at <= NOW (SERVER)
          |
          +-- index -> ONLY title, number, arc, release_at
          |
          +-- episode -> ONE content_md (never full novel)
          |
          v
[React SecureReaderApp]
 paginate in memory -> PageMeasurer -> gestures/bookmarks
 localStorage: only preferences + position + bookmark offset
```

## Flow engineering yang wajib diikuti

### Reader frontend

1. Route `/baca/:slug` merender buku publik saja.
2. Reader memanggil index menggunakan `action:'index'`, bukan mengambil tabel naskah di browser.
3. API memeriksa publikasi dan jam server. Jika buku privat / episode belum terbit, respons 404 tanpa isi naskah.
4. Reader memilih episode explicit dari URL, atau progress lokal, atau episode terbit pertama. Episode 0 diperlakukan sebagai angka valid, bukan falsy.
5. Reader mengambil konten satu episode, membuat `chapter` dari Markdown dan membagi halaman secara lokal.
6. Tap/swipe hanya mengubah page state, bukan memanggil backend.
7. Pergantian episode baru memanggil backend; respons lama yang datang terlambat diabaikan menggunakan request token.
8. Jika gagal/offline/rate-limited, perlihatkan error dan opsi coba ulang yang jelas, tanpa beralih ke REST konten.

### Studio

1. Supabase Auth -> validasi `qr_author_members`.
2. Untuk melihat seluruh naskah, penulis menggunakan RPC `qr_author_get_episodes`; RPC memeriksa keanggotaan di database.
3. Editing, draft dan jadwal terus mengikuti mekanisme V3/V4, bukan melewati route reader anonim.
4. Impor EPUB harus tetap melalui `qr_import_drafts` secara transaksional: draft, tanpa perubahan tanggal yang sudah ada.
5. Akses public book/cover yang lama tidak disentuh pada patch ini.

### Security & data migration

1. Baca dan backup semua row serta snapshot `md5(content_md)`, `release_at`, `is_enabled`, `episode_number`.
2. Terapkan perubahan constraint Episode 0 dengan migrasi V4.3 jika diperlukan.
3. Deploy Edge `secure-episode` V4.5 dan uji server. Siapkan `verify_jwt=false` untuk pembaca anonim, tetapi setiap request harus melewati pemeriksaan publikasi di backend.
4. Deploy frontend Preview, uji Reader dan Studio; baru promosi production.
5. Setelah lengkap dan teruji, hentikan akses `content_md` melalui kolom SELECT publik dengan **column grants**; jangan mencabut seluruh metadata yang dibutuhkan UI.
6. Uji anon, authenticated bukan-penulis, dan anggota penulis secara terpisah.
7. Jalankan lint keamanan dan dokumentasikan cara rollback privilege saja.

## Kontrak API V4.5

| Action | Request body | Success response | Failure |
|---|---|---|---|
| Index | `{bookId,action:'index'}` | `{type:'index',episodes:[...metadata]}` | 400/404/429/503 |
| Episode | `{bookId,episodeNumber:0..9999}` | `{episodeNumber,title,arc,content}` | 400/404/422/429/503 |

`Cache-Control: private, no-store, max-age=0`. Only `POST` accepted. Metadata index does NOT contain `content_md`. `READER_RATE_SALT` and Supabase secret key are used only inside Edge runtime.

## Rilis per gate

| Gate | Pemilik | Lolos hanya jika |
|---|---|---|
| G0 Audit | Arka | Repo lengkap tersedia; diff V4.3 diketahui; route Reader/Studio terpetakan |
| G1 Data | Nara | Backup selesai, snapshot 45 episode; semua 41 jadwal terlindungi |
| G2 Backend | Nara | secure-episode V4.5 deployed, anon 200 released, 404 private/future, 429 limit; no-store |
| G3 UX | Lira | mobile 5+ halaman, swipe, resume, font, fullscreen, modal, scroll, episode 0 bila ada |
| G4 Studio | Arka + Lira | author login, draft edit, importer, jadwal, metadata tetap bekerja |
| G5 Cutover | Nara | semua jalur publik metadata-only; `content_md` denied anon dan non-author; author RPC berhasil |
| G6 Production | Semua | snapshot after = before untuk konten, nomor, status, tanggal; tidak ada P0/P1 defect |

## Daftar tes minimum

- Reader: episode publik 200; nomor tak terbit/private/draft 404; request tidak valid 400; banyak permintaan 429; server env belum ada 503.
- Reader: indeks tanpa body, waktu publikasi ditentukan server, 1 request konten per episode, tidak ada API call saat swipe.
- Reader: Episode 0 terbaca bila memang sudah dilegalkan; URL `episode=0` dan progress tetap 0.
- Studio: login normal, bukan penulis tertolak, penulis tetap dapat baca/edit/save dan ekspor melalui RPC, tidak ada flicker saat picker Android.
- Database: anon tidak dapat SELECT `content_md` langsung setelah Stage 2; penulis tetap bisa melalui RPC; RLS semua tabel exposed diaudit.
- Non-regresi: 45 total episode, 3 terbit, 41 terjadwal, 1 draft pada titik audit; snapshot hash dan jadwal identik setelah tindakan (angka rilis dapat berubah alami seiring waktu, maka bandingkan row per row, bukan jumlah released saja).
- Keamanan konten: sebuah browser tidak menjamin DRM absolut; screenshot, DevTools dan tangkapan jaringan atas episode yang ditampilkan tetap mungkin.

## Scope management

**Dalam v4.5:** integrasi Edge Function, pembacaan indeks aman, strict metadata, diagnostic error, migration gate, test, dokumentasi, tidak merusak UI.

**Di luar v4.5:** redesign total, sinkronisasi progress lintas perangkat, sistem komentar, monetisasi, AI penulis, DRM absolut, dan migrasi seluruh aplikasi lain dalam proyek Supabase yang sama. Itu memerlukan persetujuan dan desain terpisah.

## Definition of Done

V4.5 baru boleh diberi label **production-ready** setelah G0-G6 lolos dengan output build, tes mobile nyata, verifikasi data server, dan rollback teruji. Paket patch ini tidak dengan sendirinya memenuhi seluruh gate tersebut.
