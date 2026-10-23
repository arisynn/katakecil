-- Extend existing Web Push state only. No changes to stories, schedules or Auth.
begin;
alter table public.qr_web_push_subscriptions add column if not exists delivered_keys jsonb not null default '{}'::jsonb check(jsonb_typeof(delivered_keys)='object');

create or replace function public.qr_web_push_claim_edge(p_limit integer default 50)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare v_cutoff timestamptz:=clock_timestamp();v_rows jsonb;
begin
 select coalesce(jsonb_agg(to_jsonb(s)),'[]'::jsonb) into v_rows from public.qr_web_push_claim(greatest(1,least(p_limit,50))) s;
 return jsonb_build_object('cutoff',v_cutoff,'rows',v_rows);
end $$;
create or replace function public.qr_web_push_lease_alive(p_id uuid,p_lease uuid)
returns boolean language sql security invoker set search_path='' as $$
 select exists(select 1 from public.qr_web_push_subscriptions where id=p_id and lease_id=p_lease and lease_until>clock_timestamp());
$$;
create or replace function public.qr_web_push_mark_sent(p_id uuid,p_lease uuid,p_event text)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_event !~ '^[0-9a-f]{64}$' then raise exception 'Invalid event key';end if;
 update public.qr_web_push_subscriptions set delivered_keys=jsonb_set(delivered_keys,array[p_event],'true'::jsonb,true)
 where id=p_id and lease_id=p_lease and lease_until>clock_timestamp();
 return found;
end $$;
create or replace function public.qr_web_push_finish_edge(p_id uuid,p_lease uuid,p_cursor_at timestamptz default null,p_cursor_id uuid default null,p_expired boolean default false)
returns boolean language plpgsql security invoker set search_path='' as $$
begin
 if p_expired then
  delete from public.qr_web_push_subscriptions where id=p_id and lease_id=p_lease and lease_until>clock_timestamp();return found;
 end if;
 if (p_cursor_at is null)<>(p_cursor_id is null) or p_cursor_at>clock_timestamp() then raise exception 'Invalid cursor';end if;
 update public.qr_web_push_subscriptions set cursor_at=coalesce(p_cursor_at,cursor_at),cursor_id=coalesce(p_cursor_id,cursor_id),delivered_keys=case when p_cursor_at is null then delivered_keys else '{}'::jsonb end,lease_id=null,lease_until=null,updated_at=clock_timestamp()
 where id=p_id and lease_id=p_lease and lease_until>clock_timestamp() and (p_cursor_at is null or (p_cursor_at,p_cursor_id)>=(cursor_at,cursor_id));
 return found;
end $$;
revoke all on function public.qr_web_push_claim_edge(integer),public.qr_web_push_lease_alive(uuid,uuid),public.qr_web_push_mark_sent(uuid,uuid,text),public.qr_web_push_finish_edge(uuid,uuid,timestamptz,uuid,boolean) from public,anon,authenticated;
grant execute on function public.qr_web_push_claim_edge(integer),public.qr_web_push_lease_alive(uuid,uuid),public.qr_web_push_mark_sent(uuid,uuid,text),public.qr_web_push_finish_edge(uuid,uuid,timestamptz,uuid,boolean) to service_role;
commit;
