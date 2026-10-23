import { supabase } from './supabase';
import type {ReaderBlock} from '../types/reader';

export type ReleasedEpisode = {
  episode_number:number; title:string; arc_title:string; release_at:string;
};
export type ReaderSegment = {
  episodeNumber:number; title:string; arc:string; part:number; totalParts:number; content:string;
};
export type ReaderEpisode = {
  episodeNumber:number; title:string; arc:string; content:string;
  blocks?:ReaderBlock[];anchors?:Record<string,number>;sourceVersion?:string;resumeRatio?:number;
};

const idOkay=(value:string)=>/^[a-z0-9][a-z0-9_-]{0,95}$/i.test(value);
const episodeOkay=(value:number)=>Number.isInteger(value)&&value>=0&&value<=9999;
function readerError(error:unknown, fallback:string):Error {
  const value=error as {context?:{status?:number}}|null;
  const status=value?.context?.status;
  if(status===429)return Error('Akses sementara dibatasi. Coba lagi sebentar.');
  if(status===404)return Error('Episode belum terbit atau novel tidak tersedia.');
  if(status===503)return Error('Layanan baca sementara tidak tersedia.');
  return Error(fallback);
}

/** Server decides publication visibility using its own clock, not the device clock.
 * Index contains only released metadata, never content_md.
 */
export async function loadReleasedIndex(bookId:string):Promise<ReleasedEpisode[]> {
  if(!supabase)throw Error('Supabase belum dikonfigurasi.');
  if(!idOkay(bookId))throw Error('Identitas novel tidak valid.');
  const {data,error}=await supabase.functions.invoke('secure-episode',{
    body:{bookId,action:'index'},
  });
  if(error)throw readerError(error,'Gagal memuat daftar episode. Periksa deployment Secure Episode V4.5.');
  if(!data||data.type!=='index'||!Array.isArray(data.episodes)||data.episodes.length>10000)
    throw Error('Format daftar episode dari server tidak valid.');
  const result:ReleasedEpisode[]=[];
  for(const entry of data.episodes){
    if(!entry||!episodeOkay(entry.episode_number)||typeof entry.title!=='string'||
      typeof entry.arc_title!=='string'||typeof entry.release_at!=='string')
      throw Error('Data episode dari server tidak valid.');
    result.push({episode_number:entry.episode_number,title:entry.title,
      arc_title:entry.arc_title,release_at:entry.release_at});
  }
  return result.sort((a,b)=>a.episode_number-b.episode_number);
}

/** V4.2 endpoint retained only as explicit rollback compatibility. */
export async function loadReaderSegment(bookId:string,episodeNumber:number,part:number):Promise<ReaderSegment>{
  if(!supabase)throw Error('Supabase belum dikonfigurasi.');
  const {data,error}=await supabase.functions.invoke('secure-reader',{body:{bookId,episodeNumber,part}});
  if(error)throw readerError(error,'Secure Reader V4.2 tidak bisa mengambil bagian ini.');
  if(!data||!Number.isInteger(data.totalParts)||typeof data.content!=='string')
    throw Error('Respons Secure Reader tidak valid.');
  return data as ReaderSegment;
}

/** One released episode per request. Body is held in React memory only. */
export async function loadReaderEpisode(bookId:string,episodeNumber:number):Promise<ReaderEpisode> {
  if(!supabase)throw Error('Supabase belum dikonfigurasi.');
  if(!idOkay(bookId)||!episodeOkay(episodeNumber))throw Error('Identitas bacaan tidak valid.');
  const {data,error}=await supabase.functions.invoke('secure-episode',{
    body:{bookId,episodeNumber},
  });
  if(error)throw readerError(error,'Gagal mengambil episode. Periksa deployment Secure Episode V4.5.');
  if(!data||data.episodeNumber!==episodeNumber||typeof data.content!=='string'||
    typeof data.title!=='string'||typeof data.arc!=='string')
    throw Error('Format episode dari server tidak valid.');
  return {episodeNumber:data.episodeNumber,title:data.title,arc:data.arc,content:data.content};
}
