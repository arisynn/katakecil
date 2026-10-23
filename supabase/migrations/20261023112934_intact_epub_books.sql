-- EPUB originals stay private and immutable. Only publication metadata is split.
-- Additive: no existing data or authentication policy is changed.
create table public.qr_epub_catalog(book_id text primary key references public.qr_books(id) on delete cascade);
create table public.qr_book_epubs (
 book_id text primary key references public.qr_epub_catalog(book_id) on delete cascade,
 object_path text not null unique,
 sha256 text not null check(sha256 ~ '^[0-9a-f]{64}$'),
 file_name text not null check(length(file_name) between 1 and 200),
 byte_size integer not null check(byte_size between 22 and 18000000),
 creator text not null default '' check(length(creator)<=180),
 language text not null default 'id' check(length(language)<=30),
 toc jsonb not null check(jsonb_typeof(toc)='array' and jsonb_array_length(toc) between 1 and 600 and octet_length(toc::text)<=300000)
);
create table public.qr_epub_releases (
 id uuid primary key default gen_random_uuid(),
 book_id text not null references public.qr_book_epubs(book_id) on delete cascade,
 section_index integer not null check(section_index between 0 and 599),
 episode_number integer not null check(episode_number between 0 and 9999),
 title text not null check(length(title) between 1 and 180),
 is_enabled boolean not null default false,
 release_at timestamptz,
 unique(book_id,section_index),unique(book_id,episode_number),
 foreign key(book_id) references public.qr_books(id) on delete cascade
);
-- Public future schedule has no title, archive path, TOC or manuscript.
create table public.qr_epub_schedule (
 id uuid primary key references public.qr_epub_releases(id) on delete cascade,
 book_id text not null references public.qr_books(id) on delete cascade,episode_number integer not null,release_at timestamptz not null
);
create index qr_epub_released_cursor on public.qr_epub_releases(release_at,id) where is_enabled;
create index qr_epub_schedule_book_date on public.qr_epub_schedule(book_id,release_at);

alter table public.qr_epub_catalog enable row level security;
alter table public.qr_book_epubs enable row level security;
alter table public.qr_epub_releases enable row level security;
alter table public.qr_epub_schedule enable row level security;
revoke all on public.qr_epub_catalog,public.qr_book_epubs,public.qr_epub_releases,public.qr_epub_schedule from public,anon,authenticated;
grant all on public.qr_epub_catalog,public.qr_book_epubs,public.qr_epub_releases,public.qr_epub_schedule to service_role;
grant select on public.qr_epub_catalog,public.qr_epub_releases,public.qr_epub_schedule to anon,authenticated;
grant select,insert,update on public.qr_book_epubs to authenticated;
grant insert on public.qr_epub_catalog to authenticated;
grant insert,update,delete on public.qr_epub_releases,public.qr_epub_schedule to authenticated;

create policy "EPUB catalog public" on public.qr_epub_catalog for select to anon,authenticated using(exists(select 1 from public.qr_books b where b.id=book_id and b.is_published and b.deleted_at is null));
create policy "EPUB catalog author" on public.qr_epub_catalog for all to authenticated using(exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid()))) with check(exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid())));
create policy "EPUB original author only" on public.qr_book_epubs for all to authenticated using(exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid()))) with check(exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid())));
create policy "EPUB releases public" on public.qr_epub_releases for select to anon,authenticated using(is_enabled and release_at<=now() and exists(select 1 from public.qr_books b where b.id=book_id and b.is_published and b.deleted_at is null));
create policy "EPUB releases author" on public.qr_epub_releases for all to authenticated using(exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid()))) with check(exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid())));
create policy "EPUB schedule public" on public.qr_epub_schedule for select to anon,authenticated using(exists(select 1 from public.qr_books b where b.id=book_id and b.is_published and b.deleted_at is null));
create policy "EPUB schedule author" on public.qr_epub_schedule for all to authenticated using(exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid()))) with check(exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid())));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('book-epubs','book-epubs',false,18000000,array['application/epub+zip']);
create policy "EPUB author upload" on storage.objects for insert to authenticated with check(bucket_id='book-epubs' and exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid())));
create policy "EPUB author read" on storage.objects for select to authenticated using(bucket_id='book-epubs' and exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid())));
-- No anonymous original-file access; no UPDATE/DELETE of uploaded originals.

create function public.qr_validate_epub() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.qr_books where id=new.book_id and deleted_at is null for update;
 if not found then raise exception 'Buku tidak tersedia'; end if;
 if tg_op='UPDATE' and new.book_id<>old.book_id then raise exception 'Identitas buku tidak boleh diubah'; end if;
 if new.book_id !~ '^[a-z0-9-]{1,96}$' then raise exception 'Identitas EPUB tidak valid'; end if;
 if tg_op='UPDATE' and new.object_path<>old.object_path and exists(select 1 from public.qr_epub_releases where book_id=new.book_id) then raise exception 'Gunakan penyimpanan EPUB atomik untuk mengganti sumber'; end if;
 if exists(select 1 from public.qr_episodes where book_id=new.book_id) then raise exception 'Gunakan buku baru untuk EPUB utuh; episode lama tetap tersimpan'; end if;
 if new.object_path !~ ('^' || new.book_id || '/[0-9a-f-]{36}\.epub$') then raise exception 'Path EPUB tidak valid'; end if;
 if not exists(select 1 from storage.objects where bucket_id='book-epubs' and name=new.object_path) then raise exception 'Unggah berkas terlebih dahulu'; end if;
 return new;
end $$;
revoke all on function public.qr_validate_epub() from public,anon,authenticated;
create trigger qr_validate_epub before insert or update on public.qr_book_epubs for each row execute function public.qr_validate_epub();

create function public.qr_episode_format_guard() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.qr_books where id=new.book_id for update;
 if exists(select 1 from public.qr_epub_catalog where book_id=new.book_id) then raise exception 'Buku EPUB utuh tidak memakai episode terpisah'; end if;
 return new;
end $$;
revoke all on function public.qr_episode_format_guard() from public,anon,authenticated;
create trigger qr_episode_format_guard before insert or update of book_id on public.qr_episodes for each row execute function public.qr_episode_format_guard();

create function public.qr_epub_release_schedule() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.qr_books where id=new.book_id for update;
 if tg_op='UPDATE' and (new.book_id<>old.book_id or new.section_index<>old.section_index) then raise exception 'Identitas episode tidak boleh diubah'; end if;
 if new.section_index >= (select jsonb_array_length(toc) from public.qr_book_epubs where book_id=new.book_id) then raise exception 'Bagian EPUB tidak valid'; end if;
 delete from public.qr_epub_schedule where id=new.id;
 if new.is_enabled and new.release_at is not null then
  insert into public.qr_epub_schedule(id,book_id,episode_number,release_at) values(new.id,new.book_id,new.episode_number,new.release_at);
 end if;
 return new;
end $$;
revoke all on function public.qr_epub_release_schedule() from public,anon,authenticated;
-- AFTER permits the schedule foreign key to refer to the new release row.
create trigger qr_epub_release_schedule after insert or update on public.qr_epub_releases for each row execute function public.qr_epub_release_schedule();

-- Atomic replacement resets publication metadata to drafts. Original EPUB bytes
-- are never split or copied to qr_episodes. Retry of the same path is idempotent.
create function public.qr_save_epub(p_file jsonb,p_expected_path text default null) returns text language plpgsql security invoker set search_path='' as $$
declare v_book text:=p_file->>'book_id';v_path text:=p_file->>'object_path';v_previous text;v_item jsonb;v_index integer:=0;
begin
 if not exists(select 1 from public.qr_author_members where user_id=(select auth.uid())) then raise exception 'Tidak memiliki izin penulis'; end if;
 perform 1 from public.qr_books where id=v_book and deleted_at is null for update;
 if not found then raise exception 'Buku tidak tersedia'; end if;
 select object_path into v_previous from public.qr_book_epubs where book_id=v_book;
 if v_previous=v_path then return v_book; end if;
 if v_previous is distinct from p_expected_path then raise exception 'EPUB berubah di sesi lain. Muat ulang'; end if;
 insert into public.qr_epub_catalog(book_id) values(v_book) on conflict do nothing;
 delete from public.qr_epub_releases where book_id=v_book;
 insert into public.qr_book_epubs(book_id,object_path,sha256,file_name,byte_size,creator,language,toc)
 values(v_book,v_path,p_file->>'sha256',p_file->>'file_name',(p_file->>'byte_size')::integer,coalesce(p_file->>'creator',''),coalesce(p_file->>'language','id'),p_file->'toc')
 on conflict(book_id) do update set object_path=excluded.object_path,sha256=excluded.sha256,file_name=excluded.file_name,byte_size=excluded.byte_size,creator=excluded.creator,language=excluded.language,toc=excluded.toc;
 for v_item in select value from jsonb_array_elements(p_file->'toc') loop
  insert into public.qr_epub_releases(book_id,section_index,episode_number,title) values(v_book,v_index,v_index+1,left(coalesce(nullif(v_item->>'title',''),'Bagian '||(v_index+1)),180));
  v_index:=v_index+1;
 end loop;
 return v_book;
end $$;
revoke all on function public.qr_save_epub(jsonb,text) from public,anon,authenticated;
grant execute on function public.qr_save_epub(jsonb,text) to authenticated;
