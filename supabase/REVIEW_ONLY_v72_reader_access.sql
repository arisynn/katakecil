-- V7.2 staged hardening, not part of the automatic migration chain.
-- Apply AFTER backup, V7.2 RPC migration, Edge deployment and author/reader smoke tests.
-- Existing client tabs using SELECT * on qr_episodes must be refreshed first.
-- Source: docs/v72/AUDIT_SUPABASE.md. Changes grants/policies only, never manuscript data.
BEGIN;
DO $$
BEGIN
  IF to_regprocedure('public.qr_author_episode_v72(uuid)') IS NULL
     OR to_regprocedure('public.qr_author_episode_metadata_v72(integer,integer)') IS NULL THEN
    RAISE EXCEPTION 'V7.2 author RPCs missing. STOP hardening.';
  END IF;
  IF NOT has_function_privilege('authenticated','public.qr_author_episode_v72(uuid)','EXECUTE') THEN
    RAISE EXCEPTION 'Author body RPC unavailable. STOP hardening.';
  END IF;
END $$;
-- Fail closed if the expected live policy names differ: inspect before adapting.
ALTER POLICY "Library: readers see published books" ON public.qr_books
  TO anon, authenticated USING (is_published = true AND deleted_at IS NULL);
ALTER POLICY "Quiet Reader: read released episodes only" ON public.qr_episodes
  TO anon, authenticated USING (
    deleted_at IS NULL AND is_enabled = true AND release_at IS NOT NULL AND release_at <= now()
    AND EXISTS (SELECT 1 FROM public.qr_books b
      WHERE b.id = qr_episodes.book_id AND b.is_published = true AND b.deleted_at IS NULL)
  );
ALTER TABLE public.qr_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_episodes ENABLE ROW LEVEL SECURITY;
REVOKE SELECT ON TABLE public.qr_episodes FROM PUBLIC, anon, authenticated;
-- Remove explicit body-column grants too; table revoke alone does not remove them.
REVOKE SELECT (content_md) ON public.qr_episodes FROM PUBLIC, anon, authenticated;
GRANT SELECT (id,book_id,episode_number,arc_title,title,release_at,is_enabled,is_finale,created_at,updated_at,deleted_at)
  ON public.qr_episodes TO anon, authenticated;
-- V7.4 may already be installed. Preserve its metadata-only release guard in either rollout order.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='qr_episodes' AND column_name='editor_version') THEN
    GRANT SELECT (editor_version) ON public.qr_episodes TO authenticated;
  END IF;
END $$;
-- Retain INSERT/UPDATE/DELETE privileges and author RLS; writes return metadata only.
DO $$
BEGIN
  IF has_column_privilege('anon','public.qr_episodes','content_md','SELECT')
     OR has_column_privilege('authenticated','public.qr_episodes','content_md','SELECT') THEN
    RAISE EXCEPTION 'Body still readable through inherited grants. STOP and inspect roles.';
  END IF;
END $$;
COMMIT;
