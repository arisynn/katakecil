-- KataKecil V6.8: public-facing schedule metadata, without draft access.
-- Additive migration: no table changes and no changes to existing RLS policies.
-- The existing qr_episodes SELECT policy continues to hide future manuscripts.
-- Only the next enabled, future release of each public, non-deleted book is exposed.
-- Never return unpublished episode titles, arc names, content, or draft records.

create or replace function public.qr_public_next_chapters()
returns table (book_id text, episode_number integer, release_at timestamptz)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct on (e.book_id)
    e.book_id,
    e.episode_number,
    e.release_at
  from public.qr_episodes as e
  join public.qr_books as b on b.id = e.book_id
  where b.is_published = true
    and b.deleted_at is null
    and e.is_enabled = true
    and e.deleted_at is null
    and e.release_at is not null
    and e.release_at > now()
  order by e.book_id, e.release_at asc, e.episode_number asc;
$$;

-- Function ownership should remain with the migration's privileged owner
-- (normally postgres in Supabase). Do not transfer ownership to anon/authenticated.
revoke all on function public.qr_public_next_chapters() from public, anon, authenticated;
grant execute on function public.qr_public_next_chapters() to anon, authenticated;
comment on function public.qr_public_next_chapters() is
  'Only book ID, chapter number and upcoming release time for enabled chapters of public books; never exposes draft content.';
