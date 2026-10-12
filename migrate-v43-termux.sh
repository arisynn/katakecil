#!/data/data/com.termux/files/usr/bin/bash
# V4.3 adds Episode 0 acceptance only; leaves old episodes and schedules intact.
set -Eeuo pipefail
umask 077
MODE="${1:---check}"
[[ "$MODE" == '--check' || "$MODE" == '--apply' ]] || { echo 'Gunakan --check atau --apply'; exit 2; }
BASE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
SQL="$BASE/supabase/migrations/20261012060000_episode_zero_v43.sql"
[[ -s "$SQL" ]] || { echo 'SQL migrasi V4.3 tidak ditemukan'; exit 1; }
for tool in psql pg_dump pg_restore; do command -v "$tool" >/dev/null || { echo 'Install dulu: pkg install postgresql'; exit 1; }; done
printf 'KataKecil V4.3 Episode 0 • %s\n' "$MODE"
read -r -p 'URL PostgreSQL TANPA password: ' DB_URL
[[ "$DB_URL" =~ ^postgres(ql)?:// && "$DB_URL" == *@* ]] || { echo 'URL PostgreSQL salah.'; exit 1; }
NAME="${DB_URL#*://}"; NAME="${NAME%%@*}"
[[ "$NAME" != *:* ]] || { echo 'Hapus password dari URL, password diminta tersendiri.'; exit 1; }
read -r -s -p 'Password database: ' PGPASSWORD; echo
export PGPASSWORD PGSSLMODE=require PGCONNECT_TIMEOUT=15
trap 'unset PGPASSWORD DB_URL PGSSLMODE PGCONNECT_TIMEOUT' EXIT
psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -Atqc 'select current_database(),current_user'
STAGE="$(psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -Atqc "select (to_regprocedure('public.qr_author_get_episodes(integer,integer)') is not null)::int, (not has_column_privilege('anon','public.qr_episodes','content_md','SELECT'))::int")"
CHECK="$(psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -Atqc "select pg_get_constraintdef(oid) from pg_constraint where conrelid='public.qr_episodes'::regclass and conname='qr_episodes_episode_number_check'")"
echo "Keamanan (Stage 1 | Stage 2): ${STAGE//|/ | }"
echo "Batas nomor episode: $CHECK"
psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -c 'select count(*) as episodes, count(*) filter (where is_enabled and release_at>now()) as jadwal_mendatang from public.qr_episodes'
[[ "$MODE" == '--apply' ]] || { echo 'Mode cek selesai. Database tidak diubah.'; exit 0; }
[[ "$STAGE" == '1|0' ]] || { echo 'Hentikan: V4.3 hanya untuk Stage 1 aktif dan Stage 2 belum diterapkan.'; exit 1; }
[[ "$CHECK" != *'episode_number >= 0'* ]] || { echo 'Episode 0 sudah didukung; tidak perlu migrasi ulang.'; exit 0; }
[[ "$CHECK" == *'episode_number > 0'* ]] || { echo 'Constraint tidak sesuai dengan yang diharapkan. Audit manual dulu.'; exit 1; }
BACKUP="$HOME/katakecil-backups/v43-$(date +%Y%m%d-%H%M%S)";mkdir -p "$BACKUP";chmod 700 "$BACKUP"
SNAP='COPY (SELECT id::text,book_id,episode_number,release_at::text,is_enabled::text,md5(content_md) FROM public.qr_episodes ORDER BY book_id,episode_number,id) TO STDOUT WITH CSV HEADER'
psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -c "$SNAP" > "$BACKUP/before.csv"
pg_dump -w --format=custom --no-owner --no-acl --table=public.qr_episodes --table=public.qr_books --table=public.qr_import_batches --file="$BACKUP/episodes.dump" "$DB_URL"
pg_restore --list "$BACKUP/episodes.dump" >/dev/null
[[ -s "$BACKUP/episodes.dump" ]] || { echo 'Backup gagal.'; exit 1; }
echo "Backup aman: $BACKUP/episodes.dump"
read -r -p 'Ketik EPISODE0 untuk melanjutkan: ' OK
[[ "$OK" == 'EPISODE0' ]] || { echo 'Dibatalkan'; exit 0; }
psql -X -w --single-transaction -v ON_ERROR_STOP=1 "$DB_URL" -f "$SQL"
psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -c "$SNAP" > "$BACKUP/after.csv"
cmp -s "$BACKUP/before.csv" "$BACKUP/after.csv" || { echo 'Snapshot berbeda! Audit segera, jangan lanjut deploy.'; exit 1; }
chmod 600 "$BACKUP"/*
echo "SUKSES: Episode 0 kini diizinkan, naskah dan jadwal lama identik. Backup: $BACKUP"
