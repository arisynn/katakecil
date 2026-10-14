# V7.1 RC.1 — Acceptance Matrix

**Legenda:** `PASS` = diuji dan lulus pada lingkungan source lokal; `BLOCKED` = dependensi tidak tersedia; `NOT RUN` = perlu browser React/Supabase staging. Jangan menyamakan tes kontrak dengan QA runtime.

| Area | Kriteria | Status | Bukti / tindak lanjut |
|---|---|---|---|
| Struktur | Semua import lokal dan aset valid | PASS | `npm run check:structure` (103 source, 288 referensi) |
| Reader | Lima modul engine tidak berubah | PASS | SHA-256 baseline, `test-v71-studio` |
| Reader | Pinch, swipe, pagination, offset di Android/iOS | NOT RUN | Uji perangkat asli |
| Public | Status `ongoing`, `completed`, `hiatus` terfilter benar | PASS | `test-v71-public` unit pure function |
| Public | Katalog gagal memiliki error/retry terpisah dari empty | PASS (kontrak) | `test-v71-public`; perlu offline test React |
| Public | Tombol Koleksi resume tidak mengirim `?episode` | PASS (kontrak) | `test-v71-public` |
| Public | Search, genre, status, sort, reset pada runtime | NOT RUN | Browser React + dataset staging |
| Public | No overflow 320/375/390/430/768/1024/1440, light/dark | NOT RUN | Screenshot React runtime |
| Public | Keyboard, focus, target 44px, safe area | NOT RUN | Keyboard + device smoke |
| Studio | Filter karya dan reset bab terhubung ke state | PASS (kontrak) | `test-v71-studio` |
| Studio | Autosave flush + publish guard dipertahankan | PASS (kontrak) | Tes V6.9 + `test-v71-studio` |
| Studio | Autosave offline, retry, data tidak hilang | NOT RUN | Simulasi jaringan di staging |
| Studio | WIB input bebas timezone perangkat | PASS (helper) | Uji `fromWib`/`toWibInput`; runtime NOT RUN |
| Studio | Auth pemilik / anon / non-author, RLS negatif | NOT RUN | Akun Supabase staging diperlukan |
| Studio | Import, jadwal, pengumuman, sampah, restore | NOT RUN | Staging smoke test |
| Design | Dua tema Sapphire dan kontras token | PASS | `npm run audit:v7-theme` |
| Design | CSS tambahan hanya memakai token, bukan warna literal | PASS | `test:v71` |
| Build | Vite build produksi | BLOCKED | `vite` tidak terpasang; `npm install` membutuhkan registry |
| Types | TypeScript typecheck penuh | BLOCKED | `vite/client` dan dependensi proyek belum terpasang |
| Security | Tidak ada import naskah privat pada bundle publik (source) | PASS | `node scripts/verify-public-build.mjs` |
| Security | Negative RLS, edge functions, published-only akses | NOT RUN | Supabase staging + anon/non-author |

**Release gate:** status produksi harus tetap **HOLD** sampai seluruh item kritis `NOT RUN`/`BLOCKED` telah diverifikasi dan lulus.
