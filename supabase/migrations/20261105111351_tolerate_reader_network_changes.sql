-- Preserve session quotas across ordinary proxy/mobile-network changes.
begin;
create or replace function public.kk_reader_gate(p_kind text,p_visitor text,p_session text,p_book text,p_revision text,p_cost integer default 0,p_episode text default '',p_lease uuid default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 t timestamptz := clock_timestamp(); s kk_reader_private.sessions%rowtype;
 b kk_reader_private.buckets%rowtype; scope text; k text;
 req_cap double precision; req_rate double precision; char_cap double precision; char_rate double precision;
 elapsed double precision; wait_for integer:=0; scopes text[];
 episode_cap double precision; episode_rate double precision; is_new boolean;
begin
 if p_kind='release' then
  delete from kk_reader_private.inflight where lease=p_lease and token_hash=p_session;
  return jsonb_build_object('allowed',true);
 end if;
 if p_visitor !~ '^[a-f0-9]{64}$' or p_kind not in ('catalog','open','request','deliver','validate') or p_cost<0 or p_cost>16000000 or (p_kind='deliver' and p_episode !~ '^[a-f0-9]{64}$') then
  return jsonb_build_object('allowed',false,'reason','invalid','retry_after',60);
 end if;
 if p_kind in ('request','deliver','validate') then
  select * into s from kk_reader_private.sessions where token_hash=p_session;
  if not found or s.expires_at<=t or s.book_id<>p_book or s.revision<>p_revision then
   return jsonb_build_object('allowed',false,'reason','session','retry_after',1);
  end if;
  -- A public anonymous reading session is a capability, not an IP identity.
  -- Keep its original aggregate network budget when a browser/proxy changes address.
  p_visitor:=s.visitor;
 end if;
 if p_kind='validate' then return jsonb_build_object('allowed',true); end if;
 if p_kind='open' and (p_session !~ '^[a-f0-9]{64}$' or p_revision !~ '^[a-f0-9]{64}$' or not exists(select 1 from public.kk_books where id=p_book and is_published)) then
  return jsonb_build_object('allowed',false,'reason','session','retry_after',1);
 end if;
 -- Same lock order for all requests. Row locks make quotas atomic across edge workers.
 scopes:=case when p_kind in ('catalog','open') then array['global','network'] else array['global','network','session'] end;
 foreach scope in array scopes loop
  k:=case scope when 'global' then 'global' when 'network' then 'net:'||p_visitor else 'session:'||p_session end;
  req_cap:=case scope when 'global' then 500 when 'network' then 120 else 12 end;
  req_rate:=case scope when 'global' then 50 when 'network' then 8 else 1 end;
  char_cap:=case scope when 'global' then 1000000 when 'network' then 240000 else 60000 end;
  char_rate:=case scope when 'global' then 5000 when 'network' then 600 else 90 end;
  episode_cap:=case scope when 'global' then 500 when 'network' then 60 else 12 end;
  episode_rate:=case scope when 'global' then 5 when 'network' then .2 else 1.0/30 end;
  insert into kk_reader_private.buckets values(k,req_cap,char_cap,t,t+interval '1 day',0,0,episode_cap) on conflict do nothing;
  select * into b from kk_reader_private.buckets where key=k for update;
  elapsed:=greatest(0,extract(epoch from t-b.updated_at));
  b.requests:=least(req_cap,b.requests+elapsed*req_rate);
  b.characters:=least(char_cap,b.characters+elapsed*char_rate);
  b.episodes:=least(episode_cap,b.episodes+elapsed*episode_rate);
  if p_kind='deliver' then
   -- Long episodes may use the full burst once, then leave a debt proportional to length.
   -- This serves an intact episode rather than permanently rejecting it or splitting its text.
   if b.characters<least(char_cap,p_cost) then wait_for:=greatest(wait_for,ceil((least(char_cap,p_cost)-b.characters)/char_rate)::integer); end if;
   select not exists(select 1 from kk_reader_private.accesses where scope_key=k and episode=p_episode and last_seen>t-interval '10 minutes') into is_new;
   if is_new and b.episodes<1 then wait_for:=greatest(wait_for,ceil((1-b.episodes)/episode_rate)::integer); end if;
  else
   -- Session creation costs 6 request credits; rotating tokens does not reset network quotas.
   if b.requests < (case when p_kind='open' then 6 else 1 end) then wait_for:=greatest(wait_for,ceil((case when p_kind='open' then 6 else 1 end-b.requests)/req_rate)::integer); end if;
  end if;
  update kk_reader_private.buckets set requests=b.requests,characters=b.characters,episodes=b.episodes,updated_at=t,expires_at=t+interval '1 day' where key=k;
 end loop;
 -- Bounded cleanup; no raw IP, manuscript, user agent or search phrase is logged.
 delete from kk_reader_private.sessions where token_hash in(select token_hash from kk_reader_private.sessions where expires_at<t-interval '1 day' limit 100);
 delete from kk_reader_private.buckets where key in(select key from kk_reader_private.buckets where expires_at<t limit 100);
 delete from kk_reader_private.accesses where (scope_key,episode) in(select scope_key,episode from kk_reader_private.accesses where last_seen<t-interval '1 day' limit 100);
 delete from kk_reader_private.inflight where lease in(select lease from kk_reader_private.inflight where expires_at<t limit 100);
 if p_kind='request' and ((select count(*) from kk_reader_private.inflight where token_hash=p_session and expires_at>t)>=3 or (select count(*) from kk_reader_private.inflight where visitor=p_visitor and expires_at>t)>=32) then wait_for:=greatest(wait_for,3); end if;
 if wait_for>0 then
  foreach scope in array scopes loop
   k:=case scope when 'global' then 'global' when 'network' then 'net:'||p_visitor else 'session:'||p_session end;
   update kk_reader_private.buckets set denied=denied+1 where key=k;
  end loop;
  return jsonb_build_object('allowed',false,'reason','rate','retry_after',wait_for);
 end if;
 foreach scope in array scopes loop
  k:=case scope when 'global' then 'global' when 'network' then 'net:'||p_visitor else 'session:'||p_session end;
  select not exists(select 1 from kk_reader_private.accesses where scope_key=k and episode=p_episode and last_seen>t-interval '10 minutes') into is_new;
  update kk_reader_private.buckets set
   requests=requests-case when p_kind='deliver' then 0 when p_kind='open' then 6 else 1 end,
   characters=characters-case when p_kind='deliver' then p_cost else 0 end,
   delivered=delivered+case when p_kind='deliver' then p_cost else 0 end,
   episodes=episodes-case when p_kind='deliver' and is_new then 1 else 0 end where key=k;
  if p_kind='deliver' then insert into kk_reader_private.accesses values(k,p_episode,t) on conflict(scope_key,episode) do update set last_seen=excluded.last_seen; end if;
 end loop;
 if p_kind='open' then insert into kk_reader_private.sessions values(p_session,p_visitor,p_book,p_revision,t+interval '30 minutes'); end if;
 if p_kind='request' then insert into kk_reader_private.inflight values(p_lease,p_session,p_visitor,t+interval '60 seconds'); end if;
 return jsonb_build_object('allowed',true);
end $$;
revoke all on function public.kk_reader_gate(text,text,text,text,text,integer,text,uuid) from public,anon,authenticated;
grant execute on function public.kk_reader_gate(text,text,text,text,text,integer,text,uuid) to service_role;

commit;
