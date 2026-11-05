# Pengiriman episode dan batas perlindungan konten

5 November 2026. Baseline `a3dfe77`. **Status: implementasi di branch pengembangan, belum dipasang pada Supabase atau web produksi.** Instruksi terbaru pengguna: pembaca tanpa login; kirim satu episode utuh ketika dibuka, bukan potongan 3.000 karakter.

## Temuan audit produksi, dibaca tanpa mengubah naskah

| Jalur | Temuan | Perubahan yang disiapkan |
| --- | --- | --- |
| Storage `kk-sources` | Private; enam objek EPUB, mencakup sumber/arsip/edisi reader. Policy hanya anggota author. | Tetap private dan utuh. Reader baru tidak memakai unduhan Storage atau URL bertanda tangan. |
| `lumina-library` aktif versi3 | Berbeda dari source lokal sebelumnya: memakai kredensial server untuk menandatangani EPUB asli selama600 detik, termasuk sumber buku ongoing dan satu buku internal pada allowlist. Tidak memeriksa jadwal tiap bab. | Pensiunkan semua action dengan410, tanpa allowlist, redirect atau penandatanganan. Jalur ini berisiko melewatkan pembatasan publikasi; arsip aslinya tidak diunduh dalam audit ini. |
| `katakecil-reader` aktif versi4 | Menerapkan publikasi/revisi, tetapi mengirim seluruh EPUB terbit; dua novel tamat memakai edisi private siap baca. | Hapus action EPUB publik. Catalog metadata, sesi anonim, manifest metadata dan satu episode utuh per permintaan. |
| Data API `kk_sections` | SELECT seluruh baris diizinkan untuk anon/authenticated; RLS membatasi bab terbit, tetapi `content_html` dapat diambil langsung tanpa kuota Reader. | Cabut SELECT tabel/kolom naskah. Izinkan hanya kolom metadata yang diperlukan. Endpoint mengambil HTML melalui server, dengan otorisasi publikasi sebelum dan sesudah pemrosesan. |
| Draf/jadwal | RLS publik section adalah enabled, `release_at <= now()` dan parent published. | Pertahankan policy; catalog memakai klien publik/RLS dengan jam database. Pembacaan HTML server dibatasi ID section dari hasil tersebut. Status completed tidak membypass tanggal rilis. |
| Views/RPC/Realtime | Tidak ditemukan public view atau tabel dalam publication Realtime. RPC budget hanya service_role; fungsi yang diperiksa bukan security definer. | RPC gate baru hanya service_role, security invoker, search_path kosong. Tabel internal memakai schema private, RLS dan pencabutan grant publik. |
| Publisher | Login pemilik/membership atau publisher key diperiksa server; arsip berisi konten belum terbit memang boleh diunduh publisher. | Dipertahankan. Jangan mencabut unduhan pemilik atau menyamakannya dengan akses pembaca. |
| Cache browser/backup | Konten server sudah tidak disimpan ke IndexedDB; cache EPUB lama dipurge. Progres/anotasi dan EPUB impor pribadi tetap lokal. | Simpan hanya episode aktif dalam objek buku di memori; kosongkan saat keluar/pindah episode. Catalog/manifest hanya metadata. Kutipan highlight/catatan milik pengguna tetap dapat tersimpan/diekspor. |
| Cover/audio | `kk-covers` publik, objek yang ditemukan hanya gambar. `kk-audio` private; tidak ada fungsi audio aktif pada daftar fungsi yang diperiksa. | Cover tetap publik. Tidak menambah jalur audio atau akses naskah melalui audio. |
| Kamus/terjemahan/TTS | Alat kata mengirim pilihan terbatas setelah tindakan pengguna. Browser/OS menyediakan suara TTS, yang dapat bergantung pada layanan suara perangkat. | Tidak mengirim EPUB/buku ke layanan baru. TTS tetap per paragraf dalam episode aktif; privasi layanan suara OS bukan jaminan yang dibuat Reader. |
| GitHub/APK/aset web | Source aplikasi dan aset publik memang dapat diunduh. EPUB impor pengguna adalah milik pengguna. | Tidak menjanjikan pengamanan file yang sudah diterima klien lama; jangan memuat naskah produksi dalam aset publik/rilis. |

Temuan legacy di atas bukan klaim bahwa kebocoran kepada pihak ketiga telah dibuktikan. Bukti audit adalah source fungsi aktif dan kebijakan/grant database, tanpa mengunduh arsip asli. Perubahan ini tidak mengganti ID buku/episode, teks, cover, jadwal, atau data Publisher.

## Pilihan, batas teknis dan dampak UX

Penjelasan pilihan disampaikan kepada pengguna sebelum perubahan, lalu disesuaikan dengan permintaan satu episode utuh.

| Pilihan | Manfaat dan batas | Dampak |
| --- | --- | --- |
| Arsip private + pemeriksaan server | Menolak akses sumber/draf melalui jalur publik yang ditutup. URL bertanda tangan tetap merupakan izin mengunduh; bukan antisalinnya konten. | Publisher tetap punya unduhan sah. URL lama yang sudah diterbitkan dapat bekerja sampai kedaluwarsa; file yang sudah diterima tidak bisa ditarik kembali. |
| Episode saat dibuka | Browser tidak menerima seluruh buku. Satu episode lengkap tetap bisa direkam dari respons/DOM; beberapa episode dapat dikumpulkan. | Pagination, font, highlight, screen reader, pencarian dan TTS bekerja pada teks episode. Nomor halaman/slider berlaku per episode; persentase buku memakai panjang metadata seluruh episode. Membuka episode baru membutuhkan koneksi. |
| Sesi anonim | Mengikat kuota ke buku/revisi dan masa berlaku; tidak menambah login. Token disimpan dalam memori dan dikirim melalui header, bukan URL. | Sesi30 menit diperbarui ketika expired. Bukan identitas manusia atau bukti hak milik; bot dapat membuat sesi baru. |
| Kuota terpusat | Menghitung permintaan, semua karakter yang dikirim, episode berbeda, serta permintaan berjalan; membuat sesi baru tidak mereset kuota jaringan/global. | Burst memungkinkan resume dan navigasi biasa;429 memakai Retry-After tanpa loop retry/prefetch. NAT, pergantian jaringan, TTS cepat dan pemilihan bab berulang perlu diamati saat rollout. |
| Pencarian | Tetap lokal pada episode aktif; tidak mengunduh episode lain diam-diam. | Buka episode lain melalui daftar isi sebelum mencarinya. Pencarian seluruh buku tidak disediakan oleh perubahan ini. |
| Cache server | Maksimal dua edisi terbit yang sudah dinormalisasi di memori server, dengan pemeriksaan publikasi/revisi baru di setiap request. Tidak mengirim arsip cache. | Cold start masih merakit/membaca bagian terbit di server agar parser, judul/arc, hash dan anchor konsisten; bukan optimasi pembacaan satu row di server. Tidak ada benchmark beban produksi yang diklaim. |
| Watermark/DRM/WAF | Watermark sesi bisa dihapus dan sesi anonim tidak mengidentifikasi orang. DRM web yang memberi kunci ke klien tidak membuat teks mustahil disalin. | Tidak menambah watermark, DRM, gambar teks, CAPTCHA atau layanan WAF berbayar tanpa kebutuhan yang ditinjau. WAF di ingress dapat melengkapi proteksi resource, tetapi tidak termasuk implementasi ini. |

Pemblokiran copy/klik kanan yang sudah ada adalah pembatasan UI saja. Bukan batas keamanan baru. Konten tetap teks; tidak diubah menjadi gambar. Aksesibilitas yang sudah dibatasi pilihan UI sebelumnya tidak diklaim telah diaudit penuh dalam perubahan ini.

## Protokol dan deteksi pengambilan massal

- `GET ?action=catalog`: metadata buku dan ID section yang lolos RLS.
- `POST ?action=session&book=...&revision=...`: sesi acak256 bit tanpa akun. Hanya hash token disimpan di database.
- `GET ?action=manifest&book=...&revision=...`, header `x-reader-session`: judul, arc, href canonical, panjang dan hash episode; tanpa teks/HTML.
- `GET ?action=episode&book=...&revision=...&chapter=...`, header yang sama: teks utuh tepat satu episode. Tidak ada parameter batch/range/offset atau fallback EPUB.
- EPUB lama dan seluruh gateway lama:410. Kesalahan database/gate:503 tanpa konten. Sesi salah/kedaluwarsa:401. Publikasi berubah:409; tidak tersedia:404.
- Publikasi, parent, section terbit dan revisi diperiksa kembali sebelum respons. Konten yang sudah tampil tidak dapat dicabut dari memori/screenshot pihak pembaca.
- Respons memakai `no-store`; CORS membatasi origin browser resmi, tetapi CORS bukan autentikasi dan klien HTTP dapat mengabaikannya.

Gate PostgreSQL memakai token bucket dan row lock dengan urutan global → jaringan → sesi, berlaku lintas worker Edge. Nilai awal berikut dapat ditinjau saat rollout:

| Scope | Burst request / isi ulang per detik | Burst karakter / isi ulang per detik | Episode berbeda burst / isi ulang | Permintaan berjalan |
| --- | --- | --- | --- | --- |
| Sesi |12 /1 |60.000 /90 |12 /1 per30 detik |3 |
| Jaringan |120 /8 |240.000 /600 |60 /1 per5 detik |32 |
| Global |500 /50 |1.000.000 /5.000 |500 /5 perdetik | Dibatasi scope di atas |

Pembuatan sesi menghabiskan6 kredit request jaringan/global. Semua pengiriman, termasuk pengulangan episode yang sama, menghabiskan kredit karakter. Episode yang sama dalam10 menit tidak menghabiskan kredit episode berbeda lagi. Episode yang melebihi burst karakter boleh dibuka sekali ketika bucket penuh, lalu meninggalkan utang sesuai panjang teks; tidak dipecah atau selamanya ditolak karena panjangnya. Lease concurrent berdurasi60 detik, dilepas di finally; TTL memberi pemulihan bila worker gagal. Ini kontrol penerimaan dengan lease, bukan jaminan eksekusi fisik request lama langsung berhenti saat lease habis.

Penghitung denied/delivered dan catatan episode berbeda membantu menemukan pengambilan cepat. Ini aturan ambang, **bukan model klasifikasi bot** atau bukti pelanggaran. Tidak ada pemblokiran permanen otomatis. Tabel internal tidak menyimpan naskah, email, query pencarian, raw IP atau User-Agent. Kunci jaringan merupakan hash berpepper rahasia server yang berotasi harian. Cleanup menggunakan expiry dan batch terbatas; retention tidak dijanjikan tepat24 jam.

**Batas identitas anonim:** IP berasal dari header ingress dan merupakan sinyal best effort. Verifikasi perilaku overwrite/append `X-Forwarded-For` pada ingress produksi sebelum menganggapnya tepercaya; jangan menganggap input klien sebagai identitas. Rotasi IP/sesi, proxy bersama dan pengambilan lambat dapat melemahkan atribusi maupun kuota perjaringan. Kuota sesi/global tetap berlaku, tetapi serangan terdistribusi di bawah ambang masih dapat mengumpulkan episode. Batas yang sangat ketat untuk menghentikan itu akan merusak pembacaan publik normal.

## Implementasi dan verifikasi

Reuse: parser EPUB KataKecil yang sama disalin oleh build ke modul server dengan dependency injection; fflate menyediakan adapter ZIP; LinkeDOM ISC menjadi DOM server. Tidak mengambil UI aplikasi lain. PGlite Apache-2.0 hanya dev dependency untuk menjalankan PostgreSQL sebenarnya di tes lokal. Versi/lisensi/transitif dicatat di `OPEN_SOURCE_ATTRIBUTIONS.md`, lockfile, dan notices.

Pemeriksaan yang benar-benar dijalankan:

- Baseline terarah:27 tes anchor/pagination/TTS/gateway lulus sebelum perubahan.
- Suite Node final:98/98 lulus, termasuk PostgreSQL/PGlite untuk grant anon/authenticated, draf/future, sesi silang buku/jaringan, expiry, volume lintas sesi, episode berbeda dan concurrency admission.
- Dua tes Deno lulus: normalisasi judul/arc/UUID/teks server dan regresi sanitasi/EPUB Publisher. `deno check` reader/gateway lulus.
- Build, typecheck, check runtime graph dan diff check lulus.
- `npm audit` pada dependency tree proyek melaporkan0 kerentanan yang diketahui. Ini bukan pemeriksaan menyeluruh supply chain server/npm upstream atau bukti tidak adanya kerentanan baru.
- Chromium375px dengan seluruh respons konten di-mock: pembaca tanpa login, hanya episode0 lalu episode1 saat dipilih, refresh langsung meminta episode1, tidak ada EPUB/prefetch, IndexedDB tanpa naskah server,429 mempertahankan bacaan.
- Empat tes updater gagal juga pada worktree baseline karena fixture JSDOM tidak menyediakan requestAnimationFrame. Fixture kini memakai pretendToBeVisual; tidak mengubah updater produksi. Tes tema lama disesuaikan dengan popup custom yang sudah ada. Tes pencarian menguji larangan pengambilan episode lain secara diam-diam.
- Advisor produksi dibaca: dua INFO existing untuk tabel audio tanpa policy (akses ditolak), serta WARN leaked-password protection Auth belum aktif. Tidak mengubah konfigurasi Auth pada pekerjaan ini.

Belum dilakukan: pemasangan migrasi/fungsi ini di produksi, verifikasi efektif seluruh endpoint setelah rollout, tuning terhadap trafik nyata, uji multiworker beban tinggi, APK build/rilis baru, dan QA HP fisik. Hasil browser memakai fixture, bukan bukti keamanan deployment produksi.

## Deployment terkoordinasi dan rollback

Migrasi yang disiapkan: `supabase/migrations/20261105101452_reader_episode_delivery.sql`. Tambah schema internal, gate dan revoke akses naskah; tidak mengubah isi buku. **Jangan push commit ini ke main dengan asumsi backend sudah siap.** Preview frontend yang menunjuk backend versi4 belum bisa memakai protokol baru.

1. Minta persetujuan produksi sesuai instruksi pengguna. Simpan snapshot fungsi aktif, grant/policy/schema yang terkait dan flag bucket di lokasi privat; tidak perlu mengekspor naskah ke Git.
2. Verifikasi bucket sumber/arsip tetap private, cover publik hanya berkas gambar, tidak ada view/RPC/publication baru yang membuka naskah, serta asal header IP pada ingress. Siapkan APK dari source ini dengan signer yang sama dan versi baru; APK lama tidak kompatibel dengan penutupan action EPUB.
3. Dalam jendela perubahan singkat, pensiunkan `lumina-library` dengan410 dan pasang handler maintenance503 pada reader publik dari `supabase/maintenance/reader-unavailable.ts`. Ini menghentikan jalur edisi completed versi4 selama transisi. Terapkan migrasi, pasang reader protokol2, lalu publikasikan frontend dan rilis APK baru. Reader tetap `verify_jwt=false` agar tidak memerlukan login; pemeriksaan publikasi dan gate di dalam fungsi tetap wajib. Masa transisi memilih gagal tertutup; jangan mempertahankan fallback EPUB demi kompatibilitas.
4. Tunggu minimal600 detik sejak gateway penandatangan lama ditutup untuk expiry URL yang pernah diterbitkan, sambil menyadari unduhan lama tidak dapat ditarik kembali. Periksa konfigurasi expiry lain bila ada jalur signing di luar fungsi yang diaudit.
5. Verifikasi memakai kunci publik bahwa `content_html`/SELECT seluruh baris dan URL Storage publik ditolak; metadata tetap dapat dibaca, draf/future tidak keluar, dua jalur EPUB lama410, sesi silang buku ditolak, dan401/409/429 tidak membawa teks. Ulangi satu alur anonymous read/resume/TTS dan unduhan Publisher terotorisasi.
6. Amati rasio denied dan latensi. Jangan melonggarkan sampai menjadikan seluruh buku tersedia atau memberi akses tabel naskah. Catat false positive jaringan bersama sebelum menyesuaikan angka.

**Rollback aman:** bila gate/reader gagal, pertahankan bucket private, pencabutan SELECT naskah dan gateway410. Reader dapat dimatikan sementara dengan503 tanpa teks, lalu perbaiki maju atau rollback hanya perubahan UI yang kompatibel. Jangan memulihkan reader versi4 atau signer legacy sebagai rollback otomatis karena keduanya mengembalikan jalur yang ditutup. Simpan schema/counter sementara agar investigasi tidak hilang. Buku, UUID dan jadwal tetap utuh.

## Klaim yang boleh dan tidak boleh dibuat

Setelah deployment dan pemeriksaan efektif: akses naskah asli/draf melalui jalur publik yang diaudit ditutup; unduhan seluruh EPUB publik ditutup; pengambilan cepat melalui API episode terkena beberapa kuota terpusat. Sebelum deployment, itu masih hasil implementasi lokal.

Pembaca tetap menerima satu episode utuh. Mereka dapat menyimpan respons/DOM, memakai alat aksesibilitas, memotret layar/OCR, atau mengumpulkan episode cukup lambat/terdistribusi. File yang sudah diterima klien lama tidak hilang. Jangan menyebut konten “tidak bisa diunduh”, “tidak bisa disalin”, atau menganggap token/signed URL sebagai DRM.
