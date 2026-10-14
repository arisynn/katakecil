import { supabase } from './supabase';

export type AnnouncementStatus = 'draft' | 'published';
export type PublicAnnouncement = {
  id: string;
  title: string;
  body: string;
  book_id: string | null;
  starts_at: string;
  ends_at: string | null;
};
export type StudioAnnouncement = PublicAnnouncement & {
  status: AnnouncementStatus;
  created_at: string;
  updated_at: string;
};
export type AnnouncementInput = Pick<StudioAnnouncement,
  'title' | 'body' | 'book_id' | 'starts_at' | 'ends_at' | 'status'>;

export function isActiveAnnouncement(item: PublicAnnouncement, now = Date.now()): boolean {
  const start = Date.parse(item.starts_at);
  const end = item.ends_at === null ? Infinity : Date.parse(item.ends_at);
  return Number.isFinite(start) && start <= now && end > now;
}

export function validateAnnouncement(input: AnnouncementInput): string | null {
  if (!input.title.trim() || input.title.trim().length > 120) return 'Judul harus berisi 1–120 karakter.';
  if (input.body.length > 320) return 'Isi maksimal 320 karakter.';
  const start = Date.parse(input.starts_at);
  if (!Number.isFinite(start)) return 'Tanggal mulai tidak valid.';
  if (input.ends_at !== null) {
    const end = Date.parse(input.ends_at);
    if (!Number.isFinite(end) || end <= start) return 'Tanggal selesai harus setelah tanggal mulai.';
  }
  if (!['draft', 'published'].includes(input.status)) return 'Status tidak valid.';
  return null;
}

/** This optional feature must never prevent the public catalog from loading. */
export async function getPublicAnnouncements(): Promise<PublicAnnouncement[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('qr_announcements')
    .select('id,title,body,book_id,starts_at,ends_at')
    .eq('status', 'published')
    .lte('starts_at', new Date().toISOString())
    .or(`ends_at.is.null,ends_at.gt.${new Date().toISOString()}`)
    .order('starts_at', { ascending: false }).limit(8);
  if (error) {
    // Optional additive migration may not have been applied yet.
    if (error.code !== '42P01' && error.code !== 'PGRST205')
      console.warn('Pengumuman publik tidak dapat dimuat:', error.message);
    return [];
  }
  return ((data ?? []) as PublicAnnouncement[]).filter(item => isActiveAnnouncement(item));
}

export async function getStudioAnnouncements(): Promise<StudioAnnouncement[]> {
  if (!supabase) throw Error('Supabase belum dikonfigurasi.');
  const { data, error } = await supabase.from('qr_announcements').select('*')
    .order('created_at', { ascending: false });
  if (error) throw Error(`Tidak dapat memuat pengumuman: ${error.message}`);
  return (data ?? []) as StudioAnnouncement[];
}

export async function saveAnnouncement(input: AnnouncementInput, id?: string): Promise<void> {
  if (!supabase) throw Error('Supabase belum dikonfigurasi.');
  const message = validateAnnouncement(input);
  if (message) throw Error(message);
  const payload = { ...input, title: input.title.trim(), body: input.body.trim() };
  const result = id
    ? await supabase.from('qr_announcements').update(payload).eq('id', id)
      .select('id').single()
    : await supabase.from('qr_announcements').insert(payload)
      .select('id').single();
  if (result.error) throw Error(result.error.message);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  if (!supabase) throw Error('Supabase belum dikonfigurasi.');
  const { data, error } = await supabase.from('qr_announcements').delete()
    .eq('id', id).select('id').single();
  if (error || !data) throw Error(error?.message ?? 'Pengumuman tidak ditemukan.');
}
