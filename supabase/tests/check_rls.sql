-- V2 Public Reader RLS smoke test. Run AFTER applying both migrations in Supabase SQL Editor.
-- Executed inside a transaction: all test records are rolled back.
begin;
insert into public.qr_books (id, slug, title, is_published)
values ('rls-test-book', 'rls-test-book', 'RLS Test Only', true);
insert into public.qr_episodes (book_id, episode_number, title, content_md, release_at, is_enabled)
values
  ('rls-test-book', 1, 'visible', 'past visible content', now() - interval '1 day', true),
  ('rls-test-book', 2, 'future', 'HIDDEN FUTURE CONTENT', now() + interval '1 day', true),
  ('rls-test-book', 3, 'disabled', 'HIDDEN DISABLED CONTENT', now() - interval '1 day', false),
  ('rls-test-book', 4, 'unscheduled', 'HIDDEN UNSCHEDULED CONTENT', null, true);

set local role anon;
do $$
declare row_count integer; visible_title text;
begin
  select count(*), max(title) into row_count, visible_title
  from public.qr_episodes where book_id = 'rls-test-book';
  if row_count <> 1 or visible_title <> 'visible' then
    raise exception 'Anon RLS FAILED: expected only released row; got count=% title=%', row_count, visible_title;
  end if;
end $$;
reset role;

set local role authenticated;
do $$
declare row_count integer;
begin
  -- Without a logged-in author, authenticated readers must not see drafts.
  select count(*) into row_count from public.qr_episodes where book_id = 'rls-test-book';
  if row_count <> 1 then
    raise exception 'Reader RLS FAILED: expected only released row; got %', row_count;
  end if;
end $$;
reset role;

update public.qr_books set is_published = false where id = 'rls-test-book';
set local role anon;
do $$
declare row_count integer;
begin
  select count(*) into row_count from public.qr_episodes where book_id = 'rls-test-book';
  if row_count <> 0 then raise exception 'Unpublished book exposed % episodes', row_count; end if;
end $$;
reset role;
rollback;
