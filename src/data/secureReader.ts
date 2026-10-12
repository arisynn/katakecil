import { supabase } from './supabase';

export type ReleasedEpisode = {
  episode_number:number; title:string; arc_title:string; release_at:string;
};
export type ReaderSegment = {
  episodeNumber:number; title:string; arc:string; part:number; totalParts:number; content:string;
};

/** Metadata is safe in PostgREST. Full episode bodies are not available publicly. */
export async function loadReleasedIndex(bookId:string):Promise<ReleasedEpisode[]> {
  if (!supabase) throw Error('Supabase belum dikonfigurasi.');
  const rows:ReleasedEpisode[]=[];
  for(let start=0;start<10000;start+=250) {
    const {data,error}=await supabase.from('qr_episodes')
      .select('episode_number,title,arc_title,release_at')
      .eq('book_id',bookId).eq('is_enabled',true)
      .lte('release_at',new Date().toISOString()).order('episode_number')
      .range(start,start+249);
    if(error) throw Error('Daftar episode gagal dimuat: '+error.message);
    rows.push(...((data||[]) as ReleasedEpisode[]));
    if((data||[]).length<250)break;
  }
  return rows;
}
/** Strictly one short segment, never the full novel or episode. */
export async function loadReaderSegment(bookId:string,episodeNumber:number,part:number):Promise<ReaderSegment> {
  if(!supabase)throw Error('Supabase belum dikonfigurasi.');
  const {data,error}=await supabase.functions.invoke('secure-reader',{
    body:{bookId,episodeNumber,part},
  });
  if(error)throw Error('Secure Reader gagal mengambil bagian ini. Pastikan Edge Function V4.2 sudah terpasang.');
  if(!data || !Number.isInteger(data.totalParts) || typeof data.content!=='string')throw Error('Respons Secure Reader tidak valid.');
  return data as ReaderSegment;
}
