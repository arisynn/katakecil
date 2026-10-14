-- V4.2 STAGE 1/2. Apply AFTER backup and before deploying the Edge Function.
-- This stage adds protected author read RPC and shared rate-limiting state.
-- It DOES NOT change published episodes, manuscript content, or schedules.

create table if not exists public.qr_read_rate_limits (
  visitor_hash text not null,
  minute_bucket timestamptz not null,
  hits integer not null default 0,
  primary key (visitor_hash, minute_bucket),
  constraint qr_visitor_hash_length check (length(visitor_hash) = 64)
);
alter table public.qr_read_rate_limits enable row level security;
revoke all on public.qr_read_rate_limits from public, anon, authenticated;
grant select, insert, update, delete on public.qr_read_rate_limits to service_role;

create or replace function public.qr_consume_read_budget(p_visitor text)
returns boolean
language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  if p_visitor !~ '^[a-f0-9]{64}$' then return false; end if;
  insert into public.qr_read_rate_limits(visitor_hash,minute_bucket,hits)
    values (p_visitor,date_trunc('minute',now()),1)
  on conflict (visitor_hash,minute_bucket)
    do update set hits = public.qr_read_rate_limits.hits + 1
  returning hits into n;
  -- Cleanup, best effort. No more than once per 200 calls globally recommended
  -- via a scheduled maintenance task in production.
  return n <= 120;
end; $$;
revoke all on function public.qr_consume_read_budget(text) from public, anon, authenticated;
grant execute on function public.qr_consume_read_budget(text) to service_role;

-- Author can still read original full manuscripts for editing & personal backup.
-- This is the *only* full-content read endpoint exposed to an authenticated author.
create or replace function public.qr_author_get_episodes(p_offset integer default 0, p_limit integer default 200)
returns setof public.qr_episodes
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.qr_author_members m where m.user_id = (select auth.uid())
  ) then raise exception 'Not permitted' using errcode = '42501'; end if;
  if p_offset < 0 or p_offset > 200000 or p_limit < 1 or p_limit > 250 then
    raise exception 'Invalid page size';
  end if;
  return query select e.* from public.qr_episodes e
    order by e.book_id, e.episode_number limit p_limit offset p_offset;
end; $$;
revoke all on function public.qr_author_get_episodes(integer,integer) from public, anon, authenticated;
grant execute on function public.qr_author_get_episodes(integer,integer) to authenticated;
