-- Optional additive web-push storage. Review and apply separately; never run on build.
-- Browser clients cannot read/write these tables. All RPCs are service-role only.
begin;
create table public.qr_web_push_subscriptions (
 id uuid primary key default gen_random_uuid(),
 endpoint_hash text not null unique check(length(endpoint_hash)=64),
 subscription jsonb not null check(jsonb_typeof(subscription)='object'),
 capability_hash text not null check(length(capability_hash)=64),
 cursor_at timestamptz not null default clock_timestamp(),
 cursor_id uuid not null default 'ffffffff-ffff-ffff-ffff-ffffffffffff',
 lease_id uuid,
 lease_until timestamptz,
 updated_at timestamptz not null default clock_timestamp()
);
create table public.qr_web_push_limits (
 rate_hash text primary key check(length(rate_hash)=64),
 hits integer not null default 1,
 expires_at timestamptz not null default (clock_timestamp()+interval '2 hours')
);
alter table public.qr_web_push_subscriptions enable row level security;
alter table public.qr_web_push_limits enable row level security;
revoke all on public.qr_web_push_subscriptions,public.qr_web_push_limits from public,anon,authenticated;
grant select,insert,update,delete on public.qr_web_push_subscriptions,public.qr_web_push_limits to service_role;
create index qr_web_push_lease_idx on public.qr_web_push_subscriptions (lease_until,updated_at);
create index qr_web_push_limits_expiry_idx on public.qr_web_push_limits (expires_at);

create function public.qr_web_push_register(p_endpoint_hash text,p_subscription jsonb,p_capability_hash text,p_rate_hash text)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare n integer; result uuid;
begin
 insert into qr_web_push_limits(rate_hash) values(p_rate_hash)
 on conflict(rate_hash) do update set hits=qr_web_push_limits.hits+1 returning hits into n;
 if n>30 then raise exception 'Too many subscriptions' using errcode='P0001'; end if;
 insert into qr_web_push_subscriptions(endpoint_hash,subscription,capability_hash)
 values(p_endpoint_hash,p_subscription,p_capability_hash)
 on conflict(endpoint_hash) do update set subscription=excluded.subscription,updated_at=clock_timestamp()
 where qr_web_push_subscriptions.capability_hash=excluded.capability_hash
 returning id into result;
 if result is null then raise exception 'Subscription ownership mismatch' using errcode='42501'; end if;
 return result;
end $$;
revoke all on function public.qr_web_push_register(text,jsonb,text,text) from public,anon,authenticated;
grant execute on function public.qr_web_push_register(text,jsonb,text,text) to service_role;

create function public.qr_web_push_claim(p_limit integer default 50)
returns setof public.qr_web_push_subscriptions language sql security invoker set search_path=public,pg_temp as $$
 with candidates as (
  select id from qr_web_push_subscriptions
  where lease_until is null or lease_until<clock_timestamp()
  order by updated_at,id limit greatest(1,least(p_limit,50)) for update skip locked
 )
 update qr_web_push_subscriptions s set lease_id=gen_random_uuid(),lease_until=clock_timestamp()+interval '4 minutes'
 from candidates c where s.id=c.id returning s.*;
$$;
revoke all on function public.qr_web_push_claim(integer) from public,anon,authenticated;
grant execute on function public.qr_web_push_claim(integer) to service_role;
commit;
