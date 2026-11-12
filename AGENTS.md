# Panduan agent KataKecil

## Skill proyek

Untuk tugas penataan UI Pengaturan, reader, atau tema, baca skill yang sesuai sebelum bekerja. Pilih berdasarkan lingkup tugas; jangan menjalankan semua skill untuk setiap perubahan. Skill koordinator memuat alur swarm, dan brief bersama memuat konteks serta pembagian file.

| Peran | Skill |
| --- | --- |
| Agent utama: komando, rencana, prompt dan review | [.agents/skills/katakecil-ui-coordinator/SKILL.md](.agents/skills/katakecil-ui-coordinator/SKILL.md) |
| Audit dan pengelompokan UI | [.agents/skills/katakecil-ui-audit/SKILL.md](.agents/skills/katakecil-ui-audit/SKILL.md) |
| Pengaturan aplikasi | [.agents/skills/katakecil-app-settings/SKILL.md](.agents/skills/katakecil-app-settings/SKILL.md) |
| Reader, tema dan alat baca | [.agents/skills/katakecil-reader-layout/SKILL.md](.agents/skills/katakecil-reader-layout/SKILL.md) |
| Pemeriksaan UI dan integrasi | [.agents/skills/katakecil-ui-review/SKILL.md](.agents/skills/katakecil-ui-review/SKILL.md) |

Brief: [docs/plans/ui-settings-redesign.md](docs/plans/ui-settings-redesign.md).

Persiapan skill selesai, lalu pengguna memberi instruksi **Lanjutkan implementasi**. Audit/swarm dan implementasi penataan UI dalam brief kini diizinkan. Lanjutkan dalam lingkup tersebut tanpa meminta konfirmasi yang sama lagi. Skill tidak memberi izin tersendiri untuk push, build APK, publikasi release, atau penulisan ke backend.

## Kebiasaan proyek

- Periksa perubahan lokal dan instruksi pengguna terbaru sebelum mengedit; pertahankan pekerjaan pengguna.
- Frontend berada di `dist/`; helper TypeScript berada di `src/`. Jangan menimpa bundle hasil build dengan perubahan manual; ubah sumber helper lalu jalankan build bila helper berubah.
- Pertahankan nama key preferensi, default, ID/data-action yang dipakai handler, posisi baca, backup dan data lokal kecuali perubahan perilaku itu diminta.
- Pengujian cukup terarah dan singkat. Jangan menjalankan suite penuh atau build Android untuk perubahan dokumentasi.
- Jangan menaruh token, kunci signing, password, ZIP pribadi atau aset EPUB pribadi dalam source maupun laporan. Gunakan fixture lokal untuk pengujian Publisher; jangan menerbitkan buku produksi sebagai uji.
