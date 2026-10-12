#!/data/data/com.termux/files/usr/bin/bash
# KataKecil V4.2 conservative staged security migration. Run from the extracted project.
set -Eeuo pipefail
umask 077
MODE=${1:---check}
case "$MODE" in --check|--stage1|--stage2) ;; *) echo 'Gunakan --check, --stage1, atau --stage2'; exit 2;; esac
BASE="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
ONE="$BASE/supabase/migrations/20261012040000_secure_reader_stage1.sql"
TWO="$BASE/supabase/migrations/20261012050000_secure_reader_stage2_lockdown.sql"
for f in "$ONE" "$TWO"; do test -s "$f" || { echo "Migrasi hilang: $f"; exit 1; }; done
for t in psql pg_dump pg_restore; do command -v "$t" >/dev/null || { echo "Install dulu: pkg install postgresql"; exit 1; }; done
printf 'KataKecil V4.2 Secure Reader • %s\n' "$MODE"
read -r -p 'URL PostgreSQL TANPA password: ' DB_URL
[[ "$DB_URL" =~ ^postgres(ql)?:// ]] || { echo 'URL harus postgresql://'; exit 1; }
[[ "$DB_URL" == *@* ]] || { echo 'URL tidak punya @'; exit 1; }
USERINFO="${DB_URL#*://}"; USERINFO="${USERINFO%%@*}"
[[ "$USERINFO" != *:* ]] || { echo 'Jangan masukkan password di URL'; exit 1; }
read -r -s -p 'Password database: ' PGPASSWORD; echo
export PGPASSWORD PGSSLMODE=require PGCONNECT_TIMEOUT=15
trap 'unset PGPASSWORD DB_URL PGSSLMODE PGCONNECT_TIMEOUT' EXIT
psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -Atqc 'select current_database(),current_user' || exit 1
CHECK="select (to_regprocedure('public.qr_author_get_episodes(integer,integer)') is not null)::int, (not has_column_privilege('anon','public.qr_episodes','content_md','SELECT'))::int;"
STATE="$(psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -AtF '|' -c "$CHECK")"
echo "Status (Stage1|Stage2): $STATE"
psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -c "select count(*) as episodes, count(*) filter(where is_enabled and release_at>now()) as jadwal_mendatang from public.qr_episodes;"
[[ "$MODE" != '--check' ]] || { echo 'Hanya pemeriksaan; tidak ada perubahan.'; exit 0; }
[[ "$STATE" != '1|1' ]] || { echo 'Stage 1 + Stage 2 sudah terpasang.'; exit 0; }
if [[ "$MODE" == '--stage1' ]]; then
 [[ "$STATE" == '0|0' ]] || { echo 'Stage 1 sudah terpasang / status tidak konsisten.'; exit 1; }
 FILE="$ONE"; CONFIRM=TAHAP1
else
 [[ "$STATE" == '1|0' ]] || { echo 'Stage 1 belum terpasang; jangan tutup akses sekarang.'; exit 1; }
 echo 'PERINGATAN: Stage 2 akan memutus reader V4.1 dan semua frontend yang masih memakai select(content_md).'
 echo 'Lanjutkan HANYA setelah Edge Function dan V4.2 terbukti berfungsi pada Vercel Preview.'
 read -r -p 'Ketik SUDAH_UJI_PREVIEW untuk lanjut: ' OK
 [[ "$OK" == 'SUDAH_UJI_PREVIEW' ]] || { echo 'Batal'; exit 0; }
 FILE="$TWO"; CONFIRM=KUNCI
fi
D="$HOME/katakecil-backups/v42-$(date +%Y%m%d-%H%M%S)-${MODE#--}"; mkdir -p "$D";chmod 700 "$D"
SQL="COPY (SELECT id::text,book_id,episode_number,release_at::text,is_enabled::text FROM public.qr_episodes ORDER BY book_id,episode_number,id) TO STDOUT WITH CSV HEADER"
psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -c "$SQL" > "$D/before.csv"
echo "Membuat backup: $D/episodes.dump"
pg_dump -w --format=custom --no-owner --no-acl --table=public.qr_episodes --table=public.qr_books --table=public.qr_author_members --file="$D/episodes.dump" "$DB_URL"
pg_restore --list "$D/episodes.dump" >/dev/null
[[ -s "$D/episodes.dump" ]] || exit 1
read -r -p "Backup selesai. Ketik $CONFIRM untuk menjalankan: " OK
[[ "$OK" == "$CONFIRM" ]] || { echo 'Batal'; exit 0; }
psql -X -w -v ON_ERROR_STOP=1 --single-transaction "$DB_URL" -f "$FILE"
psql -X -w -q -v ON_ERROR_STOP=1 "$DB_URL" -c "$SQL" > "$D/after.csv"
cmp -s "$D/before.csv" "$D/after.csv" || { echo 'BAHAYA: snapshot tanggal/episode berubah. Audit segera.'; exit 1; }
chmod 600 "$D"/*
echo "SUKSES ${MODE}: Episode dan jadwal lama identik. Backup: $D"
