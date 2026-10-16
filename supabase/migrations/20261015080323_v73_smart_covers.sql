-- V7.3 additive cover lifecycle. Deploy in staging before the cover endpoint/frontend.
create schema if not exists kk_private;
revoke all on schema kk_private from public,anon;
grant usage on schema kk_private to authenticated,service_role;
create table public.qr_cover_assets (
 id uuid primary key, book_id text not null references public.qr_books(id) on delete cascade,
 created_by uuid not null, created_at timestamptz not null default now(),
 source_name text not null, source_path text not null unique, normalized_path text not null unique,
 source_mime text not null check(source_mime in ('image/jpeg','image/png','image/webp')),
 source_bytes integer not null check(source_bytes between 1 and 15728640),
 source_hash text not null check(source_hash ~ '^[a-f0-9]{64}$'), normalized_hash text not null check(normalized_hash ~ '^[a-f0-9]{64}$'),
 width integer not null check(width between 1 and 1600), height integer not null check(height between 1 and 1600),
 settings jsonb not null, fingerprint text not null,
 status text not null default 'pending' check(status in ('pending','ready','published','abandoned')),
 manifest jsonb, lease_token uuid, lease_until timestamptz,
 check(length(source_name) between 1 and 180)
);
create index qr_cover_assets_book_created on public.qr_cover_assets(book_id,created_at desc);
create index qr_cover_assets_actor on public.qr_cover_assets(created_by,created_at desc);
create table public.qr_book_covers (
 book_id text primary key references public.qr_books(id) on delete cascade,
 asset_id uuid references public.qr_cover_assets(id), version bigint not null default 0,
 manifest jsonb, updated_at timestamptz not null default now()
);
create index qr_book_covers_asset on public.qr_book_covers(asset_id);
create table public.qr_cover_publications (
 id uuid primary key, book_id text not null references public.qr_books(id) on delete cascade,
 asset_id uuid not null references public.qr_cover_assets(id), actor_id uuid not null,
 expected_version bigint not null, created_at timestamptz not null default now(), result jsonb, abandoned boolean not null default false
);
create index qr_cover_publications_asset on public.qr_cover_publications(asset_id);
create index qr_cover_publications_book on public.qr_cover_publications(book_id,created_at desc);
create index qr_cover_publications_actor on public.qr_cover_publications(actor_id,created_at desc);
alter table public.qr_cover_assets enable row level security;
alter table public.qr_book_covers enable row level security;
alter table public.qr_cover_publications enable row level security;
revoke all on public.qr_cover_assets,public.qr_book_covers,public.qr_cover_publications from public,anon,authenticated;
grant select on public.qr_cover_assets,public.qr_cover_publications to authenticated;
grant select on public.qr_book_covers to anon,authenticated;
grant all on public.qr_cover_assets,public.qr_book_covers,public.qr_cover_publications to service_role;
create policy "V73 author cover history" on public.qr_cover_assets for select to authenticated
 using(exists(select 1 from public.qr_author_members where user_id=(select auth.uid())));
create policy "V73 author publication receipts" on public.qr_cover_publications for select to authenticated
 using(actor_id=(select auth.uid()) and exists(select 1 from public.qr_author_members where user_id=(select auth.uid())));
create policy "V73 released cover metadata" on public.qr_book_covers for select to anon,authenticated
 using(exists(select 1 from public.qr_books b where b.id=book_id and b.is_published and b.deleted_at is null));
create policy "V73 author cover metadata" on public.qr_book_covers for select to authenticated
 using(exists(select 1 from public.qr_author_members where user_id=(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('story-covers-v73-private','story-covers-v73-private',false,15728640,array['image/jpeg','image/png','image/webp']),
 ('story-covers-v73','story-covers-v73',true,2097152,array['image/webp'])
on conflict(id) do update set public=excluded.public,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;
create policy "V73 author private cover download" on storage.objects for select to authenticated
 using(bucket_id='story-covers-v73-private' and exists(select 1 from public.qr_author_members where user_id=(select auth.uid()))
 and exists(select 1 from public.qr_cover_assets a where starts_with(name,a.book_id||'/'||a.id::text||'/') and a.status<>'abandoned'));
create policy "V73 immutable cover inputs" on storage.objects for insert to authenticated
 with check(bucket_id='story-covers-v73-private' and exists(select 1 from public.qr_author_members where user_id=(select auth.uid()))
 and exists(select 1 from public.qr_cover_assets a where a.created_by=(select auth.uid()) and a.status='pending' and a.created_at>now()-interval '2 days' and name in (a.source_path,a.normalized_path)));
-- No client write policies for public derivatives or immutable stored inputs.

create function kk_private.cover_begin(p_id uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); a public.qr_cover_assets; h text; b text:=p_payload->>'book_id'; ext text; s jsonb:=p_payload->'settings';
begin
 if actor is null or not exists(select 1 from public.qr_author_members where user_id=actor) then raise exception 'Tidak memiliki izin penulis.' using errcode='42501'; end if;
 if p_id is null or b is null or b !~ '^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$' or not exists(select 1 from public.qr_books where id=b and deleted_at is null) then raise exception 'Cerita tidak tersedia.'; end if;
 if pg_catalog.octet_length(p_payload::text)>4096 then raise exception 'Metadata sampul terlalu besar.'; end if;
 if s is null or s->>'mode' not in ('contain','crop') or (s->>'x')::numeric not between 0 and 1 or (s->>'y')::numeric not between 0 and 1 or (s->>'zoom')::numeric not between 1 and 4 or (s->>'rotation')::int not in (0,90,180,270)
 or not (s ?& array['mode','x','y','zoom','rotation']) then raise exception 'Pengaturan sampul tidak valid.'; end if;
 h:=encode(sha256(convert_to(p_payload::text,'utf8')),'hex');
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,73));
 select * into a from public.qr_cover_assets where id=p_id;
 if found then
  if a.created_by<>actor or a.fingerprint<>h or a.status='abandoned' then raise exception 'Operasi sampul memakai isi berbeda atau sudah berakhir.'; end if;
  return to_jsonb(a);
 end if;
 if (select count(*) from public.qr_cover_assets where created_by=actor and created_at>now()-interval '1 hour')>=30 then raise exception 'Terlalu banyak unggahan. Coba kembali nanti.'; end if;
 ext:=case p_payload->>'source_mime' when 'image/png' then 'png' when 'image/webp' then 'webp' when 'image/jpeg' then 'jpg' else null end;
 if ext is null then raise exception 'Format sampul tidak didukung.'; end if;
 insert into public.qr_cover_assets(id,book_id,created_by,source_name,source_path,normalized_path,source_mime,source_bytes,source_hash,normalized_hash,width,height,settings,fingerprint)
 values(p_id,b,actor,p_payload->>'source_name',b||'/'||p_id::text||'/original.'||ext,b||'/'||p_id::text||'/normalized.png',p_payload->>'source_mime',(p_payload->>'source_bytes')::int,p_payload->>'source_hash',p_payload->>'normalized_hash',(p_payload->>'width')::int,(p_payload->>'height')::int,s,h) returning * into a;
 return to_jsonb(a);
end $$;
create function public.qr_cover_begin_v73(p_id uuid,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select kk_private.cover_begin(p_id,p_payload)$$;
revoke all on function kk_private.cover_begin(uuid,jsonb),public.qr_cover_begin_v73(uuid,jsonb) from public,anon;
grant execute on function kk_private.cover_begin(uuid,jsonb),public.qr_cover_begin_v73(uuid,jsonb) to authenticated;

create function kk_private.cover_lease(p_id uuid,p_actor uuid,p_token uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.qr_cover_assets;
begin
 if p_actor is null or not exists(select 1 from public.qr_author_members where user_id=p_actor) then raise exception 'Tidak memiliki izin penulis.' using errcode='42501'; end if;
 select * into a from public.qr_cover_assets where id=p_id for update;
 if not found or a.created_by<>p_actor or a.status='abandoned' or not exists(select 1 from public.qr_books where id=a.book_id and deleted_at is null) then raise exception 'Sampul tidak tersedia.'; end if;
 if a.status in ('ready','published') then return to_jsonb(a); end if;
 if a.created_at<now()-interval '2 days' then raise exception 'Unggahan kedaluwarsa. Pilih gambar kembali.'; end if;
 if a.lease_until>now() then raise exception 'Sampul masih diproses. Tunggu sebentar lalu periksa kembali.' using errcode='55P03'; end if;
 update public.qr_cover_assets set lease_token=p_token,lease_until=now()+interval '2 minutes' where id=p_id returning * into a;
 return to_jsonb(a);
end $$;
create function public.qr_cover_lease_v73(p_id uuid,p_actor uuid,p_token uuid) returns jsonb language sql security invoker set search_path='' as $$select kk_private.cover_lease(p_id,p_actor,p_token)$$;

create function kk_private.cover_finish(p_id uuid,p_actor uuid,p_token uuid,p_manifest jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.qr_cover_assets; v jsonb;
begin
 if not exists(select 1 from public.qr_author_members where user_id=p_actor) then raise exception 'Tidak memiliki izin penulis.'; end if;
 select * into a from public.qr_cover_assets where id=p_id for update;
 if not found or a.created_by<>p_actor or a.status<>'pending' or a.lease_token is distinct from p_token then raise exception 'Operasi sampul telah berubah.'; end if;
 if p_manifest is null or jsonb_typeof(p_manifest) is distinct from 'object' or jsonb_typeof(p_manifest->'card') is distinct from 'array' or p_manifest->>'version' is distinct from p_id::text or p_manifest->>'mode'<>a.settings->>'mode' or jsonb_array_length(p_manifest->'card') not between 1 and 3 then raise exception 'Manifest sampul tidak valid.'; end if;
 for v in select value from jsonb_array_elements((p_manifest->'card')||jsonb_build_array(p_manifest->'detail')) loop
  if v->>'path' is null or not starts_with(v->>'path',a.book_id||'/'||p_id::text||'/') or v->>'mime' is distinct from 'image/webp' or coalesce((v->>'width')::int,0) not between 1 and 1600 or coalesce((v->>'height')::int,0) not between 1 and 1600 or coalesce((v->>'bytes')::int,0) not between 1 and 2097152 then raise exception 'Varian sampul tidak valid.'; end if;
 end loop;
 update public.qr_cover_assets set status='ready',manifest=p_manifest,lease_until=null,lease_token=null where id=p_id returning * into a;
 return to_jsonb(a);
end $$;
create function public.qr_cover_finish_v73(p_id uuid,p_actor uuid,p_token uuid,p_manifest jsonb) returns jsonb language sql security invoker set search_path='' as $$select kk_private.cover_finish(p_id,p_actor,p_token,p_manifest)$$;

create function kk_private.cover_publish_begin(p_id uuid,p_asset uuid,p_actor uuid,p_expected bigint) returns jsonb language plpgsql security definer set search_path='' as $$
declare a public.qr_cover_assets; r public.qr_cover_publications; current_version bigint;
begin
 if not exists(select 1 from public.qr_author_members where user_id=p_actor) then raise exception 'Tidak memiliki izin penulis.'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_id::text,74));
 select * into r from public.qr_cover_publications where id=p_id;
 if found then
  if r.actor_id<>p_actor or r.asset_id<>p_asset or r.expected_version<>p_expected then raise exception 'Identitas publikasi memakai isi berbeda.'; end if;
  if r.abandoned then raise exception 'Percobaan publikasi kedaluwarsa. Muat ulang status sampul.'; end if;
  return to_jsonb(r);
 end if;
 select * into a from public.qr_cover_assets where id=p_asset;
 if not found or a.status not in ('ready','published') then raise exception 'Sampul belum siap.'; end if;
 perform 1 from public.qr_books where id=a.book_id and deleted_at is null for update;
 if not found then raise exception 'Cerita tidak tersedia.'; end if;
 select version into current_version from public.qr_book_covers where book_id=a.book_id;
 if coalesce(current_version,0)<>p_expected then raise exception 'Sampul telah berubah di tab lain. Muat ulang sebelum menerbitkan.' using errcode='40001'; end if;
 insert into public.qr_cover_publications(id,book_id,asset_id,actor_id,expected_version) values(p_id,a.book_id,p_asset,p_actor,p_expected) returning * into r;
 return to_jsonb(r);
end $$;
create function public.qr_cover_publish_begin_v73(p_id uuid,p_asset uuid,p_actor uuid,p_expected bigint) returns jsonb language sql security invoker set search_path='' as $$select kk_private.cover_publish_begin(p_id,p_asset,p_actor,p_expected)$$;

create function kk_private.cover_publish_finish(p_id uuid,p_actor uuid,p_manifest jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare r public.qr_cover_publications; a public.qr_cover_assets; ver bigint; answer jsonb;
begin
 if not exists(select 1 from public.qr_author_members where user_id=p_actor) then raise exception 'Tidak memiliki izin penulis.'; end if;
 select * into r from public.qr_cover_publications where id=p_id for update;
 if not found or r.actor_id<>p_actor then raise exception 'Publikasi tidak tersedia.'; end if;
 if r.abandoned then raise exception 'Percobaan publikasi kedaluwarsa. Muat ulang status sampul.'; end if;
 if r.result is not null then return r.result; end if;
 select * into a from public.qr_cover_assets where id=r.asset_id;
 if a.status not in ('ready','published') then raise exception 'Sampul belum siap.'; end if;
 perform 1 from public.qr_books where id=r.book_id and deleted_at is null for update;
 if not found then raise exception 'Cerita tidak tersedia.'; end if;
 select version into ver from public.qr_book_covers where book_id=r.book_id;
 if coalesce(ver,0)<>r.expected_version then raise exception 'Sampul telah berubah di tab lain. Muat ulang sebelum menerbitkan.' using errcode='40001'; end if;
 if p_manifest is null or jsonb_typeof(p_manifest) is distinct from 'object' or jsonb_typeof(p_manifest->'card') is distinct from 'array' or p_manifest->>'version' is distinct from p_id::text or jsonb_array_length(p_manifest->'card') not between 1 and 3 or p_manifest->'detail'->>'url' is null then raise exception 'Manifest publik tidak valid.'; end if;
 ver:=coalesce(ver,0)+1;
 insert into public.qr_book_covers(book_id,asset_id,version,manifest) values(r.book_id,a.id,ver,p_manifest)
 on conflict(book_id) do update set asset_id=excluded.asset_id,version=excluded.version,manifest=excluded.manifest,updated_at=now();
 update public.qr_books set cover_url=(p_manifest->'card'->(jsonb_array_length(p_manifest->'card')-1)->>'url') where id=r.book_id;
 update public.qr_cover_assets set status='published' where id=a.id;
 answer:=jsonb_build_object('request_id',p_id,'book_id',r.book_id,'asset_id',a.id,'version',ver,'manifest',p_manifest);
 update public.qr_cover_publications set result=answer where id=p_id;
 return answer;
end $$;
create function public.qr_cover_publish_finish_v73(p_id uuid,p_actor uuid,p_manifest jsonb) returns jsonb language sql security invoker set search_path='' as $$select kk_private.cover_publish_finish(p_id,p_actor,p_manifest)$$;

revoke all on function kk_private.cover_lease(uuid,uuid,uuid),public.qr_cover_lease_v73(uuid,uuid,uuid),kk_private.cover_finish(uuid,uuid,uuid,jsonb),public.qr_cover_finish_v73(uuid,uuid,uuid,jsonb),kk_private.cover_publish_begin(uuid,uuid,uuid,bigint),public.qr_cover_publish_begin_v73(uuid,uuid,uuid,bigint),kk_private.cover_publish_finish(uuid,uuid,jsonb),public.qr_cover_publish_finish_v73(uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function kk_private.cover_lease(uuid,uuid,uuid),public.qr_cover_lease_v73(uuid,uuid,uuid),kk_private.cover_finish(uuid,uuid,uuid,jsonb),public.qr_cover_finish_v73(uuid,uuid,uuid,jsonb),kk_private.cover_publish_begin(uuid,uuid,uuid,bigint),public.qr_cover_publish_begin_v73(uuid,uuid,uuid,bigint),kk_private.cover_publish_finish(uuid,uuid,jsonb),public.qr_cover_publish_finish_v73(uuid,uuid,jsonb) to service_role;
notify pgrst,'reload schema';
