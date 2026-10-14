-- REVIEW ONLY: never include this file in automated migration execution.
-- Apply only AFTER: the complete repository is audited, the V4.5 endpoint and
-- frontend have passed preview and production smoke tests, and DB is backed up.
-- It modifies privilege grants only. It does not change content or release dates.
-- Requires an appropriate DB owner/admin role.
BEGIN;
DO $$
BEGIN
  IF to_regprocedure('public.qr_author_get_episodes(integer,integer)') IS NULL THEN
    RAISE EXCEPTION 'Author recovery RPC is missing. STOP stage2.';
  END IF;
  IF NOT has_function_privilege('authenticated',
    'public.qr_author_get_episodes(integer,integer)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Author recovery RPC not callable by authenticated. STOP stage2.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='qr_episodes'
      AND policyname='Quiet Reader: read released episodes only') THEN
    RAISE EXCEPTION 'Expected reader policy not found. STOP stage2.';
  END IF;
END $$;
-- A table-wide SELECT grant overrides a column-only restriction.
REVOKE SELECT ON TABLE public.qr_episodes FROM PUBLIC, anon, authenticated;
-- Preserve public metadata reads used by library cards, contents and reader.
GRANT SELECT (
  id, book_id, episode_number, arc_title, title,
  release_at, is_enabled, created_at, updated_at, deleted_at
) ON TABLE public.qr_episodes TO anon, authenticated;
-- RLS remains active: non-authors can read only released rows of published books.
COMMIT;
-- Check after commit:
-- select has_column_privilege('anon','public.qr_episodes','content_md','select'); -- FALSE
-- select has_column_privilege('authenticated','public.qr_episodes','content_md','select'); -- FALSE
-- select has_column_privilege('anon','public.qr_episodes','title','select'); -- TRUE
-- Test author RPC & editing from a real author session before declaring success.
