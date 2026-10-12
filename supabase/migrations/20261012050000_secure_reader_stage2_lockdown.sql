-- V4.2 STAGE 2/2 - SECURITY CUTOVER. DO NOT APPLY BEFORE Edge Function
-- and V4.2 frontend are deployed & tested on Preview. Back up first.
-- Prevent direct SELECT of content_md (including `select=*`) from the Data API.
-- RLS already protects unreleased rows; column privileges protect body content.
-- Author Studio uses the separately authorized `qr_author_get_episodes` RPC.
revoke select on table public.qr_episodes from public, anon, authenticated;
grant select (
 id, book_id, episode_number, arc_title, title, release_at, is_enabled,
 created_at, updated_at
) on table public.qr_episodes to anon, authenticated;
-- EDITS remain governed by the existing author-only RLS policies.
-- Never grant anon/authenticated SELECT on content_md again.

-- The V4 import function compares content hashes of existing episodes.
-- Since the caller can no longer SELECT content_md directly, that particular
-- validated operation must execute using the function owner permissions.
-- The V4 function already checks auth.uid() against qr_author_members before
-- executing SQL. Its search_path is fixed to '' to prevent shadowing.
alter function public.qr_import_drafts(text,text,text,text,jsonb) security definer;
revoke all on function public.qr_import_drafts(text,text,text,text,jsonb) from public, anon;
grant execute on function public.qr_import_drafts(text,text,text,text,jsonb) to authenticated;
