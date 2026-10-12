-- KataKecil V4: additive, private import provenance and all-or-nothing draft insertion.
-- NEVER changes any existing qr_episodes release_at/is_enabled, schedule or manuscript.
-- Apply only after V1/V2/V3, backup and security review.

create table if not exists public.qr_import_batches (
  id uuid primary key default gen_random_uuid(),
  book_id text not null references public.qr_books(id),
  actor_id uuid not null default auth.uid(),
  source_name text not null,
  source_format text not null check (source_format in ('epub','md','txt')),
  detected_title text not null default '',
  imported_count integer not null check (imported_count between 1 and 120),
  created_at timestamptz not null default now()
);
create index if not exists qr_import_batches_recent on public.qr_import_batches(created_at desc);
alter table public.qr_import_batches enable row level security;
revoke all on public.qr_import_batches from public, anon, authenticated;
grant select, insert on public.qr_import_batches to authenticated;
grant all on public.qr_import_batches to service_role;
drop policy if exists "Studio: author reads import batches" on public.qr_import_batches;
create policy "Studio: author reads import batches" on public.qr_import_batches for select to authenticated
using (actor_id = (select auth.uid()) and exists(select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));
drop policy if exists "Studio: author creates import batches" on public.qr_import_batches;
create policy "Studio: author creates import batches" on public.qr_import_batches for insert to authenticated
with check (actor_id = (select auth.uid()) and exists(select 1 from public.qr_author_members m where m.user_id = (select auth.uid())));
-- No browser UPDATE or DELETE grants. Log intentionally contains metadata only.

create or replace function public.qr_import_drafts(
  p_book_id text, p_source_name text, p_format text, p_title_detected text, p_episodes jsonb
)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
 n integer;
 unique_num integer;
 unique_body integer;
 imported integer;
 new_batch_id uuid;
begin
  if (select auth.uid()) is null or not exists(
    select 1 from public.qr_author_members m where m.user_id = (select auth.uid())
  ) then raise exception 'Tidak mempunyai izin penulis.'; end if;
  if p_book_id is null or p_source_name is null or length(p_source_name) < 1 or length(p_source_name) > 255
    or p_format not in ('epub','md','txt') or length(coalesce(p_title_detected,'')) > 200 then
    raise exception 'Metadata impor tidak valid.';
  end if;
  -- Acquire an exclusive book-row lock to serialize competing V4 import batches.
  perform 1 from public.qr_books where id=p_book_id for update;
  if not found then raise exception 'Novel tujuan tidak ditemukan.'; end if;
  if jsonb_typeof(p_episodes) is distinct from 'array' then raise exception 'Daftar episode harus array.'; end if;
  n:=jsonb_array_length(p_episodes);
  if n < 1 or n > 120 then raise exception 'Jumlah episode harus 1 hingga 120.'; end if;
  select count(distinct ep.episode_number), count(distinct md5(btrim(ep.content_md))) into unique_num,unique_body
  from jsonb_to_recordset(p_episodes) as ep(episode_number int,title text,arc_title text,content_md text);
  if unique_num <> n or unique_body <> n then raise exception 'Nomor atau isi episode berulang dalam impor.'; end if;
  if exists(
    select 1 from jsonb_to_recordset(p_episodes) as ep(episode_number int,title text,arc_title text,content_md text)
    where ep.episode_number is null or ep.episode_number < 1 or ep.episode_number > 9999
      or ep.title is null or length(btrim(ep.title))<1 or length(ep.title)>180
      or length(coalesce(ep.arc_title,''))>180 or ep.content_md is null
      or length(btrim(ep.content_md))<1 or length(ep.content_md)>1000000
  ) then raise exception 'Episode kosong, terlalu panjang, atau memiliki nomor tidak valid.'; end if;
  if (select coalesce(sum(octet_length(ep.content_md)),0) from jsonb_to_recordset(p_episodes)
      as ep(episode_number int,title text,arc_title text,content_md text)) > 12000000 then
    raise exception 'Total naskah dalam satu impor melebihi 12 MB.';
  end if;
  if exists (
    select 1 from public.qr_episodes old
    join jsonb_to_recordset(p_episodes) as ep(episode_number int,title text,arc_title text,content_md text)
      on old.episode_number=ep.episode_number or md5(btrim(old.content_md))=md5(btrim(ep.content_md))
    where old.book_id=p_book_id
  ) then raise exception 'Nomor atau isi episode sudah ada pada novel ini; naskah lama tidak diubah.'; end if;
  insert into public.qr_import_batches(book_id,actor_id,source_name,source_format,detected_title,imported_count)
  values(p_book_id,(select auth.uid()),p_source_name,p_format,coalesce(p_title_detected,''),n)
  returning id into new_batch_id;
  insert into public.qr_episodes(book_id,episode_number,title,arc_title,content_md,is_enabled,release_at)
  select p_book_id, ep.episode_number, btrim(ep.title), coalesce(btrim(ep.arc_title),''),ep.content_md,false,null
  from jsonb_to_recordset(p_episodes) as ep(episode_number int,title text,arc_title text,content_md text);
  get diagnostics imported = row_count;
  if imported <> n then raise exception 'Impor tidak lengkap; semua perubahan dibatalkan.'; end if;
  return jsonb_build_object('batch_id',new_batch_id,'imported_count',imported);
end;
$$;
revoke all on function public.qr_import_drafts(text,text,text,text,jsonb) from public, anon;
grant execute on function public.qr_import_drafts(text,text,text,text,jsonb) to authenticated;
comment on table public.qr_import_batches is 'Private metadata-only history of V4 manuscript imports; does not contain text or change publishing schedules.';
