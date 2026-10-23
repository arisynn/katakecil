import type {PublicCoverManifest} from '../features/covers/model';
import { supabase } from './supabase';
import type {BookEpub} from '../features/epub/api';
export type Book = {
  id: string; slug: string; title: string; synopsis: string; genre: string; reading_format?:'epub'; epub?:BookEpub;
  cover_url: string | null; cover_manifest?:PublicCoverManifest|null; cover_version?:number; studio_cover_path?:string|null; private_cover_path?: string | null; status: 'ongoing' | 'completed' | 'hiatus';
  is_published: boolean; is_featured: boolean; deleted_at?: string | null; created_at: string; updated_at: string;
};
export type Episode = {
  id: string; book_id: string; episode_number: number; arc_title: string;
  title: string; content_md: string; content_length?: number; content_hash?: string; release_at: string | null; is_enabled: boolean;
  deleted_at?: string | null; is_finale?: boolean; editor_version?: number; created_at: string; updated_at: string;
};
export type EpisodeSummary = Pick<Episode, 'book_id'|'episode_number'|'arc_title'|'title'|'release_at'> & {is_finale?:boolean};

export async function getPublicLibrary() {
  if (!supabase) return { books: [] as Book[], episodes: [] as EpisodeSummary[] };
  const [a, b, finaleQuery] = await Promise.all([
    supabase.from('qr_books').select('id,slug,title,synopsis,genre,cover_url,status,is_published,is_featured,created_at,updated_at').eq('is_published', true).is('deleted_at',null).order('updated_at', { ascending: false }),
    // The finale flag is optional until the additive V5.4 migration has been deployed.
    supabase.from('qr_episodes').select('book_id,episode_number,arc_title,title,release_at').eq('is_enabled', true).is('deleted_at',null).lte('release_at', new Date().toISOString()).order('episode_number'),
    // Optional V5.4 metadata. If migration is pending, the public library still works.
    supabase.from('qr_episodes').select('book_id,episode_number,is_finale').eq('is_finale',true).eq('is_enabled',true).is('deleted_at',null).lte('release_at',new Date().toISOString()),
  ]);
  if (a.error) throw new Error(`Katalog belum tersedia: ${a.error.message}. Jalankan migrasi V2 terlebih dahulu.`);
  if (b.error) throw new Error(b.error.message);
  const books = (a.data ?? []) as Book[];
  await attachCovers(books,false);
  await attachEpubs(books,false);
  const finaleKeys=new Set((finaleQuery.error?[]:finaleQuery.data??[]).map(e=>`${e.book_id}:${e.episode_number}`));
  const episodes = ((b.data ?? []) as EpisodeSummary[]).map(ep=>({...ep,is_finale:finaleKeys.has(`${ep.book_id}:${ep.episode_number}`)}));
  if(books.some(book=>book.reading_format==='epub')){
   const result=await supabase.from('qr_epub_releases').select('book_id,episode_number,title,release_at').eq('is_enabled',true).lte('release_at',new Date().toISOString()).order('episode_number');if(result.error)throw result.error;
   episodes.push(...(result.data||[]).map(row=>({...row,arc_title:'',is_finale:false})));
  }
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
  await attachCovers(books,true);
  await attachEpubs(books,true);
  return { books, episodes: episodes.filter(ep => activeBookIds.has(ep.book_id)) };
}
async function attachEpubs(books:Book[],author:boolean){
 if(!supabase||!books.length)return;
 const {data,error}=await supabase.from('qr_epub_catalog').select('book_id').in('book_id',books.map(book=>book.id));
 if(error){if(['42P01','PGRST205'].includes(error.code))return;throw Error('Format buku belum dapat dimuat. Periksa koneksi lalu coba lagi.');}
 for(const row of data||[]){const book=books.find(book=>book.id===row.book_id);if(book)book.reading_format='epub';}
 if(author){const result=await supabase.from('qr_book_epubs').select('*').in('book_id',books.map(book=>book.id));if(result.error&&result.error.code!=='PGRST205')throw result.error;for(const asset of result.data||[]){const book=books.find(book=>book.id===asset.book_id);if(book)book.epub=asset as BookEpub;}}
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

async function attachCovers(books:Book[],studio:boolean){
 if(!supabase||!books.length)return;
 // Optional until V7.3 migration: older catalogs remain readable.
 const {data}=await supabase.from('qr_book_covers').select('book_id,version,manifest').in('book_id',books.map(b=>b.id));
 for(const row of data||[]){const book=books.find(b=>b.id===row.book_id);if(book){book.cover_manifest=row.manifest;book.cover_version=row.version;}}
 if(studio){const {data:assets}=await supabase.from('qr_cover_assets').select('book_id,manifest,created_at').in('book_id',books.map(b=>b.id)).in('status',['ready','published']).order('created_at',{ascending:false}).limit(1000);
  const seen=new Set<string>();for(const asset of assets||[]){if(seen.has(asset.book_id))continue;seen.add(asset.book_id);const book=books.find(b=>b.id===asset.book_id);if(book)book.studio_cover_path=asset.manifest?.card?.[0]?.path;}
 }
}
