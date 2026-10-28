-- Studio workspace: stable reading identities, private drafts, immutable release snapshots.
create table public.qr_studio_books (
 book_id text primary key references public.qr_books(id) on delete cascade,
 created_at timestamptz not null default now()
);
create table public.qr_studio_sources(book_id text primary key references public.qr_studio_books(book_id)on delete cascade,sources jsonb not null default '[]');
create table public.qr_studio_contents (
 id uuid primary key default gen_random_uuid(),book_id text not null references public.qr_studio_books(book_id) on delete cascade,
 reader_number integer not null check(reader_number between 0 and 9999), position integer not null,
 kind text not null check(kind in ('chapter','prologue','epilogue','page','divider')),
 display_number integer check(display_number between 0 and 9999),title text not null check(length(btrim(title)) between 1 and 180),arc_title text not null default '',
 content_md text not null default '' check(length(content_md)<=1000000),content_html text not null default '' check(octet_length(content_html)<=4000000),source jsonb,
 revision integer not null default 1,deleted_at timestamptz,updated_at timestamptz not null default now(),
 unique(book_id,reader_number)
);
create table public.qr_studio_versions (
 id uuid primary key default gen_random_uuid(),section_id uuid not null references public.qr_studio_contents(id) on delete cascade,
 revision integer not null,document jsonb not null,created_at timestamptz not null default now(),unique(section_id,revision)
);
create table public.qr_studio_releases (
 id uuid primary key references public.qr_studio_contents(id) on delete cascade,
 book_id text not null references public.qr_books(id) on delete cascade,reader_number integer not null,
 position integer not null,kind text not null,display_number integer,title text not null,arc_title text not null default '',
 version_id uuid not null references public.qr_studio_versions(id),published_revision integer not null,
 is_enabled boolean not null default false,release_at timestamptz,unique(book_id,reader_number)
);
create table public.qr_studio_operations (
 actor_id uuid not null,request_id uuid not null,payload_hash text not null,response jsonb not null,created_at timestamptz not null default now(),primary key(actor_id,request_id)
);
create index qr_studio_contents_book_position on public.qr_studio_contents(book_id,position);
create index qr_studio_releases_version on public.qr_studio_releases(version_id);
create index qr_studio_releases_book_time on public.qr_studio_releases(book_id,release_at) where is_enabled;
create index qr_studio_versions_section_date on public.qr_studio_versions(section_id,created_at desc);
alter table public.qr_studio_books enable row level security;
alter table public.qr_studio_sources enable row level security;
alter table public.qr_studio_contents enable row level security;
alter table public.qr_studio_versions enable row level security;
alter table public.qr_studio_releases enable row level security;
alter table public.qr_studio_operations enable row level security;
revoke all on public.qr_studio_books,public.qr_studio_sources,public.qr_studio_contents,public.qr_studio_versions,public.qr_studio_releases,public.qr_studio_operations from public,anon,authenticated;
grant all on public.qr_studio_books,public.qr_studio_sources,public.qr_studio_contents,public.qr_studio_versions,public.qr_studio_releases,public.qr_studio_operations to service_role;
grant select,insert,update,delete on public.qr_studio_books,public.qr_studio_sources,public.qr_studio_contents,public.qr_studio_versions,public.qr_studio_releases,public.qr_studio_operations to authenticated;
revoke update on public.qr_studio_versions from authenticated;
grant select(book_id) on public.qr_studio_books to anon;
grant select on public.qr_studio_releases to anon;
create policy studio_books_author on public.qr_studio_books for all to authenticated using(exists(select 1 from public.qr_author_members where user_id=(select auth.uid()))) with check(exists(select 1 from public.qr_author_members where user_id=(select auth.uid())));
create policy studio_sources_author on public.qr_studio_sources for all to authenticated using(exists(select 1 from public.qr_author_members where user_id=(select auth.uid())))with check(exists(select 1 from public.qr_author_members where user_id=(select auth.uid())));
create policy studio_contents_author on public.qr_studio_contents for all to authenticated using(exists(select 1 from public.qr_author_members where user_id=(select auth.uid()))) with check(exists(select 1 from public.qr_author_members where user_id=(select auth.uid())));
create policy studio_versions_author on public.qr_studio_versions for all to authenticated using(exists(select 1 from public.qr_author_members where user_id=(select auth.uid()))) with check(exists(select 1 from public.qr_author_members where user_id=(select auth.uid())));
create policy studio_releases_author on public.qr_studio_releases for all to authenticated using(exists(select 1 from public.qr_author_members where user_id=(select auth.uid()))) with check(exists(select 1 from public.qr_author_members where user_id=(select auth.uid())));
create policy studio_operations_author on public.qr_studio_operations for all to authenticated using(actor_id=(select auth.uid()) and exists(select 1 from public.qr_author_members where user_id=(select auth.uid()))) with check(actor_id=(select auth.uid()) and exists(select 1 from public.qr_author_members where user_id=(select auth.uid())));
create policy studio_books_public on public.qr_studio_books for select to anon,authenticated using(exists(select 1 from public.qr_books b where b.id=book_id and b.is_published and b.deleted_at is null));
create policy studio_releases_public on public.qr_studio_releases for select to anon,authenticated using(is_enabled and release_at<=now() and exists(select 1 from public.qr_books b where b.id=book_id and b.is_published and b.deleted_at is null));
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('studio-sources','studio-sources',false,20000000,array['application/epub+zip','application/zip','text/plain','text/markdown','application/octet-stream']) on conflict(id) do nothing;
create policy studio_sources_author_select on storage.objects for select to authenticated using(bucket_id='studio-sources' and exists(select 1 from public.qr_author_members where user_id=(select auth.uid())));
create policy studio_sources_author_insert on storage.objects for insert to authenticated with check(bucket_id='studio-sources' and exists(select 1 from public.qr_author_members where user_id=(select auth.uid())));

create function public.qr_studio_kind(p_title text) returns text language sql immutable set search_path='' as $$
 select case when p_title~*'^(prolog|prologue)\M' then 'prologue' when p_title~*'^(epilog|epilogue)\M' then 'epilogue'
 when p_title~*'^(arc|bagian|part|jilid|volume)\s+[0-9ivxlcdm]+' then 'divider'
 when p_title~*'^(kata pengantar|pengantar|prakata|dedikasi|persembahan|hak cipta|copyright|cover|sampul|titlepage|halaman judul|daftar isi|tentang penulis|catatan penulis|preface|foreword|dedication|acknowledgments|contents|toc)\M' then 'page' else 'chapter' end
$$;
revoke all on function public.qr_studio_kind(text) from public,anon,authenticated;
grant execute on function public.qr_studio_kind(text) to authenticated,service_role;

create function public.qr_studio_mutate(p_request_id uuid,p_action text,p_payload jsonb) returns jsonb language plpgsql security invoker set search_path='' as $$
declare
 actor uuid:=auth.uid();bid text:=p_payload->>'book_id';digest text:=md5(p_action||p_payload::text);receipt record;item jsonb;doc jsonb;r public.qr_studio_contents;old record;asset record;hist jsonb;historical jsonb;
 sid uuid;vid uuid;idx integer:=0;n integer:=0;display_no integer:=0;pos integer:=0;changed integer:=0;skipped integer:=0;ids jsonb:='[]';release_items jsonb:='[]';response jsonb;release_time timestamptz;kind text;mode text:=coalesce(p_payload->>'mode','draft');
begin
 if actor is null or not exists(select 1 from public.qr_author_members where user_id=actor) then raise exception 'Tidak memiliki izin penulis'; end if;
 if p_request_id is null or bid is null or bid!~'^[a-zA-Z0-9][a-zA-Z0-9_-]{0,95}$' then raise exception 'Identitas operasi/buku tidak valid'; end if;
 if octet_length(p_payload::text)>20000000 then raise exception 'Total naskah maksimal 20 MB per operasi'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text||p_request_id::text,0));
 select * into receipt from public.qr_studio_operations where actor_id=actor and request_id=p_request_id;
 if found then if receipt.payload_hash<>digest then raise exception 'Identitas operasi memakai isi berbeda'; end if;return receipt.response;end if;
 if p_action='import' and length(btrim(coalesce(p_payload->>'new_title','')))>0 and not exists(select 1 from public.qr_books where id=bid) then
  insert into public.qr_books(id,slug,title,synopsis,genre,status,is_published,is_featured) values(bid,bid,left(btrim(p_payload->>'new_title'),180),'','Fiksi','ongoing',false,false);
 end if;
 perform 1 from public.qr_books where id=bid and deleted_at is null for update;
 if not found then raise exception 'Buku tidak tersedia';end if;
 if p_action='adopt' then
  if not exists(select 1 from public.qr_studio_books where book_id=bid) then
   insert into public.qr_studio_books(book_id) values(bid);
   for old in select e.id,e.episode_number,e.title,e.arc_title,e.is_enabled,e.release_at,(public.qr_author_episode_v72(e.id)->>'editor_version')::integer as editor_version,public.qr_author_episode_v72(e.id)->>'content_md' as content_md from public.qr_episodes e where e.book_id=bid and e.deleted_at is null order by e.episode_number loop
    kind:=public.qr_studio_kind(old.title);if kind='chapter' then display_no:=display_no+1;end if;
    insert into public.qr_studio_contents(id,book_id,reader_number,position,kind,display_number,title,arc_title,content_md,revision) values(old.id,bid,old.episode_number,idx*100,kind,case when kind='chapter' then old.episode_number end,old.title,coalesce(old.arc_title,''),coalesce(old.content_md,''),coalesce(old.editor_version,0)+1) returning * into r;
    doc:=jsonb_build_object('title',r.title,'arc_title',r.arc_title,'kind',r.kind,'display_number',r.display_number,'content_md',r.content_md,'content_html','','source',null);
    insert into public.qr_studio_versions(section_id,revision,document)values(r.id,r.revision,doc)returning id into vid;
    insert into public.qr_studio_releases values(r.id,bid,r.reader_number,r.position,r.kind,r.display_number,r.title,r.arc_title,vid,r.revision,coalesce(old.is_enabled,false),old.release_at);
    for hist in select value from jsonb_array_elements(public.qr_episode_revisions_v74(old.id))loop
     if (hist->>'source_version')::integer+1>=r.revision then continue;end if;
     historical:=public.qr_episode_revision_v74(old.id,(hist->>'id')::uuid);
     insert into public.qr_studio_versions(section_id,revision,document,created_at)values(r.id,(hist->>'source_version')::integer+1,jsonb_build_object('title',historical->>'title','arc_title',historical->>'arc_title','kind',r.kind,'display_number',r.display_number,'content_md',historical->>'content_md','content_html','','source',null),(hist->>'captured_at')::timestamptz)on conflict(section_id,revision)do nothing;
    end loop;
    idx:=idx+1;n:=greatest(n,old.episode_number+1);
   end loop;
   for old in select * from public.qr_book_sections where book_id=bid and deleted_at is null order by position loop
    kind:=case when old.section_type='arc' then 'divider' else 'page' end;
    insert into public.qr_studio_contents(id,book_id,reader_number,position,kind,title,content_md)values(old.id,bid,n,-100000+old.position,kind,old.title,old.content_md);n:=n+1;
   end loop;
   select * into asset from public.qr_book_epubs where book_id=bid;
   if found then
    for old in select * from public.qr_epub_releases where book_id=bid order by section_index loop
     kind:=public.qr_studio_kind(old.title);if kind='chapter' then display_no:=display_no+1;end if;
     doc:=jsonb_build_object('bucket','book-epubs','path',asset.object_path,'sha256',asset.sha256,'byte_size',asset.byte_size,'indices',jsonb_build_array(old.section_index),'ranges',jsonb_build_array(jsonb_build_object('start',asset.toc->old.section_index->>'href','end',asset.toc->(old.section_index+1)->>'href')));
     insert into public.qr_studio_contents(id,book_id,reader_number,position,kind,display_number,title,source) values(old.id,bid,old.episode_number,old.section_index*100,kind,case when kind='chapter' then display_no end,old.title,doc) returning * into r;
     doc:=jsonb_build_object('title',r.title,'arc_title','','kind',r.kind,'display_number',r.display_number,'content_md','','content_html','','source',r.source);
     insert into public.qr_studio_versions(section_id,revision,document)values(r.id,r.revision,doc)returning id into vid;
     insert into public.qr_studio_releases values(r.id,bid,r.reader_number,r.position,r.kind,r.display_number,r.title,'',vid,1,old.is_enabled,old.release_at);
    end loop;
   end if;
  end if;
 elsif p_action in ('import','save') then
  insert into public.qr_studio_books(book_id)values(bid)on conflict do nothing;
  if p_action='import' and (jsonb_typeof(p_payload->'items')<>'array' or jsonb_array_length(p_payload->'items') not between 1 and 1000) then raise exception 'Pilih 1–1000 bagian';end if;
  select coalesce(max(reader_number)+1,1),coalesce(max(position)+100,0) into n,pos from public.qr_studio_contents where book_id=bid;
  for item in select value from jsonb_array_elements(case when p_action='save' then jsonb_build_array(p_payload->'item') else p_payload->'items' end) loop
   doc:=item->'document';
   if jsonb_typeof(doc)<>'object' or doc->>'kind' not in ('chapter','prologue','epilogue','page','divider') or length(btrim(coalesce(doc->>'title',''))) not between 1 and 180 or length(coalesce(doc->>'content_md',''))>1000000 or octet_length(coalesce(doc->>'content_html',''))>4000000 then raise exception 'Format naskah tidak valid';end if;
   if doc->'source' is not null and doc->'source'<>'null'::jsonb and (coalesce(doc->'source'->>'bucket','') not in ('book-epubs','studio-sources') or coalesce(doc->'source'->>'path','') not like bid||'/%' or coalesce(doc->'source'->>'sha256','') !~ '^[a-f0-9]{64}$' or jsonb_typeof(doc->'source'->'indices')<>'array') then raise exception 'Sumber EPUB tidak valid';end if;
   sid:=nullif(item->>'id','')::uuid;
   if sid is null and length(btrim(coalesce(doc->>'content_md','')))>0 and exists(select 1 from public.qr_studio_contents c where c.book_id=bid and c.deleted_at is null and md5(regexp_replace(btrim(c.content_md),'\s+',' ','g'))=md5(regexp_replace(btrim(doc->>'content_md'),'\s+',' ','g'))) then skipped:=skipped+1;continue;end if;
   if sid is not null then
    select * into r from public.qr_studio_contents where id=sid and book_id=bid and deleted_at is null for update;
    if not found then raise exception 'Bagian tidak tersedia';end if;
    if r.revision is distinct from (item->>'expected')::integer then raise exception using errcode='40001',message='Naskah berubah di tab/perangkat lain. Bandingkan sebelum menyimpan.';end if;
    update public.qr_studio_contents set title=btrim(doc->>'title'),arc_title=coalesce(doc->>'arc_title',''),kind=doc->>'kind',display_number=(doc->>'display_number')::integer,content_md=coalesce(doc->>'content_md',''),content_html=coalesce(doc->>'content_html',''),source=nullif(doc->'source','null'::jsonb),revision=revision+1,updated_at=now()where id=sid returning * into r;
   else
    insert into public.qr_studio_contents(book_id,reader_number,position,kind,display_number,title,arc_title,content_md,content_html,source)values(bid,n,pos,doc->>'kind',(doc->>'display_number')::integer,btrim(doc->>'title'),coalesce(doc->>'arc_title',''),coalesce(doc->>'content_md',''),coalesce(doc->>'content_html',''),nullif(doc->'source','null'::jsonb))returning * into r;
    n:=n+1;pos:=pos+100;
   end if;
   insert into public.qr_studio_versions(section_id,revision,document)values(r.id,r.revision,doc);
   delete from public.qr_studio_versions v where v.section_id=r.id and v.revision<r.revision-30 and not exists(select 1 from public.qr_studio_releases live where live.version_id=v.id);
   ids:=ids||jsonb_build_array(r.id);release_items:=release_items||jsonb_build_array(jsonb_build_object('id',r.id,'expected',r.revision,'release_at',item->>'release_at'));changed:=changed+1;
  end loop;
  if p_action='import' and mode in ('now','schedule') and changed>0 then perform public.qr_studio_mutate(gen_random_uuid(),'release',jsonb_build_object('book_id',bid,'mode',mode,'items',release_items));end if;
  if p_payload ? 'sources' then insert into public.qr_studio_sources(book_id,sources)values(bid,p_payload->'sources')on conflict(book_id)do update set sources=qr_studio_sources.sources||excluded.sources;end if;
 elsif p_action='release' then
  if mode not in ('now','schedule','draft','apply') or jsonb_array_length(p_payload->'items') not between 1 and 1000 then raise exception 'Pilihan rilis tidak valid';end if;
  for item in select value from jsonb_array_elements(p_payload->'items') loop
   select * into r from public.qr_studio_contents where id=(item->>'id')::uuid and book_id=bid and deleted_at is null for update;
   if not found then raise exception 'Bagian tidak tersedia';end if;
   if r.revision is distinct from (item->>'expected')::integer then raise exception 'Naskah berubah. Periksa ulang ringkasan rilis';end if;
   if mode='draft' then update public.qr_studio_releases set is_enabled=false,release_at=null where id=r.id;changed:=changed+1;continue;end if;
   if r.kind in ('chapter','prologue','epilogue') and r.source is null and (length(btrim(r.content_md))=0 or lower(regexp_replace(r.content_md,'[^[:alnum:]]','','g'))=lower(regexp_replace(r.title,'[^[:alnum:]]','','g'))) then raise exception 'Naskah hanya judul atau kosong: %',r.title;end if;
   release_time:=case when mode='now' then now() when mode='apply' then (select release_at from public.qr_studio_releases where id=r.id and is_enabled) else (item->>'release_at')::timestamptz end;
   if release_time is null or (mode='schedule' and release_time<=now()) then raise exception 'Pilih jadwal di masa depan';end if;
   doc:=jsonb_build_object('title',r.title,'arc_title',r.arc_title,'kind',r.kind,'display_number',r.display_number,'content_md',r.content_md,'content_html',r.content_html,'source',r.source);
   insert into public.qr_studio_versions(section_id,revision,document)values(r.id,r.revision,doc)on conflict(section_id,revision)do nothing;
   select id into vid from public.qr_studio_versions where section_id=r.id and revision=r.revision;
   insert into public.qr_studio_releases values(r.id,bid,r.reader_number,r.position,r.kind,r.display_number,r.title,r.arc_title,vid,r.revision,true,release_time)
   on conflict(id)do update set position=excluded.position,kind=excluded.kind,display_number=excluded.display_number,title=excluded.title,arc_title=excluded.arc_title,version_id=excluded.version_id,published_revision=excluded.published_revision,is_enabled=true,release_at=excluded.release_at;
   changed:=changed+1;
  end loop;
  if mode<>'draft' then update public.qr_books set is_published=true,updated_at=now()where id=bid;end if;
 elsif p_action='order' then
  if coalesce(jsonb_typeof(p_payload->'ids'),'')<>'array' or (select count(*) from public.qr_studio_contents where book_id=bid and deleted_at is null)<>jsonb_array_length(p_payload->'ids') or (select count(distinct value) from jsonb_array_elements_text(p_payload->'ids'))<>jsonb_array_length(p_payload->'ids') then raise exception 'Daftar isi berubah. Muat ulang';end if;
  for item in select value from jsonb_array_elements(p_payload->'ids')loop
   update public.qr_studio_contents set position=idx*100 where id=(item#>>'{}')::uuid and book_id=bid and deleted_at is null;if not found then raise exception 'Urutan tidak valid';end if;
   update public.qr_studio_releases set position=idx*100 where id=(item#>>'{}')::uuid and book_id=bid;idx:=idx+1;
  end loop;
 elsif p_action in ('trash','restore') then
  update public.qr_studio_contents set deleted_at=case when p_action='trash' then now() else null end where id=(p_payload->>'id')::uuid and book_id=bid;
  if not found then raise exception 'Bagian tidak tersedia';end if;
  update public.qr_studio_releases set is_enabled=false,release_at=null where id=(p_payload->>'id')::uuid and book_id=bid;changed:=1;
 else raise exception 'Aksi Studio tidak dikenal';end if;
 response:=jsonb_build_object('book_id',bid,'request_id',p_request_id,'changed',changed,'skipped',skipped,'ids',ids,'revision',case when p_action='save' then r.revision else null end);
 insert into public.qr_studio_operations values(actor,p_request_id,digest,response,now());return response;
end $$;
revoke all on function public.qr_studio_mutate(uuid,text,jsonb)from public,anon,authenticated;
grant execute on function public.qr_studio_mutate(uuid,text,jsonb)to authenticated;

-- Future publication metadata is deliberately separate from future titles and bodies.
create table public.qr_studio_schedule(id uuid primary key references public.qr_studio_releases(id) on delete cascade,book_id text not null references public.qr_books(id) on delete cascade,reader_number integer not null,display_number integer,kind text not null,release_at timestamptz not null);
alter table public.qr_studio_schedule enable row level security;
revoke all on public.qr_studio_schedule from public,anon,authenticated;
grant all on public.qr_studio_schedule to service_role;
grant select on public.qr_studio_schedule to anon,authenticated;
grant insert,update,delete on public.qr_studio_schedule to authenticated;
create policy studio_schedule_author on public.qr_studio_schedule for all to authenticated using(exists(select 1 from public.qr_author_members where user_id=(select auth.uid())))with check(exists(select 1 from public.qr_author_members where user_id=(select auth.uid())));
create policy studio_schedule_public on public.qr_studio_schedule for select to anon,authenticated using(exists(select 1 from public.qr_books b where b.id=book_id and b.is_published and b.deleted_at is null));
create index qr_studio_schedule_time on public.qr_studio_schedule(release_at);
create index qr_studio_schedule_book_time on public.qr_studio_schedule(book_id,release_at);
create function public.qr_studio_sync_schedule()returns trigger language plpgsql security invoker set search_path='' as $$
begin
 delete from public.qr_studio_schedule where id=new.id;
 if new.is_enabled and new.release_at is not null and new.kind in ('chapter','prologue','epilogue') then insert into public.qr_studio_schedule values(new.id,new.book_id,new.reader_number,new.display_number,new.kind,new.release_at);end if;
 return new;
end $$;
revoke all on function public.qr_studio_sync_schedule()from public,anon,authenticated;
create trigger studio_schedule_sync after insert or update on public.qr_studio_releases for each row execute function public.qr_studio_sync_schedule();

-- Once a book is adopted, legacy public tables cannot bypass Studio release decisions.
drop policy if exists "Quiet Reader: read released episodes only" on public.qr_episodes;
create policy "Quiet Reader: read released episodes only" on public.qr_episodes for select to anon,authenticated using(deleted_at is null and is_enabled and release_at<=now()and exists(select 1 from public.qr_books b where b.id=book_id and b.is_published and b.deleted_at is null)and not exists(select 1 from public.qr_studio_books s where s.book_id=qr_episodes.book_id));
drop policy if exists "EPUB releases public"on public.qr_epub_releases;
create policy "EPUB releases public"on public.qr_epub_releases for select to anon,authenticated using(is_enabled and release_at<=now()and exists(select 1 from public.qr_books b where b.id=book_id and b.is_published and b.deleted_at is null)and not exists(select 1 from public.qr_studio_books s where s.book_id=qr_epub_releases.book_id));
