-- Read-only check before V4 migration. Keep results private.
select table_name from information_schema.tables where table_schema='public' and table_name in ('qr_episodes','qr_books','qr_author_members','qr_release_rules','qr_import_batches') order by table_name;
select count(*) as total_episodes,
  count(*) filter(where is_enabled and release_at is not null and release_at > now()) as future_scheduled,
  count(*) filter(where is_enabled and release_at is not null and release_at <= now()) as released,
  count(*) filter(where is_enabled = false or release_at is null) as drafts
from public.qr_episodes;
select book_id, episode_number, release_at, is_enabled from public.qr_episodes order by book_id,episode_number;
