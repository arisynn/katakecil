-- KataKecil V5.4: OPTIONAL additive migration for transactional author bulk publishing.
-- Backup and review existing data before applying. No prior rows are published by this migration.
-- Finale status is metadata only; manuscript access remains guarded by the existing RLS/Edge Function.
alter table public.qr_episodes add column if not exists is_finale boolean not null default false;
-- Explicit column grant keeps public episode metadata readable after stage-2 column restrictions.
grant select(is_finale) on public.qr_episodes to anon, authenticated;

create or replace function public.qr_bulk_publish_drafts(
  p_book_id text, p_expected_drafts integer, p_mark_completed boolean default false
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := (select auth.uid());
  actual_count integer;
  changed_count integer;
  book_title text;
  final_episode uuid;
begin
  if actor is null or not exists (select 1 from public.qr_author_members m where m.user_id=actor) then
    raise exception 'Hanya penulis terverifikasi yang dapat menerbitkan episode.' using errcode='42501';
  end if;
  if p_book_id is null or p_expected_drafts is null or p_expected_drafts<0 or p_expected_drafts>6000 then
    raise exception 'Parameter penerbitan tidak valid.';
  end if;
  -- Serialize all publish operations for one novel. A trashed book cannot be published.
  select b.title into book_title from public.qr_books b
    where b.id=p_book_id and b.deleted_at is null for update;
  if not found then raise exception 'Novel tidak ditemukan atau berada di Sampah.'; end if;
  perform 1 from public.qr_episodes e where e.book_id=p_book_id for update;
  select count(*) into actual_count from public.qr_episodes e
    where e.book_id=p_book_id and e.deleted_at is null
      and (e.is_enabled=false or e.release_at is null);
  if actual_count<>p_expected_drafts then
    raise exception 'Jumlah draft berubah sejak dibuka. Muat ulang Studio dan periksa lagi.';
  end if;
  if actual_count=0 and not p_mark_completed then
    raise exception 'Tidak ada draft yang perlu diterbitkan.';
  end if;
  if exists(select 1 from public.qr_episodes e
    where e.book_id=p_book_id and e.deleted_at is null
      and (e.is_enabled=false or e.release_at is null)
      and length(btrim(e.content_md))=0) then
    raise exception 'Ada episode draft tanpa isi. Lengkapi sebelum menerbitkan seluruhnya.';
  end if;
  if p_mark_completed and not exists (
    select 1 from public.qr_episodes e where e.book_id=p_book_id and e.deleted_at is null
  ) then raise exception 'Tidak bisa menamatkan cerita yang belum memiliki episode.'; end if;
  -- Preserve existing scheduled releases. Publish drafts at server time, all-or-nothing.
  update public.qr_episodes e set is_enabled=true,release_at=now()
    where e.book_id=p_book_id and e.deleted_at is null
      and (e.is_enabled=false or e.release_at is null);
  get diagnostics changed_count=row_count;
  if changed_count<>actual_count then raise exception 'Penerbitan tidak lengkap; transaksi dibatalkan.'; end if;
  update public.qr_books b set is_published=true,
    status=case when p_mark_completed then 'completed' else b.status end
    where b.id=p_book_id;
  if p_mark_completed then
    select e.id into final_episode from public.qr_episodes e
      where e.book_id=p_book_id and e.deleted_at is null
      order by e.episode_number desc limit 1;
    update public.qr_episodes e set is_finale=(e.id=final_episode)
      where e.book_id=p_book_id and e.deleted_at is null;
  end if;
  return jsonb_build_object('book_id',p_book_id,'book_title',book_title,
    'published_count',changed_count,'completed',p_mark_completed);
end;
$$;
revoke all on function public.qr_bulk_publish_drafts(text,integer,boolean) from public, anon, authenticated;
grant execute on function public.qr_bulk_publish_drafts(text,integer,boolean) to authenticated;
comment on function public.qr_bulk_publish_drafts(text,integer,boolean)
 is 'Author-only, all-or-nothing bulk publication of unchanged draft count. Preserves schedules and protects trashed items.';
