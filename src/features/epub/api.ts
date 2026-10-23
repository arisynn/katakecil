import {supabase} from '../../data/supabase';
import type {EpubToc} from './archive';
export type BookEpub={book_id:string;object_path:string;sha256:string;file_name:string;byte_size:number;toc:EpubToc[];creator:string;language:string};
export type EpubRelease={id:string;book_id:string;section_index:number;episode_number:number;title:string;is_enabled:boolean;release_at:string|null};
export const EPUB_BUCKET='book-epubs';
export async function isEpubBook(id:string){
 if(!supabase)return false;
 const {data,error}=await supabase.from('qr_epub_catalog').select('book_id').eq('book_id',id).maybeSingle();
 if(error){if(['42P01','PGRST205'].includes(error.code))return false;throw Error('Format buku belum dapat dimuat.');}return Boolean(data);
}
export async function getEpubReleases(id:string,author=false):Promise<EpubRelease[]>{
 if(!supabase)return [];
 let query=supabase.from('qr_epub_releases').select('id,book_id,section_index,episode_number,title,is_enabled,release_at').eq('book_id',id).order('episode_number');
 if(!author)query=query.eq('is_enabled',true).lte('release_at',new Date().toISOString());
 const {data,error}=await query;if(error)throw Error('Daftar episode EPUB belum dapat dimuat.');return (data||[]) as EpubRelease[];
}
export async function getEpubEpisode(releaseId:string,signal:AbortSignal):Promise<{html:string;sourceVersion:string}>{
 const base=import.meta.env.VITE_EPUB_API_ORIGIN||(location.hostname==='localhost'&&location.protocol==='https:'?'https://katakecil.vercel.app':location.origin);
 const url=new URL('/api/epub-episode',base);url.searchParams.set('id',releaseId);
 if(url.protocol!=='https:'&&url.hostname!=='127.0.0.1'&&url.hostname!=='localhost')throw Error('Endpoint EPUB harus HTTPS.');
 const response=await fetch(url,{signal,cache:'no-store',credentials:'omit'});
 if(!response.ok)throw Error(response.status===404?'Episode belum terbit atau tidak tersedia.':response.status===503?'Layanan EPUB belum diaktifkan.':'Episode belum dapat dimuat. Periksa koneksi lalu coba lagi.');
 const value=await response.json();if(typeof value.html!=='string'||value.html.length>4_000_000||!/^[0-9a-f]{64}$/.test(value.sourceVersion))throw Error('Respons EPUB tidak valid.');return value;
}
export const epubHash=async(file:Blob)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer()))).map(b=>b.toString(16).padStart(2,'0')).join('');
export async function getBookEpub(id:string){
 if(!supabase)return null;
 const {data,error}=await supabase.from('qr_book_epubs').select('*').eq('book_id',id).maybeSingle();
 // Additive migration may not yet be installed: episode books must keep working.
 if(error){if(['42P01','PGRST205'].includes(error.code))return null;throw Error('Metadata EPUB belum dapat dimuat. Coba lagi saat tersambung.');}
 return data as BookEpub|null;
}
export async function downloadEpub(asset:BookEpub){
 if(!supabase)throw Error('Supabase belum dikonfigurasi.');
 const {data,error}=await supabase.storage.from(EPUB_BUCKET).download(asset.object_path);
 if(error||!data)throw Error('EPUB belum dapat diunduh. Periksa koneksi atau akses buku.');
 if(data.size!==asset.byte_size||await epubHash(data)!==asset.sha256)throw Error('Integritas EPUB tidak sesuai. Muat ulang buku.');
 return data;
}
