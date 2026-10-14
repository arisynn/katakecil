-- KataKecil V4.5 READ-ONLY preflight. Run from SQL editor and save results.
-- Never prints novel bodies. Row hashes are fingerprints used for change detection.
SELECT COUNT(*) AS episodes,
  COUNT(*) FILTER (WHERE is_enabled AND release_at<=NOW()) AS currently_released,
  COUNT(*) FILTER (WHERE is_enabled AND release_at>NOW()) AS scheduled,
  COUNT(*) FILTER (WHERE NOT is_enabled) AS drafts,
  COUNT(*) FILTER (WHERE episode_number=0) AS episode_zero
FROM public.qr_episodes;

SELECT book_id, episode_number, id::text, release_at, is_enabled,
       md5(content_md) AS content_fingerprint
FROM public.qr_episodes
ORDER BY book_id,episode_number,id;

SELECT c.conname,pg_get_constraintdef(c.oid) AS definition
FROM pg_constraint c
WHERE c.conrelid='public.qr_episodes'::regclass AND c.conname='qr_episodes_episode_number_check';

SELECT has_column_privilege('anon','public.qr_episodes','content_md','SELECT') AS anon_can_select_body,
       has_column_privilege('authenticated','public.qr_episodes','content_md','SELECT') AS signed_in_can_select_body,
       has_column_privilege('anon','public.qr_episodes','title','SELECT') AS anon_can_select_title;

SELECT to_regprocedure('public.qr_author_get_episodes(integer,integer)') IS NOT NULL AS author_rpc_present,
       to_regprocedure('public.qr_consume_read_budget(text)') IS NOT NULL AS read_budget_present;
