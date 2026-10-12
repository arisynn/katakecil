#!/usr/bin/env bash
# KataKecil V4 • Migrator Termux yang konservatif.
# Default: --check (read-only). Gunakan --apply setelah backup + konfirmasi.
set -Eeuo pipefail
umask 077

VERSION='KataKecil V4 Termux Migrator 1.0'
MODE="${1:---check}"
case "$MODE" in
  --check|--apply) ;;
  -h|--help)
    cat <<'HELP'
Pakai:
  bash migrate-katakecil-termux.sh --check  # cek database saja (default)
  bash migrate-katakecil-termux.sh --apply  # backup, konfirmasi, migrasi

Letakkan skrip ini di folder hasil ekstrak KataKecil V4 (selevel README.md)
atau jalankan dari folder scripts/ dalam proyek V4.

Butuh: pkg install postgresql
Pakai URL Postgres Session pooler :5432 TANPA password dalam URL.
Skrip akan menanyakan password database secara tersembunyi.
HELP
    exit 0 ;;
  *) printf 'Argumen tidak dikenal: %s\n' "$MODE" >&2; exit 2 ;;
esac

fail() { printf '\nERROR: %s\n' "$*" >&2; exit 1; }
log() { printf '\n==> %s\n' "$*"; }
cleanup() { unset PGPASSWORD DB_URL PGSSLMODE PGCONNECT_TIMEOUT || true; }
trap cleanup EXIT

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
if [[ -d "$SCRIPT_DIR/supabase/migrations" ]]; then
  ROOT="$SCRIPT_DIR"
elif [[ -d "$SCRIPT_DIR/../supabase/migrations" ]]; then
  ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
else
  fail 'Folder supabase/migrations tidak ditemukan. Ekstrak ZIP KataKecil V4, lalu taruh skrip ini di direktori utamanya.'
fi
MIGRATIONS="$ROOT/supabase/migrations"
M2="$MIGRATIONS/20261012010000_library_studio_v2.sql"
M3="$MIGRATIONS/20261012020000_publishing_management_v3.sql"
M4="$MIGRATIONS/20261012030000_smart_manuscript_import_v4.sql"
for f in "$M2" "$M3" "$M4"; do
  [[ -s "$f" ]] || fail "Berkas migrasi tidak ditemukan: $f"
done
for tool in psql pg_dump pg_restore; do
  command -v "$tool" >/dev/null 2>&1 || fail "Perintah $tool belum ada. Jalankan: pkg install postgresql"
done

printf '%s\n' "$VERSION"
printf 'Mode: %s\n' "$MODE"
printf '\nDari Supabase Dashboard → Project → Connect → Session pooler (port 5432),\n'
printf 'salin URL Postgres dan HAPUS bagian :[YOUR-PASSWORD] sebelum @.\n'
printf 'Contoh: postgresql://postgres.PROJECTREF@aws-0-region.pooler.supabase.com:5432/postgres\n'
read -r -p $'URL database TANPA password: ' DB_URL
[[ "$DB_URL" =~ ^postgres(ql)?:// ]] || fail 'URL harus diawali postgres:// atau postgresql://.'
[[ "$DB_URL" == *'@'* ]] || fail 'URL harus menyertakan user@host.'
USERINFO="${DB_URL#*://}"
USERINFO="${USERINFO%%@*}"
[[ "$USERINFO" != *':'* ]] || fail 'Jangan masukkan password di URL! Hapus :[YOUR-PASSWORD]@ atau :password@, sisakan @.'
[[ "$DB_URL" != *':6543'* ]] || fail 'Port 6543 (transaction pooler) tidak didukung. Pakai port 5432 (session pooler / direct).'
[[ ! "$DB_URL" =~ sslmode=(disable|allow|prefer) ]] || fail 'Koneksi harus menggunakan SSL (require atau verify-full).'
read -r -s -p 'Password database (tidak akan tampil): ' PGPASSWORD
printf '\n'
[[ -n "$PGPASSWORD" ]] || fail 'Password database tidak boleh kosong.'
export PGPASSWORD PGSSLMODE=require PGCONNECT_TIMEOUT=15

DB_HOST="${DB_URL#*@}"
DB_HOST="${DB_HOST%%/*}"
DB_HOST="${DB_HOST%%\?*}"
log "Memeriksa koneksi ke $DB_HOST"
psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -Atqc 'select current_database(),current_user' \
  || fail 'Koneksi Postgres gagal. Periksa project, password, dan URL Session pooler.'

# Hanya metadata skema; tidak membaca isi naskah.
read_state() {
  psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -Atqc "
select concat_ws('|',
 (to_regclass('public.qr_episodes') is not null)::int,
 (exists(select 1 from pg_policies where schemaname='public' and tablename='qr_episodes' and policyname='Quiet Reader: read released episodes only'))::int,
 (exists(select 1 from pg_tables where schemaname='public' and tablename='qr_episodes' and rowsecurity=true))::int,
 (to_regclass('public.qr_books') is not null)::int,
 (to_regclass('public.qr_author_members') is not null)::int,
 (to_regprocedure('public.qr_touch_updated_at()') is not null)::int,
 (exists(select 1 from pg_policies where schemaname='public' and tablename='qr_books' and policyname='Studio: author sees all books'))::int,
 (to_regclass('public.qr_release_rules') is not null)::int,
 (to_regclass('public.qr_publication_logs') is not null)::int,
 (to_regprocedure('public.qr_apply_release_plan(text,jsonb)') is not null)::int,
 (exists(select 1 from pg_trigger where tgname='qr_episodes_publication_audit' and not tgisinternal))::int,
 (to_regclass('public.qr_import_batches') is not null)::int,
 (to_regprocedure('public.qr_import_drafts(text,text,text,text,jsonb)') is not null)::int,
 (exists(select 1 from pg_policies where schemaname='public' and tablename='qr_import_batches' and policyname='Studio: author reads import batches'))::int
);"
}

STATE="$(read_state)"
IFS='|' read -r EP V1_POLICY V1_RLS BK MEMBERS TOUCH V2_POLICY RULES LOGS V3_RPC AUDIT BATCHES V4_RPC V4_POLICY <<< "$STATE"
[[ "$EP" == '1' ]] || fail 'qr_episodes belum ada. Skrip tidak menginisialisasi/menghapus tabel V1 agar naskah aman.'
[[ "$V1_POLICY" == '1' && "$V1_RLS" == '1' ]] || fail 'Kebijakan keamanan RLS V1 belum sesuai. Audit manual sebelum migrasi.'

validate_stage() {
  local label="$1"; shift
  local one=0 zero=0 v
  for v in "$@"; do
    if [[ "$v" == '1' ]]; then ((one+=1));
    elif [[ "$v" == '0' ]]; then ((zero+=1));
    else fail "Deteksi struktur $label tidak valid."; fi
  done
  if ((one>0 && zero>0)); then
    fail "Struktur $label sebagian terpasang. Berhenti demi keamanan; periksa skema secara manual."
  fi
  if ((one>0)); then printf 'terpasang'; else printf 'belum'; fi
}
V2="$(validate_stage V2 "$BK" "$MEMBERS" "$TOUCH" "$V2_POLICY")"
V3="$(validate_stage V3 "$RULES" "$LOGS" "$V3_RPC" "$AUDIT")"
V4="$(validate_stage V4 "$BATCHES" "$V4_RPC" "$V4_POLICY")"
[[ "$V2" == 'terpasang' || "$V3" == 'belum' ]] || fail 'V3 ada sebelum V2. Audit manual diperlukan.'
[[ "$V3" == 'terpasang' || "$V4" == 'belum' ]] || fail 'V4 ada sebelum V3. Audit manual diperlukan.'

log 'Hasil pemeriksaan struktur'
printf 'V1 (episode & RLS): terpasang\nV2 (perpustakaan): %s\nV3 (jadwal): %s\nV4 (impor EPUB): %s\n' "$V2" "$V3" "$V4"
psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -c "select count(*) as total_episodes, count(*) filter(where is_enabled and release_at>now()) as jadwal_mendatang from public.qr_episodes;"

FILES=()
if [[ "$V2" == 'belum' ]]; then FILES+=( -f "$M2" ); fi
if [[ "$V3" == 'belum' ]]; then FILES+=( -f "$M3" ); fi
if [[ "$V4" == 'belum' ]]; then FILES+=( -f "$M4" ); fi
if ((${#FILES[@]}==0)); then
  log 'Semua migrasi sudah ada. Tidak ada perubahan database.'
  exit 0
fi
if [[ "$MODE" == '--check' ]]; then
  log 'Mode cek selesai: tidak ada perubahan database.'
  printf 'Untuk menerapkan migrasi setelah menyiapkan backup Supabase, jalankan:\n  bash %q --apply\n' "$0"
  exit 0
fi

# Snapshot tanggal/jadwal yang tidak boleh berubah dan backup lengkap tabel terkait.
BACKUP_DIR="$HOME/katakecil-backups/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$BACKUP_DIR" || fail 'Gagal membuat direktori backup.'
chmod 700 "$BACKUP_DIR"
BEFORE="$BACKUP_DIR/jadwal-sebelum.csv"
AFTER="$BACKUP_DIR/jadwal-sesudah.csv"
BACKUP="$BACKUP_DIR/katakecil-before-v4.dump"
SNAPSHOT_SQL="COPY (SELECT id::text, book_id, episode_number, coalesce(to_char(release_at at time zone 'UTC','YYYY-MM-DD\"T\"HH24:MI:SS.US\"Z\"'),'NULL') as release_utc, is_enabled::text FROM public.qr_episodes ORDER BY book_id,episode_number,id) TO STDOUT WITH (FORMAT CSV, HEADER true)"
log "Mencatat jadwal lama: $BEFORE"
psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -c "$SNAPSHOT_SQL" > "$BEFORE" || fail 'Gagal membuat snapshot jadwal.'

TABLE_ARGS=(--table=public.qr_episodes)
if [[ "$V2" == 'terpasang' ]]; then
  TABLE_ARGS+=(--table=public.qr_books --table=public.qr_author_members)
fi
if [[ "$V3" == 'terpasang' ]]; then
  TABLE_ARGS+=(--table=public.qr_release_rules --table=public.qr_publication_logs)
fi
if [[ "$V4" == 'terpasang' ]]; then TABLE_ARGS+=(--table=public.qr_import_batches); fi
log "Membuat backup arsip Postgres (termasuk naskah privat): $BACKUP"
pg_dump -w --format=custom --no-owner --no-acl "${TABLE_ARGS[@]}" --file="$BACKUP" "$DB_URL" \
  || fail 'Backup database GAGAL; migrasi tidak dijalankan. Gunakan client pg_dump sesuai versi server.'
[[ -s "$BACKUP" ]] || fail 'Berkas backup kosong. Migrasi dibatalkan.'
pg_restore --list "$BACKUP" >/dev/null || fail 'Backup gagal diverifikasi. Migrasi dibatalkan.'
chmod 600 "$BACKUP" "$BEFORE"
log 'Backup berhasil. Simpan juga backup project Supabase di Dashboard sebelum produksi.'
printf 'Berkas privat: %s\n' "$BACKUP_DIR"

printf '\nMigrasi berikutnya akan diterapkan dalam SATU TRANSAKSI (rollback bila SQL gagal).\n'
printf 'Tutup Studio dan hentikan pengeditan/jadwal manual selama proses.\n'
read -r -p 'Ketik MIGRASI untuk melanjutkan (selain itu batal): ' CONFIRM
[[ "$CONFIRM" == 'MIGRASI' ]] || { printf 'Dibatalkan: tidak ada migrasi dijalankan.\n'; exit 0; }
log 'Menjalankan migrasi yang belum terpasang'
if ! psql -X -w -v ON_ERROR_STOP=1 --single-transaction "$DB_URL" "${FILES[@]}"; then
  fail 'Migrasi gagal dan transaksi SQL di-rollback. Backup tetap tersimpan.'
fi
log 'Memverifikasi episode & jadwal setelah migrasi'
psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -c "$SNAPSHOT_SQL" > "$AFTER" \
  || fail 'Migrasi terpasang tetapi gagal membaca snapshot sesudah; periksa manual!'
chmod 600 "$AFTER"
if ! cmp -s "$BEFORE" "$AFTER"; then
  fail 'PERINGATAN: snapshot episode/jadwal berbeda! Jangan deploy sebelum audit. Lihat dua CSV privat di direktori backup.'
fi
NEW_STATE="$(read_state)"
[[ "$NEW_STATE" == '1|1|1|1|1|1|1|1|1|1|1|1|1|1' ]] \
  || fail 'Migrasi SQL selesai tetapi pemeriksaan struktur tidak lengkap. Lakukan audit manual.'
log 'SUKSES: V2 + V3 + V4 terpasang; daftar episode dan jadwal lama identik.'
printf 'Backup: %s\n' "$BACKUP"
printf 'Berikutnya: daftarkan user login di qr_author_members via Supabase Dashboard, cek RLS, lalu uji Studio menggunakan EPUB dummy.\n'
