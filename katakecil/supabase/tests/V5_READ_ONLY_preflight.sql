-- KataKecil V5 - READ ONLY. Executable before OR after the migration.
-- Keep results confidential; content fingerprints are identifiers, not public content.
select count(*) as episodes,
 count(*) filter(where is_enabled and release_at<=now()) as released,
 count(*) filter(where is_enabled and release_at>now()) as scheduled,
 count(*) filter(where not is_enabled or release_at is null) as drafts,
 count(*) filter(where episode_number=0) as episode_zero
from public.qr_episodes;
select book_id,episode_number,id,md5(content_md) as manuscript_fingerprint,
 md5(coalesce(release_at::text,'NULL')||':'||is_enabled::text) as release_fingerprint
from public.qr_episodes order by book_id,episode_number;
select to_regprocedure('public.qr_import_manuscript_v5(text,text,text,text,text,text,jsonb,jsonb)') is not null as v5_import_exists,
 to_regprocedure('public.qr_get_trash()') is not null as v5_trash_exists,
 to_regclass('public.qr_book_sections') is not null as v5_sections_exists;
select has_column_privilege('anon','public.qr_episodes','content_md','SELECT') as anon_selects_body,
 has_column_privilege('authenticated','public.qr_episodes','content_md','SELECT') as authenticated_selects_body;
