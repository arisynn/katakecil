-- Quiet Reader v2: reader access is restricted by PostgreSQL server time.
-- Execute in the Supabase SQL Editor (or apply as a migration).
-- The public API must NEVER provide unpublished manuscripts to the browser.
create table if not exists public.qr_episodes (
  id uuid primary key default gen_random_uuid(),
  book_id text not null,
  episode_number integer not null check (episode_number > 0),
  arc_title text not null default '',
  title text not null,
  content_md text not null,
  release_at timestamptz,
  is_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (book_id, episode_number)
);

-- Restrict exposed API roles to read-only. No reader write permissions.
revoke all on table public.qr_episodes from public, anon, authenticated;
grant usage on schema public to anon, authenticated, service_role;
grant select on table public.qr_episodes to anon, authenticated;
grant all on table public.qr_episodes to service_role;

alter table public.qr_episodes enable row level security;
drop policy if exists "Quiet Reader: read released episodes only" on public.qr_episodes;
create policy "Quiet Reader: read released episodes only"
  on public.qr_episodes for select to anon, authenticated
  using (
    is_enabled = true
    and release_at is not null
    and release_at <= now()
  );

comment on table public.qr_episodes is 'Novel episodes: RLS hides unscheduled, disabled and future content from anonymous readers.';
