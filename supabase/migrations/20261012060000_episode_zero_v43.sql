-- KataKecil V4.3: only allow episode_number=0 (already allowed: 1,2,...).
-- No updates to existing episodes, content, publication time, or status.
-- Apply AFTER backup, while Secure Reader Stage 2 is still pending.
-- Deployment sequence: migrate -> deploy secure-episode -> preview frontend -> verify -> production.

-- The active V1 constraint was verified as qr_episodes_episode_number_check.
alter table public.qr_episodes drop constraint if exists qr_episodes_episode_number_check;
alter table public.qr_episodes add constraint qr_episodes_episode_number_check check (episode_number >= 0);

-- Update importer validation without changing its authorization / transaction logic.
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
    where ep.episode_number is null or ep.episode_number < 0 or ep.episode_number > 9999
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

-- Existing V4 import grants remain in effect, and no publication policies are modified.
