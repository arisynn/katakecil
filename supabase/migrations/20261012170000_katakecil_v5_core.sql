-- KataKecil V5 G1-G3: additive schema + transactional import + recoverable trash.
-- APPLY ONLY after a verified backup and migration 20261012060000_episode_zero_v43.
-- Existing manuscript text, publication flags, schedules, and book visibility are untouched.

alter table public.qr_books add column if not exists deleted_at timestamptz;
alter table public.qr_episodes add column if not exists deleted_at timestamptz;
-- Stage-2 metadata filters require column SELECT without exposing content_md.
grant select(deleted_at) on table public.qr_episodes to anon,authenticated;
create index if not exists qr_books_deleted_at_idx on public.qr_books(deleted_at) where deleted_at is not null;
create index if not exists qr_episodes_deleted_at_idx on public.qr_episodes(deleted_at) where deleted_at is not null;

create table if not exists public.qr_book_sections (
 id uuid primary key default gen_random_uuid(),
 book_id text not null references public.qr_books(id),
 position integer not null check (position between 0 and 9999),
 section_type text not null check (section_type in ('frontmatter','arc')),
 title text not null check (char_length(btrim(title)) between 1 and 180),
 content_md text not null check (char_length(btrim(content_md)) between 1 and 1000000),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 deleted_at timestamptz,
 unique(book_id,position)
);
create index if not exists qr_book_sections_book_idx on public.qr_book_sections(book_id,position);
alter table public.qr_book_sections enable row level security;
revoke all on public.qr_book_sections from public,anon,authenticated;
grant select,insert,update on public.qr_book_sections to authenticated;
grant all on public.qr_book_sections to service_role;
drop policy if exists "V5 author reads sections" on public.qr_book_sections;
create policy "V5 author reads sections" on public.qr_book_sections for select to authenticated
 using (exists (select 1 from public.qr_author_members m where m.user_id=(select auth.uid())));
drop policy if exists "V5 author adds sections" on public.qr_book_sections;
create policy "V5 author adds sections" on public.qr_book_sections for insert to authenticated
 with check (exists (select 1 from public.qr_author_members m where m.user_id=(select auth.uid())));
drop policy if exists "V5 author edits sections" on public.qr_book_sections;
create policy "V5 author edits sections" on public.qr_book_sections for update to authenticated
 using (exists (select 1 from public.qr_author_members m where m.user_id=(select auth.uid())))
 with check (exists (select 1 from public.qr_author_members m where m.user_id=(select auth.uid())));

alter table public.qr_import_batches add column if not exists sections_count integer not null default 0;
alter table public.qr_import_batches drop constraint if exists qr_import_batches_imported_count_check;
alter table public.qr_import_batches add constraint qr_import_batches_imported_count_check check (imported_count between 0 and 120);

-- One Postgres transaction for new book, sections, episodes and import history.
-- SECURITY DEFINER is intentional: stage-2 revokes direct SELECT of content_md.
-- An author membership check AND locked book row are enforced in the function.
create or replace function public.qr_import_manuscript_v5(
 p_book_id text, p_new_title text, p_new_genre text,
 p_source_name text, p_format text, p_title_detected text,
 p_episodes jsonb, p_sections jsonb
) returns jsonb language plpgsql security definer set search_path='' as $$
declare
 actor uuid := (select auth.uid());
 ep_count integer; sec_count integer; ep_added integer; sec_added integer;
 book_id text; new_batch_id uuid; is_new boolean;
begin
 if actor is null or not exists(select 1 from public.qr_author_members m where m.user_id=actor) then
  raise exception 'Tidak mempunyai izin penulis.' using errcode='42501';
 end if;
 if p_book_id is null or p_book_id !~ '^[a-z0-9][a-z0-9_-]{0,95}$'
  or p_source_name is null or length(p_source_name) not between 1 and 255
  or p_format not in ('epub','md','txt') or length(coalesce(p_title_detected,''))>200
  or jsonb_typeof(p_episodes) is distinct from 'array' or jsonb_typeof(p_sections) is distinct from 'array' then
  raise exception 'Metadata impor tidak valid.';
 end if;
 ep_count:=jsonb_array_length(p_episodes);sec_count:=jsonb_array_length(p_sections);
 if ep_count>120 or sec_count>60 or ep_count+sec_count<1 then
  raise exception 'Impor harus memiliki 1-120 episode dan maksimal 60 halaman buku.';
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
   where s.position is null or s.position not between 0 and 9999 or s.section_type not in ('frontmatter','arc')
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
 book_id:=p_book_id;
 if exists(select 1 from public.qr_episodes old join jsonb_to_recordset(p_episodes) as e(episode_number integer,content_md text)
    on old.episode_number=e.episode_number or md5(btrim(old.content_md))=md5(btrim(e.content_md))
    where old.book_id=book_id) then
  raise exception 'Nomor atau isi episode sudah pernah digunakan pada novel ini.';
 end if;
 if exists(select 1 from public.qr_book_sections old join jsonb_to_recordset(p_sections) as s(position integer)
   on old.position=s.position where old.book_id=book_id) then
  raise exception 'Urutan halaman buku sudah digunakan. Periksa halaman lama sebelum mengimpor.';
 end if;
 insert into public.qr_book_sections(book_id,position,section_type,title,content_md)
   select book_id,s.position,s.section_type,btrim(s.title),s.content_md
   from jsonb_to_recordset(p_sections) as s(position integer,section_type text,title text,content_md text);
 get diagnostics sec_added=row_count;
 insert into public.qr_episodes(book_id,episode_number,title,arc_title,content_md,is_enabled,release_at)
   select book_id,e.episode_number,btrim(e.title),coalesce(btrim(e.arc_title),''),e.content_md,false,null
   from jsonb_to_recordset(p_episodes) as e(episode_number integer,title text,arc_title text,content_md text);
 get diagnostics ep_added=row_count;
 if ep_added<>ep_count or sec_added<>sec_count then raise exception 'Impor tidak lengkap; perubahan dibatalkan.';end if;
 insert into public.qr_import_batches(book_id,actor_id,source_name,source_format,detected_title,imported_count,sections_count)
   values(book_id,actor,p_source_name,p_format,coalesce(p_title_detected,''),ep_added,sec_added)
   returning id into new_batch_id;
 return jsonb_build_object('book_id',book_id,'created_book',is_new,'batch_id',new_batch_id,
   'imported_count',ep_added,'sections_count',sec_added);
end;
$$;
revoke all on function public.qr_import_manuscript_v5(text,text,text,text,text,text,jsonb,jsonb) from public,anon,authenticated;
grant execute on function public.qr_import_manuscript_v5(text,text,text,text,text,text,jsonb,jsonb) to authenticated;

-- Soft-delete changes only the targeted record's publication flags. Existing episodes
-- in a trashed book keep their schedules, but the book itself becomes private.
-- Restoring a book remains private; restoring an episode remains a draft.
create or replace function public.qr_trash_item(p_kind text,p_id text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid()))
  then raise exception 'Tidak mempunyai izin penulis.' using errcode='42501'; end if;
 if p_kind='book' then
  update public.qr_books set deleted_at=now(),is_published=false,is_featured=false
   where id=p_id and deleted_at is null;
 elsif p_kind='episode' then
  update public.qr_episodes set deleted_at=now(),is_enabled=false,release_at=null
   where id::text=p_id and deleted_at is null;
 elsif p_kind='section' then
  update public.qr_book_sections set deleted_at=now()
   where id::text=p_id and deleted_at is null;
 else raise exception 'Tipe item tidak valid.'; end if;
 if not found then raise exception 'Item tidak ditemukan atau sudah ada di Sampah.';end if;
 return true;
end;
$$;
revoke all on function public.qr_trash_item(text,text) from public,anon,authenticated;
grant execute on function public.qr_trash_item(text,text) to authenticated;

create or replace function public.qr_restore_item(p_kind text,p_id text)
returns boolean language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid()))
  then raise exception 'Tidak mempunyai izin penulis.' using errcode='42501'; end if;
 if p_kind='book' then
  update public.qr_books set deleted_at=null,is_published=false,is_featured=false
   where id=p_id and deleted_at is not null;
 elsif p_kind='episode' then
  update public.qr_episodes set deleted_at=null,is_enabled=false,release_at=null
   where id::text=p_id and deleted_at is not null;
 elsif p_kind='section' then
  update public.qr_book_sections set deleted_at=null
   where id::text=p_id and deleted_at is not null;
 else raise exception 'Tipe item tidak valid.'; end if;
 if not found then raise exception 'Item tidak ditemukan di Sampah.';end if;
 return true;
end;
$$;
revoke all on function public.qr_restore_item(text,text) from public,anon,authenticated;
grant execute on function public.qr_restore_item(text,text) to authenticated;

create or replace function public.qr_get_trash()
returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid()) is null or not exists(select 1 from public.qr_author_members m where m.user_id=(select auth.uid()))
  then raise exception 'Tidak mempunyai izin penulis.' using errcode='42501'; end if;
 return jsonb_build_object(
  'books',coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'title',b.title,'deleted_at',b.deleted_at)
        order by b.deleted_at desc) from (select * from public.qr_books where deleted_at is not null limit 200) b),'[]'::jsonb),
  'episodes',coalesce((select jsonb_agg(jsonb_build_object('id',e.id,'book_id',e.book_id,'episode_number',e.episode_number,'title',e.title,'deleted_at',e.deleted_at)
        order by e.deleted_at desc) from (select * from public.qr_episodes where deleted_at is not null limit 500) e),'[]'::jsonb),
  'sections',coalesce((select jsonb_agg(jsonb_build_object('id',s.id,'book_id',s.book_id,'title',s.title,'deleted_at',s.deleted_at)
        order by s.deleted_at desc) from (select * from public.qr_book_sections where deleted_at is not null limit 500) s),'[]'::jsonb)
 );
end;
$$;
revoke all on function public.qr_get_trash() from public,anon,authenticated;
grant execute on function public.qr_get_trash() to authenticated;

-- Do not apply stage-2 content column privilege lockdown until secure-episode is
-- deployed, validated, and preview/frontend readers are updated (separate step).
