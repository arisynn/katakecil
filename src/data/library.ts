import { supabase } from './supabase';
export type Book = {
  id: string; slug: string; title: string; synopsis: string; genre: string;
  cover_url: string | null; private_cover_path?: string | null; status: 'ongoing' | 'completed' | 'hiatus';
  is_published: boolean; is_featured: boolean; deleted_at?: string | null; created_at: string; updated_at: string;
};
export type Episode = {
  id: string; book_id: string; episode_number: number; arc_title: string;
  title: string; content_md: string; content_length?: number; content_hash?: string; release_at: string | null; is_enabled: boolean;
  deleted_at?: string | null; is_finale?: boolean; created_at: string; updated_at: string;
};
export type EpisodeSummary = Pick<Episode, 'book_id'|'episode_number'|'arc_title'|'title'|'release_at'> & {is_finale?:boolean};

export async function getPublicLibrary() {
  if (!supabase) return { books: [] as Book[], episodes: [] as EpisodeSummary[] };
  const [a, b, finaleQuery] = await Promise.all([
    supabase.from('qr_books').select('*').eq('is_published', true).is('deleted_at',null).order('updated_at', { ascending: false }),
    // The finale flag is optional until the additive V5.4 migration has been deployed.
    supabase.from('qr_episodes').select('book_id,episode_number,arc_title,title,release_at').eq('is_enabled', true).is('deleted_at',null).lte('release_at', new Date().toISOString()).order('episode_number'),
    // Optional V5.4 metadata. If migration is pending, the public library still works.
    supabase.from('qr_episodes').select('book_id,episode_number,is_finale').eq('is_finale',true).eq('is_enabled',true).is('deleted_at',null).lte('release_at',new Date().toISOString()),
  ]);
  if (a.error) throw new Error(`Katalog belum tersedia: ${a.error.message}. Jalankan migrasi V2 terlebih dahulu.`);
  if (b.error) throw new Error(b.error.message);
  const books = (a.data ?? []) as Book[];
  const finaleKeys=new Set((finaleQuery.error?[]:finaleQuery.data??[]).map(e=>`${e.book_id}:${e.episode_number}`));
  const episodes = ((b.data ?? []) as EpisodeSummary[]).map(ep=>({...ep,is_finale:finaleKeys.has(`${ep.book_id}:${ep.episode_number}`)}));
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
    const { data, error } = await supabase.from('qr_books').select('*').is('deleted_at',null).order('updated_at', { ascending: false }).range(start, start + size - 1);
    if (error) throw error;
    books.push(...((data ?? []) as Book[]));
    if ((data ?? []).length < size) break;
  }
  for (let start = 0; start < 6000; start += size) {
    const { data, error } = await supabase.rpc('qr_author_episode_metadata_v72', {p_offset:start, p_limit:size});
    if (error) throw error;
    episodes.push(...((data ?? []) as Episode[]).filter(ep=>!ep.deleted_at).map(ep=>({...ep,content_md:''}))); 
    if ((data ?? []).length < size) break;
  }
  // Hide children of books in Trash; their drafts/schedules remain preserved in DB.
  const activeBookIds = new Set(books.map(book => book.id));
  return { books, episodes: episodes.filter(ep => activeBookIds.has(ep.book_id)) };
}
export async function getAuthorEpisode(id:string):Promise<Episode>{
  if(!supabase)throw Error('Supabase belum dikonfigurasi.');
  const {data,error}=await supabase.rpc('qr_author_episode_v72',{p_episode_id:id});
  if(error)throw Error(error.message);if(!data)throw Error('Episode tidak tersedia atau berada di Sampah.');return data as Episode;
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
