import { supabase } from './supabase';
export type Book = {
  id: string; slug: string; title: string; synopsis: string; genre: string;
  cover_url: string | null; status: 'ongoing' | 'completed' | 'hiatus';
  is_published: boolean; is_featured: boolean; created_at: string; updated_at: string;
};
export type Episode = {
  id: string; book_id: string; episode_number: number; arc_title: string;
  title: string; content_md: string; release_at: string | null; is_enabled: boolean;
  created_at: string; updated_at: string;
};
export type EpisodeSummary = Pick<Episode, 'book_id'|'episode_number'|'arc_title'|'title'|'release_at'>;

export async function getPublicLibrary() {
  if (!supabase) return { books: [] as Book[], episodes: [] as EpisodeSummary[] };
  const [a, b] = await Promise.all([
    supabase.from('qr_books').select('*').eq('is_published', true).order('updated_at', { ascending: false }),
    supabase.from('qr_episodes').select('book_id,episode_number,arc_title,title,release_at').eq('is_enabled', true).lte('release_at', new Date().toISOString()).order('episode_number'),
  ]);
  if (a.error) throw new Error(`Katalog belum tersedia: ${a.error.message}. Jalankan migrasi V2 terlebih dahulu.`);
  if (b.error) throw new Error(b.error.message);
  const books = (a.data ?? []) as Book[];
  const episodes = (b.data ?? []) as EpisodeSummary[];
  const newest = (book: Book) => Math.max(new Date(book.updated_at).getTime(), ...episodes.filter(ep => ep.book_id === book.id).map(ep => new Date(ep.release_at ?? '').getTime() || 0));
  books.sort((x, y) => newest(y) - newest(x));
  return { books, episodes };
}
export async function getStudioLibrary() {
  if (!supabase) throw new Error('Supabase belum dikonfigurasi.');
  // PostgREST commonly caps a single response to 1,000 rows. Read in bounded pages
  // to prevent V3 database / schedule screens from silently omitting later episodes.
  const books: Book[] = [];
  const episodes: Episode[] = [];
  const size = 200;
  for (let start = 0; start < 6000; start += size) {
    const { data, error } = await supabase.from('qr_books').select('*').order('updated_at', { ascending: false }).range(start, start + size - 1);
    if (error) throw error;
    books.push(...((data ?? []) as Book[]));
    if ((data ?? []).length < size) break;
  }
  for (let start = 0; start < 6000; start += size) {
    const { data, error } = await supabase.rpc('qr_author_get_episodes', {p_offset:start, p_limit:size});
    if (error) throw error;
    episodes.push(...((data ?? []) as Episode[]));
    if ((data ?? []).length < size) break;
  }
  return { books, episodes };
}
export function formatWib(value: string | null) {
  if (!value) return 'Belum dijadwalkan';
  return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value)) + ' WIB';
}
export function episodeStatus(ep: Episode): 'Terbit' | 'Terjadwal' | 'Draft' {
  if (!ep.is_enabled || !ep.release_at) return 'Draft';
  return new Date(ep.release_at).getTime() <= Date.now() ? 'Terbit' : 'Terjadwal';
}
export const slugify = (value: string) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 72);
