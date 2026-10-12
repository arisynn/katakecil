-- KataKecil / Personal Fiction Library V2
-- APPLY manually to your existing Supabase project after reviewing the README.
-- CRITICAL: add your existing Auth user ID as an author in SQL Editor (never in public JS).

create table if not exists public.qr_author_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.qr_author_members enable row level security;
revoke all on public.qr_author_members from public, anon, authenticated;
grant select on public.qr_author_members to authenticated;
grant all on public.qr_author_members to service_role;
drop policy if exists "Studio: members can verify own membership" on public.qr_author_members;
create policy "Studio: members can verify own membership"
  on public.qr_author_members for select to authenticated
  using (user_id = (select auth.uid()));
-- No client INSERT/UPDATE/DELETE policy: membership can only be provisioned by a privileged administrator.

create table if not exists public.qr_books (
  id text primary key,
  slug text not null unique,
  title text not null,
  synopsis text not null default '',
  genre text not null default 'Fiksi',
  cover_url text,
  status text not null default 'ongoing' check (status in ('ongoing','completed','hiatus')),
  is_published boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qr_book_slug_format check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);
-- Bring previously imported novels into the new library without copying any private manuscript content.
insert into public.qr_books (id,slug,title,is_published,is_featured)
select book_id, book_id, initcap(replace(book_id, '-', ' ')), true, true
from (select distinct book_id from public.qr_episodes) as previous_books
where book_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
on conflict (id) do nothing;

alter table public.qr_books enable row level security;
revoke all on public.qr_books from public, anon, authenticated;
grant select on public.qr_books to anon, authenticated;
grant insert, update on public.qr_books to authenticated;
grant all on public.qr_books to service_role;
drop policy if exists "Library: readers see published books" on public.qr_books;
create policy "Library: readers see published books"
  on public.qr_books for select to anon, authenticated using (is_published = true);
drop policy if exists "Studio: author sees all books" on public.qr_books;
create policy "Studio: author sees all books"
  on public.qr_books for select to authenticated
  using (exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));
drop policy if exists "Studio: author creates books" on public.qr_books;
create policy "Studio: author creates books"
  on public.qr_books for insert to authenticated
  with check (exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));
drop policy if exists "Studio: author updates books" on public.qr_books;
create policy "Studio: author updates books"
  on public.qr_books for update to authenticated
  using (exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));
-- Intentionally no DELETE policy for books: unpublish instead; prevents accidental manuscript loss.

-- Keep V1 released-only policy. Author gets a separate strictly authenticated read/write policy.
alter table public.qr_episodes enable row level security;
grant select on public.qr_episodes to anon, authenticated;
grant insert, update, delete on public.qr_episodes to authenticated;
drop policy if exists "Studio: author reads all episodes" on public.qr_episodes;
create policy "Studio: author reads all episodes"
  on public.qr_episodes for select to authenticated
  using (exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));
drop policy if exists "Studio: author creates episodes" on public.qr_episodes;
create policy "Studio: author creates episodes"
  on public.qr_episodes for insert to authenticated
  with check (exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));
drop policy if exists "Studio: author edits episodes" on public.qr_episodes;
create policy "Studio: author edits episodes"
  on public.qr_episodes for update to authenticated
  using (exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));
drop policy if exists "Studio: author deletes episodes" on public.qr_episodes;
create policy "Studio: author deletes episodes"
  on public.qr_episodes for delete to authenticated
  using (exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));

-- Episode releases are still filtered at the database boundary for unauthenticated readers.
-- Defensively require the referenced book to be public to prevent direct API access
-- to unpublished books. Public catalog only selects metadata, never content_md.
drop policy if exists "Quiet Reader: read released episodes only" on public.qr_episodes;
create policy "Quiet Reader: read released episodes only"
  on public.qr_episodes for select to anon, authenticated
  using (
    is_enabled = true and release_at is not null and release_at <= now()
    and exists (select 1 from public.qr_books b where b.id = book_id and b.is_published = true)
  );

-- Public artwork only, not manuscript attachments.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('story-covers', 'story-covers', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "Library: author upload covers" on storage.objects;
create policy "Library: author upload covers" on storage.objects for insert to authenticated
with check (bucket_id = 'story-covers' and exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));
drop policy if exists "Library: author modify covers" on storage.objects;
create policy "Library: author modify covers" on storage.objects for update to authenticated
using (bucket_id = 'story-covers' and exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())))
with check (bucket_id = 'story-covers' and exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));
drop policy if exists "Library: author delete covers" on storage.objects;
create policy "Library: author delete covers" on storage.objects for delete to authenticated
using (bucket_id = 'story-covers' and exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));
-- Public bucket delivers public image URL. No draft manuscript is stored in this bucket.

-- Track metadata changes for newest-first catalog.
create or replace function public.qr_touch_updated_at() returns trigger language plpgsql
set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end; $$;
revoke all on function public.qr_touch_updated_at() from public, anon, authenticated;
drop trigger if exists qr_books_updated_at on public.qr_books;
create trigger qr_books_updated_at before update on public.qr_books
for each row execute function public.qr_touch_updated_at();
drop trigger if exists qr_episodes_updated_at on public.qr_episodes;
create trigger qr_episodes_updated_at before update on public.qr_episodes
for each row execute function public.qr_touch_updated_at();

-- Provision *your own* existing Auth user after running this migration:
-- insert into public.qr_author_members(user_id) values ('YOUR_AUTH_USER_UUID');
-- Do not execute the example above until the UUID is replaced.
