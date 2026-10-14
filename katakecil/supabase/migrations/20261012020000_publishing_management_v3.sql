-- KataKecil V3: additive publishing manager, no rewrite of legacy release_at.
-- Apply ONLY AFTER V1 and V2 migrations and a verified backup of the existing schedules.
-- This migration does not update or delete existing episodes, release dates or manuscripts.

create table if not exists public.qr_release_rules (
  book_id text primary key references public.qr_books(id) on delete cascade,
  weekdays smallint[] not null check (cardinality(weekdays) between 1 and 7 and weekdays <@ array[0,1,2,3,4,5,6]::smallint[]),
  time_wib time without time zone not null default '19:00',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.qr_release_rules enable row level security;
revoke all on public.qr_release_rules from public, anon, authenticated;
grant select, insert, update on public.qr_release_rules to authenticated;
grant all on public.qr_release_rules to service_role;
drop policy if exists "Studio: author reads release rules" on public.qr_release_rules;
create policy "Studio: author reads release rules" on public.qr_release_rules for select to authenticated
using (exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid())));
drop policy if exists "Studio: author inserts release rules" on public.qr_release_rules;
create policy "Studio: author inserts release rules" on public.qr_release_rules for insert to authenticated
with check (exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid())));
drop policy if exists "Studio: author changes release rules" on public.qr_release_rules;
create policy "Studio: author changes release rules" on public.qr_release_rules for update to authenticated
using (exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid())))
with check (exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid())));
drop trigger if exists qr_release_rules_updated_at on public.qr_release_rules;
create trigger qr_release_rules_updated_at before update on public.qr_release_rules
for each row execute function public.qr_touch_updated_at();

create table if not exists public.qr_publication_logs (
  id bigint generated always as identity primary key,
  book_id text not null,
  episode_id uuid not null,
  actor_id uuid,
  action text not null check (action in ('scheduled','published','retracted','rescheduled','release_updated')),
  old_release_at timestamptz,
  new_release_at timestamptz,
  old_enabled boolean not null,
  new_enabled boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists qr_publication_logs_recent on public.qr_publication_logs(created_at desc);
alter table public.qr_publication_logs enable row level security;
revoke all on public.qr_publication_logs from public, anon, authenticated;
grant select on public.qr_publication_logs to authenticated;
grant all on public.qr_publication_logs to service_role;
drop policy if exists "Studio: author reads publication log" on public.qr_publication_logs;
create policy "Studio: author reads publication log" on public.qr_publication_logs for select to authenticated
using (exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid())));
-- No client INSERT policy. The database records events, not untrusted browser claims.

create schema if not exists qr_private;
revoke all on schema qr_private from public, anon, authenticated;
create or replace function qr_private.record_publication_change()
returns trigger language plpgsql security definer set search_path = '' as $$
declare activity text;
begin
  if old.is_enabled is not distinct from new.is_enabled
     and old.release_at is not distinct from new.release_at then
    return new;
  end if;
  activity := case
    when not new.is_enabled or new.release_at is null then 'retracted'
    when new.release_at <= now() and (not old.is_enabled or old.release_at is null) then 'published'
    when new.release_at > now() and (not old.is_enabled or old.release_at is null) then 'scheduled'
    when old.release_at is distinct from new.release_at then 'rescheduled'
    else 'release_updated'
  end;
  insert into public.qr_publication_logs
    (book_id,episode_id,actor_id,action,old_release_at,new_release_at,old_enabled,new_enabled)
  values
    (new.book_id,new.id,auth.uid(),activity,old.release_at,new.release_at,old.is_enabled,new.is_enabled);
  return new;
end;
$$;
revoke all on function qr_private.record_publication_change() from public, anon, authenticated;
drop trigger if exists qr_episodes_publication_audit on public.qr_episodes;
create trigger qr_episodes_publication_audit
  after update of release_at,is_enabled on public.qr_episodes
  for each row execute function qr_private.record_publication_change();

-- Single transaction / all-or-nothing. Drafts only; never overwrites an old schedule.
create or replace function public.qr_apply_release_plan(p_book_id text, p_plan jsonb)
returns integer language plpgsql security invoker set search_path = '' as $$
declare n integer; matching integer; changed integer; conflicts integer;
begin
  if not exists(select 1 from public.qr_author_members m where m.user_id = (select auth.uid())) then
    raise exception 'Hanya penulis yang berwenang boleh mengatur jadwal.';
  end if;
  if jsonb_typeof(p_plan) is distinct from 'array' then
    raise exception 'Format jadwal harus array.';
  end if;
  n := jsonb_array_length(p_plan);
  if n < 1 or n > 100 then
    raise exception 'Jumlah episode harus 1 sampai 100.';
  end if;
  -- Serialize other bulk changes for the same book to avoid overwriting competing slots.
  perform 1 from public.qr_episodes e where e.book_id = p_book_id for update;
  select count(*),count(distinct p.episode_id),count(distinct p.release_at)
    into matching,changed,conflicts
    from jsonb_to_recordset(p_plan) as p(episode_id uuid,release_at timestamptz);
  if matching<>n or changed<>n or conflicts<>n then
    raise exception 'Ada episode atau waktu duplikat dalam rancangan jadwal.';
  end if;
  if exists(
    select 1 from jsonb_to_recordset(p_plan) as p(episode_id uuid,release_at timestamptz)
    where p.episode_id is null or p.release_at is null or p.release_at <= now()
  ) then
    raise exception 'Semua jadwal harus berisi ID episode dan tanggal di masa depan.';
  end if;
  select count(*) into matching
  from public.qr_episodes e
  join jsonb_to_recordset(p_plan) as p(episode_id uuid,release_at timestamptz) on e.id=p.episode_id
  where e.book_id=p_book_id and e.is_enabled=false and e.release_at is null;
  if matching<>n then
    raise exception 'Satu atau beberapa episode bukan draft kosong; jadwal lama tidak diubah.';
  end if;
  if exists (
    select 1 from public.qr_episodes e
    join jsonb_to_recordset(p_plan) as p(episode_id uuid,release_at timestamptz)
      on e.book_id=p_book_id and e.is_enabled=true and e.release_at=p.release_at
  ) then
    raise exception 'Ada tanggal yang sudah terpakai oleh episode lain pada novel ini.';
  end if;
  update public.qr_episodes e set release_at=p.release_at,is_enabled=true
  from jsonb_to_recordset(p_plan) as p(episode_id uuid,release_at timestamptz)
  where e.id=p.episode_id and e.book_id=p_book_id and e.is_enabled=false and e.release_at is null;
  get diagnostics changed=row_count;
  if changed<>n then raise exception 'Perubahan jadwal tidak lengkap, transaksi dibatalkan.'; end if;
  return changed;
end;
$$;
revoke all on function public.qr_apply_release_plan(text,jsonb) from public, anon;
grant execute on function public.qr_apply_release_plan(text,jsonb) to authenticated;

comment on table public.qr_release_rules is 'Per-novel optional publishing pattern. Does not itself modify old episode schedules.';
comment on table public.qr_publication_logs is 'Audit of episode release state/date only; never contains manuscript content.';
