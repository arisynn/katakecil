-- KataKecil V7.5. Apply AFTER all V7.4 migrations, on staging first.
-- This update defines functions and queues only. It does not delete or publish any existing work.
-- Studio is a shared private library: every qr_author_members member manages the same catalog.
begin;
alter table public.qr_import_batches drop constraint if exists qr_import_batches_imported_count_check;
alter table public.qr_import_batches add constraint qr_import_batches_imported_count_check check(imported_count between 0 and 1000);
create or replace function public.qr_import_manuscript_v5(
 p_book_id text, p_new_title text, p_new_genre text,
 p_source_name text, p_format text, p_title_detected text,
 p_episodes jsonb, p_sections jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid := (select auth.uid());
 ep_count integer; sec_count integer; ep_added integer; sec_added integer;
 target_id text; new_batch_id uuid; is_new boolean;
begin
 perform set_config('response.headers','[{"Cache-Control":"private, no-store, max-age=0"}]',true);
 if actor is null or not exists(select 1 from public.qr_author_members m where m.user_id=actor) then
  raise exception 'Tidak mempunyai izin penulis.' using errcode='42501';
 end if;
 if p_book_id is null or p_book_id !~ '^[a-z0-9][a-z0-9_-]{0,95}$'
  or p_source_name is null or length(p_source_name) not between 1 and 255
  or p_format is null or p_format not in ('epub','md','txt','zip') or length(coalesce(p_title_detected,''))>200
  or jsonb_typeof(p_episodes) is distinct from 'array' or jsonb_typeof(p_sections) is distinct from 'array' then
  raise exception 'Metadata impor tidak valid.';
 end if;
 ep_count:=jsonb_array_length(p_episodes);sec_count:=jsonb_array_length(p_sections);
 if ep_count>1000 or sec_count>60 or ep_count+sec_count<1 then
  raise exception 'Impor harus memiliki 1-1000 episode dan maksimal 60 halaman buku.';
 end if;
 if exists(select 1 from jsonb_to_recordset(p_episodes) as e(episode_number integer,title text,arc_title text,content_md text)
   where e.episode_number is null or e.episode_number not between 0 and 9999 or
   length(btrim(coalesce(e.title,''))) not between 1 and 180 or
   length(coalesce(e.arc_title,''))>180 or length(btrim(coalesce(e.content_md,''))) not between 1 and 1000000)
 or (select count(distinct e.episode_number) from jsonb_to_recordset(p_episodes) as e(episode_number integer))<>ep_count
 or (select count(distinct md5(btrim(e.content_md))) from jsonb_to_recordset(p_episodes) as e(content_md text))<>ep_count then
  raise exception 'Episode tidak valid, nomor berulang, atau isi duplikat.';
 end if;
 if exists(select 1 from jsonb_to_recordset(p_sections) as s(position integer,section_type text,title text,content_md text)
   where s.position is null or s.position not between 0 and 9999 or s.section_type is null or s.section_type not in ('frontmatter','arc')
   or length(btrim(coalesce(s.title,''))) not between 1 and 180
   or length(btrim(coalesce(s.content_md,''))) not between 1 and 1000000)
 or (select count(distinct s.position) from jsonb_to_recordset(p_sections) as s(position integer))<>sec_count then
  raise exception 'Halaman tambahan kosong atau urutannya berulang.';
 end if;
 if coalesce((select sum(octet_length(e.content_md)) from jsonb_to_recordset(p_episodes) as e(content_md text)),0)
  + coalesce((select sum(octet_length(s.content_md)) from jsonb_to_recordset(p_sections) as s(content_md text)),0)>12000000 then
  raise exception 'Ukuran isi total melebihi 12 MB.';
 end if;
 is_new:=coalesce(btrim(p_new_title),'')<>'';
 if is_new then
  if char_length(btrim(p_new_title))>180 or char_length(coalesce(p_new_genre,''))>70 then
   raise exception 'Judul atau genre terlalu panjang.';
  end if;
  insert into public.qr_books(id,slug,title,synopsis,genre,cover_url,status,is_published,is_featured)
    values(p_book_id,p_book_id,btrim(p_new_title),'',coalesce(nullif(btrim(p_new_genre),''),'Fiksi'),null,'ongoing',false,false);
 else
  perform 1 from public.qr_books b where b.id=p_book_id and b.deleted_at is null for update;
  if not found then raise exception 'Novel tujuan tidak ditemukan atau berada di Sampah.';end if;
 end if;
 target_id:=p_book_id;
 if exists(select 1 from public.qr_episodes old join jsonb_to_recordset(p_episodes) as e(episode_number integer,content_md text)
    on old.episode_number=e.episode_number or md5(btrim(old.content_md))=md5(btrim(e.content_md))
    where old.book_id=target_id) then
  raise exception 'Nomor atau isi episode sudah pernah digunakan pada novel ini.';
 end if;
 if exists(select 1 from public.qr_book_sections old join jsonb_to_recordset(p_sections) as s(position integer)
   on old.position=s.position where old.book_id=target_id) then
  raise exception 'Urutan halaman buku sudah digunakan. Periksa halaman lama sebelum mengimpor.';
 end if;
 insert into public.qr_book_sections(book_id,position,section_type,title,content_md)
   select target_id,s.position,s.section_type,btrim(s.title),s.content_md
   from jsonb_to_recordset(p_sections) as s(position integer,section_type text,title text,content_md text);
 get diagnostics sec_added=row_count;
 insert into public.qr_episodes(book_id,episode_number,title,arc_title,content_md,is_enabled,release_at)
   select target_id,e.episode_number,btrim(e.title),coalesce(btrim(e.arc_title),''),e.content_md,false,null
   from jsonb_to_recordset(p_episodes) as e(episode_number integer,title text,arc_title text,content_md text);
 get diagnostics ep_added=row_count;
 if ep_added<>ep_count or sec_added<>sec_count then raise exception 'Impor tidak lengkap; perubahan dibatalkan.';end if;
 insert into public.qr_import_batches(book_id,actor_id,source_name,source_format,detected_title,imported_count,sections_count)
   values(target_id,actor,p_source_name,p_format,coalesce(p_title_detected,''),ep_added,sec_added)
   returning id into new_batch_id;
 return jsonb_build_object('book_id',target_id,'created_book',is_new,'batch_id',new_batch_id,
   'imported_count',ep_added,'sections_count',sec_added);
end;
$$;
revoke all on function public.qr_import_manuscript_v5(text,text,text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.qr_import_manuscript_v5(text,text,text,text,text,text,jsonb,jsonb) to authenticated;


create or replace function public.qr_import_manuscript_v72(p_request_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=(select auth.uid()); fingerprint text; prior public.qr_import_requests%rowtype; receipt jsonb; decisions jsonb;
begin
 perform set_config('response.headers','[{"Cache-Control":"private, no-store, max-age=0"}]',true);
 if actor is null or not exists(select 1 from public.qr_author_members m where m.user_id=actor) then raise exception 'Tidak mempunyai izin penulis.' using errcode='42501';end if;
 if p_request_id is null or jsonb_typeof(p_payload) is distinct from 'object' or octet_length(p_payload::text)>16000000 then raise exception 'Permintaan impor tidak valid.';end if;
 if jsonb_typeof(coalesce(p_payload->'decisions','[]'::jsonb)) is distinct from 'array' or jsonb_array_length(coalesce(p_payload->'decisions','[]'::jsonb))>2000 then raise exception 'Daftar keputusan impor tidak valid.';end if;
 select coalesce(jsonb_agg(jsonb_build_object('origin',left(d->>'origin',1024),'kind',left(d->>'kind',32),'action',left(d->>'action',16),'episode_number',left(d->>'episode_number',5),'reason',left(d->>'reason',255),'reviewed',d->>'reviewed')),'[]'::jsonb) into decisions from jsonb_array_elements(coalesce(p_payload->'decisions','[]'::jsonb)) d;
 fingerprint:=encode(sha256(convert_to(p_payload::text,'UTF8')),'hex');
 -- Serialize duplicate operation IDs even if neither transaction has committed yet.
 perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_request_id::text,0));
 select * into prior from public.qr_import_requests r where r.actor_id=actor and r.request_id=p_request_id;
 if found then
  if prior.fingerprint<>fingerprint then raise exception 'Identitas operasi dipakai untuk isi berbeda.' using errcode='22023';end if;
  return prior.result;
 end if;
 receipt:=public.qr_import_manuscript_v5(p_payload->>'book_id',coalesce(p_payload->>'new_title',''),coalesce(p_payload->>'genre','Fiksi'),p_payload->>'source_name',p_payload->>'format',coalesce(p_payload->>'title_detected',''),p_payload->'episodes',p_payload->'sections');
 receipt:=receipt||jsonb_build_object('request_id',p_request_id);
 insert into public.qr_import_requests(actor_id,request_id,fingerprint,result,decisions) values(actor,p_request_id,fingerprint,receipt,decisions);
 return receipt;
end;$$;
revoke all on function public.qr_import_manuscript_v72(uuid,jsonb) from public,anon,authenticated;
grant execute on function public.qr_import_manuscript_v72(uuid,jsonb) to authenticated;

create or replace function public.qr_get_trash()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid()))
  then raise exception 'Tidak mempunyai izin penulis.' using errcode='42501'; end if;
 return jsonb_build_object(
  'books',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'title',b.title,'deleted_at',b.deleted_at)
        order by b.deleted_at desc) from (select * from public.qr_books where deleted_at is not null) b),'[]'::jsonb),
  'episodes',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'book_id',e.book_id,'episode_number',e.episode_number,'title',e.title,'deleted_at',e.deleted_at)
        order by e.deleted_at desc) from (select * from public.qr_episodes where deleted_at is not null) e),'[]'::jsonb),
  'sections',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'book_id',s.book_id,'title',s.title,'deleted_at',s.deleted_at)
        order by s.deleted_at desc) from (select * from public.qr_book_sections where deleted_at is not null) s),'[]'::jsonb)
 );
end;
$$;

-- Privileged implementations stay outside the exposed schema; public wrappers are invokers.
create schema if not exists kk_private;
revoke all on schema kk_private from public,anon;
grant usage on schema kk_private to authenticated,service_role;
create table kk_private.management_receipts(
 actor_id uuid not null, request_id uuid not null, fingerprint text not null,
 result jsonb not null, created_at timestamptz not null default now(),
 primary key(actor_id,request_id)
);
alter table kk_private.management_receipts enable row level security;
revoke all on kk_private.management_receipts from public,anon,authenticated;
create table kk_private.paused_releases(
 episode_id uuid primary key references public.qr_episodes(id) on delete cascade,
 book_id text not null references public.qr_books(id) on delete cascade,
 release_at timestamptz not null, paused_at timestamptz not null default now()
);
alter table kk_private.paused_releases enable row level security;
revoke all on kk_private.paused_releases from public,anon,authenticated;
create table kk_private.deleted_book_cleanup(
 book_id text primary key, queued_at timestamptz not null default now(), cleaned_at timestamptz
);
alter table kk_private.deleted_book_cleanup enable row level security;
revoke all on kk_private.deleted_book_cleanup from public,anon,authenticated;
grant select,update on kk_private.deleted_book_cleanup to service_role;

create function kk_private.queue_deleted_book() returns trigger language plpgsql security definer set search_path='' as $$
begin
 insert into kk_private.deleted_book_cleanup(book_id) values(old.id) on conflict(book_id) do update set queued_at=now(),cleaned_at=null;
 -- Receipts remain as tombstones for retries; they contain no manuscript bodies.
 return old;
end $$;
revoke all on function kk_private.queue_deleted_book() from public,anon,authenticated;
create trigger qr_deleted_book_cleanup before delete on public.qr_books for each row execute function kk_private.queue_deleted_book();

create function kk_private.guard_deleted_book_id() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if exists(select 1 from kk_private.deleted_book_cleanup where book_id=new.id) then raise exception 'Identitas novel sudah dihapus permanen. Gunakan identitas baru.';end if;return new;
end $$;
revoke all on function kk_private.guard_deleted_book_id() from public,anon,authenticated;
create trigger qr_guard_deleted_book_id before insert on public.qr_books for each row execute function kk_private.guard_deleted_book_id();

create function kk_private.manage_items(p_request_id uuid,p_action text,p_items jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); fp text; prior kk_private.management_receipts; item jsonb; item_title text; result jsonb; n int;
begin
 if actor is null or not exists(select 1 from public.qr_author_members where user_id=actor) then raise exception 'Tidak mempunyai izin penulis.' using errcode='42501';end if;
 if p_request_id is null or p_action is null or p_action not in ('trash','restore','delete') or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Pilihan pengelolaan tidak valid.';end if;
 n:=jsonb_array_length(p_items);
 if n not between 1 and 6000 or octet_length(p_items::text)>2000000 then raise exception 'Pilih 1–6000 item.';end if;
 if exists(select 1 from jsonb_array_elements(p_items) x where x->>'kind' is null or x->>'kind' not in ('book','episode','section') or x->>'id' is null or length(x->>'id') not between 1 and 128 or x->>'title' is null)
 or (select count(distinct (x->>'kind',x->>'id')) from jsonb_array_elements(p_items) x)<>n then raise exception 'Pilihan item tidak valid atau berulang.';end if;
 fp:=md5(jsonb_build_object('action',p_action,'items',p_items)::text);
 perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,75));
 select * into prior from kk_private.management_receipts where actor_id=actor and request_id=p_request_id;
 if found then if prior.fingerprint<>fp then raise exception 'Identitas operasi dipakai untuk pilihan berbeda.';end if;return prior.result;end if;
 -- Lock every target before changing anything. A stale title/state cancels the whole operation.
 for item in select value from jsonb_array_elements(p_items) order by value->>'kind',value->>'id' loop
  if item->>'kind'='book' then select title into item_title from public.qr_books where id=item->>'id' and (deleted_at is not null)=(p_action<>'trash') for update;
  elsif item->>'kind'='episode' then select title into item_title from public.qr_episodes where id::text=item->>'id' and (deleted_at is not null)=(p_action<>'trash') for update;
  else select title into item_title from public.qr_book_sections where id::text=item->>'id' and (deleted_at is not null)=(p_action<>'trash') for update;end if;
  if not found or item_title is distinct from item->>'title' then raise exception 'Daftar item berubah. Muat ulang dan periksa pilihan.';end if;
 end loop;
 -- Children first: deleting a selected parent also deletes its selected children.
 for item in select value from jsonb_array_elements(p_items) order by (value->>'kind'='book'),value->>'id' loop
  if p_action='trash' then
   perform public.qr_trash_item(item->>'kind',item->>'id');
  elsif p_action='restore' then
   perform public.qr_restore_item(item->>'kind',item->>'id');
  else
   perform public.qr_permanently_delete_item(item->>'kind',item->>'id',item->>'title');
  end if;
 end loop;
 result:=jsonb_build_object('count',n,'cleanup_queued',p_action='delete' and exists(select 1 from jsonb_array_elements(p_items) x where x->>'kind'='book'));
 insert into kk_private.management_receipts values(actor,p_request_id,fp,result,now());
 return result;
end $$;
create function public.qr_manage_items_v75(p_request_id uuid,p_action text,p_items jsonb) returns jsonb language sql security invoker set search_path='' as $$select kk_private.manage_items(p_request_id,p_action,p_items)$$;
revoke all on function kk_private.manage_items(uuid,text,jsonb),public.qr_manage_items_v75(uuid,text,jsonb) from public,anon;
grant execute on function kk_private.manage_items(uuid,text,jsonb),public.qr_manage_items_v75(uuid,text,jsonb) to authenticated;

create function kk_private.import_publish(p_request_id uuid,p_payload jsonb) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); receipt jsonb; prior public.qr_import_requests; pub jsonb:=p_payload->'publishing'; mode text:=coalesce(p_payload->'publishing'->>'mode','draft'); slots jsonb; target text; n int; changed int; rule_days int[];
begin
 if actor is null or not exists(select 1 from public.qr_author_members where user_id=actor) then raise exception 'Tidak mempunyai izin penulis.' using errcode='42501';end if;
 if p_request_id is null or jsonb_typeof(p_payload) is distinct from 'object' then raise exception 'Permintaan impor tidak valid.';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||':'||p_request_id::text,0));
 select * into prior from public.qr_import_requests where actor_id=actor and request_id=p_request_id;
 if found then
  if prior.fingerprint<>encode(sha256(convert_to(p_payload::text,'UTF8')),'hex') then raise exception 'Identitas operasi dipakai untuk isi berbeda.';end if;
  return prior.result;
 end if;
 if mode not in ('draft','now','schedule','mixed') then raise exception 'Mode penerbitan tidak valid.';end if;
 receipt:=public.qr_import_manuscript_v72(p_request_id,p_payload);
 target:=receipt->>'book_id';
 if mode<>'draft' then
  slots:=pub->'plan';
  if jsonb_typeof(slots) is distinct from 'array' then raise exception 'Pratinjau penerbitan tidak valid.';end if;
  n:=jsonb_array_length(p_payload->'episodes');
  if n<1 or jsonb_array_length(slots)<>n then raise exception 'Jadwal harus mencakup seluruh bab impor.';end if;
  if exists(select 1 from jsonb_to_recordset(slots) s(episode_number int,release_at timestamptz) where s.episode_number is null or (s.release_at is not null and s.release_at<=now()))
  or (select count(distinct s.episode_number) from jsonb_to_recordset(slots) s(episode_number int))<>n
  or exists(select 1 from jsonb_to_recordset(slots) s(episode_number int) where not exists(select 1 from jsonb_to_recordset(p_payload->'episodes') e(episode_number int) where e.episode_number=s.episode_number)) then raise exception 'Bab atau waktu penerbitan berubah. Periksa kembali pratinjau.';end if;
  if (mode='now' and exists(select 1 from jsonb_to_recordset(slots) s(release_at timestamptz) where s.release_at is not null))
  or (mode='schedule' and exists(select 1 from jsonb_to_recordset(slots) s(release_at timestamptz) where s.release_at is null)) then raise exception 'Mode dan pratinjau penerbitan tidak cocok.';end if;
  if exists(select 1 from public.qr_episodes e join jsonb_to_recordset(slots) s(release_at timestamptz) on e.release_at=s.release_at where e.book_id=target and e.is_enabled and e.deleted_at is null) then raise exception 'Waktu rilis sudah digunakan. Periksa kembali jadwal.';end if;
  if exists(select 1 from jsonb_to_recordset(slots) s(release_at timestamptz) where s.release_at is not null group by s.release_at having count(*)>1) then raise exception 'Waktu rilis tidak boleh berulang.';end if;
  update public.qr_episodes e set is_enabled=true,release_at=coalesce(s.release_at,now()) from jsonb_to_recordset(slots) s(episode_number int,release_at timestamptz) where e.book_id=target and e.episode_number=s.episode_number and not e.is_enabled and e.release_at is null and e.deleted_at is null;
  get diagnostics changed=row_count;if changed<>n then raise exception 'Penerbitan tidak lengkap; impor dibatalkan.';end if;
  update public.qr_books set is_published=true where id=target and deleted_at is null;
  if mode in ('schedule','mixed') then
   select array_agg(value::int) into rule_days from jsonb_array_elements_text(pub->'weekdays');
   if coalesce(cardinality(rule_days),0) not between 1 and 7 or not rule_days<@array[0,1,2,3,4,5,6] then raise exception 'Hari terbit tidak valid.';end if;
   insert into public.qr_release_rules(book_id,weekdays,time_wib,is_active) values(target,rule_days,(pub->>'time')::time,true) on conflict(book_id) do update set weekdays=excluded.weekdays,time_wib=excluded.time_wib,is_active=true;
  end if;
 end if;
 receipt:=receipt||jsonb_build_object('publication_mode',mode);
 update public.qr_import_requests set result=receipt where actor_id=actor and request_id=p_request_id;
 return receipt;
end $$;
create function public.qr_import_manuscript_v75(p_request_id uuid,p_payload jsonb) returns jsonb language sql security invoker set search_path='' as $$select kk_private.import_publish(p_request_id,p_payload)$$;
revoke all on function kk_private.import_publish(uuid,jsonb),public.qr_import_manuscript_v75(uuid,jsonb) from public,anon;
grant execute on function kk_private.import_publish(uuid,jsonb),public.qr_import_manuscript_v75(uuid,jsonb) to authenticated;

create function kk_private.paused_episodes(p_book_id text) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null or not exists(select 1 from public.qr_author_members where user_id=auth.uid()) then raise exception 'Tidak mempunyai izin penulis.' using errcode='42501';end if;
 return coalesce((select jsonb_agg(p.episode_id) from kk_private.paused_releases p join public.qr_episodes e on e.id=p.episode_id join public.qr_books b on b.id=e.book_id where p.book_id=p_book_id and e.deleted_at is null and b.deleted_at is null and not e.is_enabled and e.release_at is null),'[]'::jsonb);
end $$;
create function public.qr_paused_episodes_v75(p_book_id text) returns jsonb language sql security invoker set search_path='' as $$select kk_private.paused_episodes(p_book_id)$$;
revoke all on function kk_private.paused_episodes(text),public.qr_paused_episodes_v75(text) from public,anon;
grant execute on function kk_private.paused_episodes(text),public.qr_paused_episodes_v75(text) to authenticated;

create function kk_private.schedule_change(p_request_id uuid,p_book_id text,p_action text,p_items jsonb,p_weekdays int[],p_time time) returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid(); fp text; prior kk_private.management_receipts; item record; ep public.qr_episodes; n int; result jsonb;
begin
 if actor is null or not exists(select 1 from public.qr_author_members where user_id=actor) then raise exception 'Tidak mempunyai izin penulis.' using errcode='42501';end if;
 if p_request_id is null or p_action is null or p_action not in ('schedule','pause','resume','reschedule') or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Pilihan jadwal tidak valid.';end if;
 n:=jsonb_array_length(p_items);if (n<1 or n>case when p_action='pause' then 6000 else 1000 end) then raise exception 'Jumlah bab melebihi batas operasi.';end if;
 fp:=md5(jsonb_build_object('book',p_book_id,'action',p_action,'items',p_items,'days',p_weekdays,'time',p_time)::text);
 perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,75));
 select * into prior from kk_private.management_receipts where actor_id=actor and request_id=p_request_id;
 if found then if prior.fingerprint<>fp then raise exception 'Identitas operasi dipakai untuk pilihan berbeda.';end if;return prior.result;end if;
 perform 1 from public.qr_books where id=p_book_id and deleted_at is null for update;
 if not found then raise exception 'Novel tidak tersedia atau berada di Sampah.';end if;
 perform 1 from public.qr_episodes where book_id=p_book_id order by id for update;
 if (select count(distinct s.episode_id) from jsonb_to_recordset(p_items) s(episode_id uuid))<>n then raise exception 'Bab tidak valid atau berulang.';end if;
 for item in select * from jsonb_to_recordset(p_items) s(episode_id uuid,release_at timestamptz,expected_release_at timestamptz,expected_enabled boolean) loop
  select * into ep from public.qr_episodes where id=item.episode_id and book_id=p_book_id and deleted_at is null;
  if not found or ep.is_enabled is distinct from item.expected_enabled or ep.release_at is distinct from item.expected_release_at then raise exception 'Jadwal berubah. Muat ulang dan periksa pilihan.';end if;
  if p_action in ('pause','reschedule') and (not ep.is_enabled or ep.release_at is null or ep.release_at<=now()) then raise exception 'Hanya bab mendatang yang dapat diubah.';end if;
  if p_action in ('schedule','resume') and (ep.is_enabled or ep.release_at is not null) then raise exception 'Hanya draf tanpa jadwal yang dapat dijadwalkan.';end if;
  if p_action='resume' and not exists(select 1 from kk_private.paused_releases where episode_id=ep.id) then raise exception 'Bab tidak sedang dijeda.';end if;
  if p_action='schedule' and exists(select 1 from kk_private.paused_releases where episode_id=ep.id) then raise exception 'Gunakan Lanjutkan untuk bab yang dijeda.';end if;
  if p_action<>'pause' and (item.release_at is null or item.release_at<=now()) then raise exception 'Waktu terbit harus di masa depan.';end if;
 end loop;
 if p_action<>'pause' then
  if (select count(distinct s.release_at) from jsonb_to_recordset(p_items) s(release_at timestamptz))<>n then raise exception 'Waktu rilis tidak boleh berulang.';end if;
  if exists(select 1 from public.qr_episodes e join jsonb_to_recordset(p_items) s(release_at timestamptz) on e.release_at=s.release_at where e.book_id=p_book_id and e.is_enabled and e.deleted_at is null and not exists(select 1 from jsonb_to_recordset(p_items) t(episode_id uuid) where t.episode_id=e.id)) then raise exception 'Waktu rilis sudah digunakan.';end if;
  if coalesce(cardinality(p_weekdays),0) not between 1 and 7 or not p_weekdays<@array[0,1,2,3,4,5,6] or p_time is null then raise exception 'Pola jadwal tidak valid.';end if;
 end if;
 if p_action='pause' then
  insert into kk_private.paused_releases(episode_id,book_id,release_at) select e.id,e.book_id,e.release_at from public.qr_episodes e join jsonb_to_recordset(p_items) s(episode_id uuid) on e.id=s.episode_id on conflict(episode_id) do update set release_at=excluded.release_at,paused_at=now();
  update public.qr_episodes e set is_enabled=false,release_at=null from jsonb_to_recordset(p_items) s(episode_id uuid) where e.id=s.episode_id;
  update public.qr_release_rules set is_active=false where book_id=p_book_id;
 else
  update public.qr_episodes e set is_enabled=true,release_at=s.release_at from jsonb_to_recordset(p_items) s(episode_id uuid,release_at timestamptz) where e.id=s.episode_id;
  delete from kk_private.paused_releases p using jsonb_to_recordset(p_items) s(episode_id uuid) where p.episode_id=s.episode_id;
  insert into public.qr_release_rules(book_id,weekdays,time_wib,is_active) values(p_book_id,p_weekdays,p_time,true) on conflict(book_id) do update set weekdays=excluded.weekdays,time_wib=excluded.time_wib,is_active=true;
 end if;
 result:=jsonb_build_object('count',n);
 insert into kk_private.management_receipts values(actor,p_request_id,fp,result,now());return result;
end $$;
create function public.qr_schedule_change_v75(p_request_id uuid,p_book_id text,p_action text,p_items jsonb,p_weekdays int[] default null,p_time time default null) returns jsonb language sql security invoker set search_path='' as $$select kk_private.schedule_change(p_request_id,p_book_id,p_action,p_items,p_weekdays,p_time)$$;
revoke all on function kk_private.schedule_change(uuid,text,text,jsonb,int[],time),public.qr_schedule_change_v75(uuid,text,text,jsonb,int[],time) from public,anon;
grant execute on function kk_private.schedule_change(uuid,text,text,jsonb,int[],time),public.qr_schedule_change_v75(uuid,text,text,jsonb,int[],time) to authenticated;

-- Server-only cleanup inventory, consumed by scripts/deleted-cover-cleanup.mjs.
create function public.qr_deleted_cover_cleanup_v75(p_done text default null) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if p_done is not null then
  if exists(select 1 from public.qr_books where id=p_done) then raise exception 'Identitas novel masih digunakan; pembersihan dibatalkan.';end if;
  update kk_private.deleted_book_cleanup set cleaned_at=now() where book_id=p_done;
 end if;
 return coalesce((select jsonb_agg(t) from (select book_id,queued_at from kk_private.deleted_book_cleanup where cleaned_at is null and queued_at<now()-interval '10 minutes' order by queued_at limit 100) t),'[]'::jsonb);
end $$;
revoke all on function public.qr_deleted_cover_cleanup_v75(text) from public,anon,authenticated;
grant execute on function public.qr_deleted_cover_cleanup_v75(text) to service_role;
commit;

