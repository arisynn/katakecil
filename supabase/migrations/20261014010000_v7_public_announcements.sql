-- KataKecil V7.0 Alpha.3: Studio-managed public announcements.
-- ADDITIVE migration. Run on staging and review RLS before production.
-- A published announcement is visible only during its active date window.
-- Linking a book never makes an unpublished/private book discoverable.

create table if not exists public.qr_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  body text not null default '' check (char_length(body) <= 320),
  book_id text references public.qr_books(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft','published')),
  starts_at timestamptz not null default now(),
  ends_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint qr_announcements_valid_window check (ends_at is null or ends_at > starts_at)
);
create index if not exists qr_announcements_public_window_idx
  on public.qr_announcements (starts_at desc, ends_at)
  where status = 'published';

alter table public.qr_announcements enable row level security;
revoke all on public.qr_announcements from public, anon, authenticated;
grant select on public.qr_announcements to anon, authenticated;
grant insert, update, delete on public.qr_announcements to authenticated;
grant all on public.qr_announcements to service_role;

drop policy if exists "V7: public active announcements" on public.qr_announcements;
create policy "V7: public active announcements" on public.qr_announcements
  for select to anon, authenticated
  using (
    status = 'published' and starts_at <= now()
    and (ends_at is null or ends_at > now())
    and (
      book_id is null or exists (
        select 1 from public.qr_books b
        where b.id = book_id and b.is_published = true and b.deleted_at is null
      )
    )
  );

drop policy if exists "V7: author reads announcements" on public.qr_announcements;
create policy "V7: author reads announcements" on public.qr_announcements
  for select to authenticated
  using (exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));

drop policy if exists "V7: author creates announcements" on public.qr_announcements;
create policy "V7: author creates announcements" on public.qr_announcements
  for insert to authenticated
  with check (exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));

drop policy if exists "V7: author edits announcements" on public.qr_announcements;
create policy "V7: author edits announcements" on public.qr_announcements
  for update to authenticated
  using (exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));

drop policy if exists "V7: author deletes announcements" on public.qr_announcements;
create policy "V7: author deletes announcements" on public.qr_announcements
  for delete to authenticated
  using (exists (select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));

drop trigger if exists qr_announcements_updated_at on public.qr_announcements;
create trigger qr_announcements_updated_at before update on public.qr_announcements
for each row execute function public.qr_touch_updated_at();

comment on table public.qr_announcements is
  'Public notices managed by authorized Studio members; scheduled visibility enforced by RLS.';
