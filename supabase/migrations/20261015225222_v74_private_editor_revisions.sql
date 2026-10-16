-- V7.4. Private, bounded revision history; optimistic editor saves with durable receipts.
-- Requires V7.2 author RPC/schema. V7.3 covers are independent of this migration.
create schema if not exists kk_private;
revoke all on schema kk_private from public,anon;
grant usage on schema kk_private to authenticated,service_role;
alter table public.qr_episodes add column editor_version bigint not null default 0;
-- Required for version-guarded release updates after V7.2 column-level SELECT hardening.
grant select(editor_version) on public.qr_episodes to authenticated;
create table kk_private.episode_revisions (
 id uuid primary key default gen_random_uuid(),
 episode_id uuid not null references public.qr_episodes(id) on delete cascade,
 captured_at timestamptz not null default clock_timestamp(),
 source_updated_at timestamptz not null, source_version bigint not null,
 reason text not null check(reason in ('automatic','checkpoint','resolve','restore')),
 title text not null, arc_title text not null, content_md text not null,
 content_bytes integer not null, content_hash text not null
);
create index episode_revisions_episode_recent on kk_private.episode_revisions(episode_id,captured_at desc,id desc);
create table kk_private.episode_save_receipts (
 request_id uuid primary key, episode_id uuid not null references public.qr_episodes(id) on delete cascade,
 actor_id uuid not null, fingerprint text not null, result jsonb not null,
 created_at timestamptz not null default clock_timestamp()
);
create index episode_save_receipts_episode_recent on kk_private.episode_save_receipts(episode_id,created_at desc,request_id desc);
alter table kk_private.episode_revisions enable row level security;
alter table kk_private.episode_save_receipts enable row level security;
revoke all on kk_private.episode_revisions,kk_private.episode_save_receipts from public,anon,authenticated;
-- No direct client table access, even for authors. List and body reads use separate guarded RPCs.
create function kk_private.editor_snapshot(p_row public.qr_episodes,p_reason text)
returns void language plpgsql security definer set search_path='' as $$
begin
 insert into kk_private.episode_revisions(episode_id,source_updated_at,source_version,reason,title,arc_title,content_md,content_bytes,content_hash)
 values(p_row.id,p_row.updated_at,p_row.editor_version,p_reason,coalesce(p_row.title,''),coalesce(p_row.arc_title,''),coalesce(p_row.content_md,''),
 octet_length(coalesce(p_row.content_md,'')),encode(sha256(convert_to(coalesce(p_row.content_md,''),'utf8')),'hex'));
 delete from kk_private.episode_revisions where id in (
  select id from kk_private.episode_revisions where episode_id=p_row.id order by captured_at desc,id desc offset 30
 );
end $$;
revoke all on function kk_private.editor_snapshot(public.qr_episodes,text) from public,anon,authenticated;

create function kk_private.editor_track() returns trigger language plpgsql security definer set search_path='' as $$
declare why text:=coalesce(nullif(current_setting('katakecil.revision_reason',true),''),'automatic');
begin
 new.editor_version:=old.editor_version+1;
 new.updated_at:=greatest(clock_timestamp(),old.updated_at+interval '1 microsecond');
 if (new.title,new.arc_title,new.content_md) is distinct from (old.title,old.arc_title,old.content_md) then
  if why in ('resolve','restore') or not exists(
   select 1 from kk_private.episode_revisions where episode_id=old.id and captured_at>clock_timestamp()-interval '5 minutes'
  ) then perform kk_private.editor_snapshot(old,case when why in ('resolve','restore') then why else 'automatic' end); end if;
 end if;
 return new;
end $$;
revoke all on function kk_private.editor_track() from public,anon,authenticated;
create trigger zzz_v74_editor_track before update on public.qr_episodes for each row execute function kk_private.editor_track();

create function kk_private.editor_revisions(p_episode_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 perform set_config('response.headers','[{"Cache-Control":"private, no-store, max-age=0"}]',true);
 if auth.uid() is null or not exists(select 1 from public.qr_author_members where user_id=(select auth.uid())) then raise exception 'Tidak mempunyai izin penulis.' using errcode='42501';end if;
 if not exists(select 1 from public.qr_episodes e join public.qr_books b on b.id=e.book_id where e.id=p_episode_id and e.deleted_at is null and b.deleted_at is null) then raise exception 'Bab tidak tersedia atau berada di Sampah.';end if;
 return coalesce((select jsonb_agg(to_jsonb(r) order by r.captured_at desc,r.id desc) from (
  select id,captured_at,source_updated_at,source_version,reason,title,arc_title,content_bytes,content_hash from kk_private.episode_revisions where episode_id=p_episode_id order by captured_at desc,id desc limit 30
 ) r),'[]'::jsonb);
end $$;
create function kk_private.editor_revision(p_episode_id uuid,p_revision_id uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform kk_private.editor_revisions(p_episode_id);
 select to_jsonb(r) into result from kk_private.episode_revisions r where episode_id=p_episode_id and id=p_revision_id;
 if result is null then raise exception 'Revisi tidak tersedia; muat ulang riwayat.';end if;
 return result;
end $$;

create function kk_private.editor_save(p_episode_id uuid,p_request_id uuid,p_expected_version bigint,p_document jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); e public.qr_episodes; receipt kk_private.episode_save_receipts; fingerprint text; result jsonb;
begin
 perform set_config('response.headers','[{"Cache-Control":"private, no-store, max-age=0"}]',true);
 if actor is null or not exists(select 1 from public.qr_author_members where user_id=actor) then raise exception 'Tidak mempunyai izin penulis.' using errcode='42501';end if;
 if p_request_id is null or p_expected_version is null or p_expected_version<0 or p_reason is null or p_reason not in ('automatic','checkpoint','resolve','restore')
 or p_document is null or jsonb_typeof(p_document)<>'object' or not (p_document ?& array['title','arc','body'])
 or jsonb_typeof(p_document->'title')<>'string' or jsonb_typeof(p_document->'arc')<>'string' or jsonb_typeof(p_document->'body')<>'string'
 or length(p_document->>'title')>180 or length(p_document->>'arc')>180 or octet_length(p_document->>'body')>2000000 then
  raise exception 'Naskah tidak valid: judul/arc maksimal 180 karakter dan isi maksimal 2 MB.' using errcode='22023';end if;
 fingerprint:=encode(sha256(convert_to(jsonb_build_object('episode',p_episode_id,'expected',p_expected_version,'document',p_document,'reason',p_reason)::text,'utf8')),'hex');
 -- Serializes the same UUID across different episodes; episode row lock serializes competing edits.
 perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,74));
 select * into e from public.qr_episodes where id=p_episode_id and deleted_at is null for update;
 if not found or not exists(select 1 from public.qr_books where id=e.book_id and deleted_at is null) then raise exception 'Bab tidak tersedia atau berada di Sampah.';end if;
 select * into receipt from kk_private.episode_save_receipts where request_id=p_request_id;
 if found then
  if receipt.actor_id<>actor or receipt.fingerprint<>fingerprint then raise exception 'Operasi simpan menggunakan isi berbeda.' using errcode='22023';end if;
  return receipt.result;
 end if;
 if e.editor_version<>p_expected_version then raise exception 'Bab berubah di tab lain. Tinjau perubahan sebelum menyimpan.' using errcode='40001';end if;
 perform set_config('katakecil.revision_reason',p_reason,true);
 if p_reason='checkpoint' then perform kk_private.editor_snapshot(e,'checkpoint');end if;
 if (e.title,e.arc_title,e.content_md) is distinct from (coalesce(nullif(btrim(p_document->>'title'),''),'Episode '||e.episode_number),p_document->>'arc',p_document->>'body') then
  update public.qr_episodes set title=coalesce(nullif(btrim(p_document->>'title'),''),'Episode '||e.episode_number),arc_title=p_document->>'arc',content_md=p_document->>'body'
  where id=p_episode_id returning * into e;
 end if;
 perform set_config('katakecil.revision_reason','',true);
 result:=to_jsonb(e)-'content_md';
 insert into kk_private.episode_save_receipts(request_id,episode_id,actor_id,fingerprint,result) values(p_request_id,p_episode_id,actor,fingerprint,result);
 delete from kk_private.episode_save_receipts where request_id in (
  select request_id from kk_private.episode_save_receipts where episode_id=p_episode_id order by created_at desc,request_id desc offset 200
 );
 return result;
end $$;
create function public.qr_episode_revisions_v74(p_episode_id uuid) returns jsonb language sql security invoker set search_path='' as $$select kk_private.editor_revisions(p_episode_id)$$;
create function public.qr_episode_revision_v74(p_episode_id uuid,p_revision_id uuid) returns jsonb language sql security invoker set search_path='' as $$select kk_private.editor_revision(p_episode_id,p_revision_id)$$;
create function public.qr_episode_save_v74(p_episode_id uuid,p_request_id uuid,p_expected_version bigint,p_document jsonb,p_reason text default 'automatic') returns jsonb language sql security invoker set search_path='' as $$select kk_private.editor_save(p_episode_id,p_request_id,p_expected_version,p_document,p_reason)$$;
revoke all on function kk_private.editor_revisions(uuid),kk_private.editor_revision(uuid,uuid),kk_private.editor_save(uuid,uuid,bigint,jsonb,text),public.qr_episode_revisions_v74(uuid),public.qr_episode_revision_v74(uuid,uuid),public.qr_episode_save_v74(uuid,uuid,bigint,jsonb,text) from public,anon,authenticated;
grant execute on function kk_private.editor_revisions(uuid),kk_private.editor_revision(uuid,uuid),kk_private.editor_save(uuid,uuid,bigint,jsonb,text),public.qr_episode_revisions_v74(uuid),public.qr_episode_revision_v74(uuid,uuid),public.qr_episode_save_v74(uuid,uuid,bigint,jsonb,text) to authenticated;
