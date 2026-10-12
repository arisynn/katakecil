-- KataKecil V5.1 — permanent deletion only for items ALREADY in Trash.
-- This migration only CREATES an authenticated function; it deletes no user data.
-- Use after verifying backup availability. Actual destruction requires an authenticated
-- author to invoke the RPC with exact item title and exact item ID.
create or replace function public.qr_permanently_delete_item(
 p_kind text,p_id text,p_confirmation text
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
 actor uuid := (select auth.uid());
 item_title text;
 removed_episodes integer := 0;
 removed_sections integer := 0;
 removed_batches integer := 0;
 removed_logs integer := 0;
 removed_rules integer := 0;
begin
 if actor is null or not exists (
  select 1 from public.qr_author_members m where m.user_id=actor
 ) then
  raise exception 'Tidak mempunyai izin penulis.' using errcode='42501';
 end if;
 if p_kind not in ('book','episode','section') or coalesce(length(p_id),0) not between 1 and 128
  or p_confirmation is null or length(p_confirmation) > 180 then
  raise exception 'Parameter hapus permanen tidak valid.' using errcode='22023';
 end if;
 if p_kind='book' then
  select b.title into item_title from public.qr_books b
    where b.id=p_id and b.deleted_at is not null for update;
 elsif p_kind='episode' then
  select e.title into item_title from public.qr_episodes e
    where e.id::text=p_id and e.deleted_at is not null for update;
 else
  select s.title into item_title from public.qr_book_sections s
    where s.id::text=p_id and s.deleted_at is not null for update;
 end if;
 if not found then
  raise exception 'Item tidak ditemukan di Sampah.' using errcode='P0002';
 end if;
 if item_title is distinct from p_confirmation then
  raise exception 'Judul konfirmasi tidak cocok.' using errcode='22023';
 end if;

 if p_kind='book' then
  -- All related rows are removed within this same PostgreSQL transaction.
  -- Preserve other books; do not touch Storage objects, which are external to PG.
  delete from public.qr_publication_logs where book_id=p_id;
  get diagnostics removed_logs=row_count;
  delete from public.qr_episodes where book_id=p_id;
  get diagnostics removed_episodes=row_count;
  delete from public.qr_book_sections where book_id=p_id;
  get diagnostics removed_sections=row_count;
  delete from public.qr_import_batches where book_id=p_id;
  get diagnostics removed_batches=row_count;
  delete from public.qr_release_rules where book_id=p_id;
  get diagnostics removed_rules=row_count;
  delete from public.qr_books where id=p_id and deleted_at is not null;
 elsif p_kind='episode' then
  delete from public.qr_publication_logs where episode_id=p_id::uuid;
  get diagnostics removed_logs=row_count;
  delete from public.qr_episodes where id=p_id::uuid and deleted_at is not null;
  get diagnostics removed_episodes=row_count;
 else
  delete from public.qr_book_sections where id=p_id::uuid and deleted_at is not null;
  get diagnostics removed_sections=row_count;
 end if;
 if not found then
  raise exception 'Item tidak berhasil dihapus.';
 end if;
 return jsonb_build_object('deleted',true,'kind',p_kind,'id',p_id,
   'episodes',removed_episodes,'sections',removed_sections,
   'import_batches',removed_batches,'publication_logs',removed_logs,
   'release_rules',removed_rules,
   'storage_cleanup_required',p_kind='book');
end;
$$;
revoke all on function public.qr_permanently_delete_item(text,text,text) from public,anon,authenticated;
grant execute on function public.qr_permanently_delete_item(text,text,text) to authenticated;
