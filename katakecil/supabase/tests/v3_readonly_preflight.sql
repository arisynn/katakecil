-- READ ONLY; safe to run on the original live V1 project before migrating.
-- Does not include content_md (private manuscripts) or change data.
select book_id, count(*) as episodes_total,
  count(*) filter (where is_enabled and release_at <= now()) as already_released,
  count(*) filter (where is_enabled and release_at > now()) as scheduled_future,
  count(*) filter (where not is_enabled or release_at is null) as drafts,
  min(release_at) as earliest_release, max(release_at) as latest_release
from public.qr_episodes group by book_id order by book_id;

-- Download/export this result to CSV, and save it in a private place before migration.
select book_id, episode_number, title, release_at, is_enabled
from public.qr_episodes order by book_id, episode_number;

-- New Studio tables from V2/V3 must exist AFTER their migrations:
select table_name from information_schema.tables
where table_schema='public'
  and table_name in ('qr_episodes','qr_books','qr_author_members','qr_release_rules','qr_publication_logs')
order by table_name;
