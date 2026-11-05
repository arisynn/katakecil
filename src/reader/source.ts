export const SECURE_READER_URL = 'https://hrbcwymdqigtfmpmsdsi.supabase.co/functions/v1/katakecil-reader';
export interface CatalogBook { id: string; title: string; author: string; language: string; version: string; url: string; cover: string; source: string; sectionIds: string[] }
export function normalizePublishedCatalog(manifest: {books?: unknown}, base = SECURE_READER_URL): CatalogBook[] {
  if (!Array.isArray(manifest.books)) throw new Error('Invalid published catalog.');
  const ids = new Set<string>();
  return manifest.books.map((b: Record<string, unknown>) => {
    if (typeof b.id !== 'string' || !/^[a-z0-9][a-z0-9_-]{0,119}$/.test(b.id) || ids.has(b.id) || typeof b.title !== 'string' || !b.title || typeof b.revision !== 'string' || !/^[a-f\d]{64}$/.test(b.revision) || !Array.isArray(b.section_ids) || !b.section_ids.every(id => typeof id === 'string' && /^[a-f\d-]{36}$/i.test(id)) || new Set(b.section_ids).size !== b.section_ids.length) throw new Error('Invalid published book metadata.');
    ids.add(b.id);
    const url = new URL(base); url.searchParams.set('action', 'session'); url.searchParams.set('book', b.id); url.searchParams.set('revision', b.revision);
    let cover = String(b.cover_url || '');
    if (cover && !/^data:image\/(png|jpeg|webp|gif);base64,[a-z\d+/=]+$/i.test(cover)) { try { const c = new URL(cover, base); cover = c.protocol === 'https:' ? c.href : ''; } catch { cover = ''; } }
    return {id: b.id, title: b.title, author: String(b.author || ''), language: String(b.language || 'id'), version: b.revision, sectionIds: b.section_ids as string[], url: url.href, cover, source: 'supabase'};
  }).filter(book => book.sectionIds.length > 0);
}
// Kept as an explicit failure for extensions using the old public export. No EPUB fallback.
export async function fetchPublishedBook(): Promise<ArrayBuffer> { throw new Error('Whole-book delivery has been retired. Update the reader.'); }
export interface RemoteChapter {title:string;href:string;navigationTitle?:string;chapterLabel?:string;arc?:{id:string;label:string;title:string};contentHash:string;length:number;text:string;}
export class PublishedReader {
  chapters:RemoteChapter[]=[];
  private session='';
  private blockedUntil=0;
  private generation=0;
  constructor(private book:CatalogBook,private fetcher:typeof fetch=(...args)=>globalThis.fetch(...args)){}
  private async request(action:string,params:Record<string,string>={},retry=true):Promise<any>{
    if(Date.now()<this.blockedUntil)throw Error('Please wait before loading more text.');
    const url=new URL(this.book.url);url.searchParams.set('action',action);for(const [key,value] of Object.entries(params))url.searchParams.set(key,value);
    const response=await this.fetcher(url.href,{method:action==='session'?'POST':'GET',headers:this.session?{'x-reader-session':this.session}:{},credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(30000)});
    if(response.status===401&&action!=='session'&&retry){await this.connect();return this.request(action,params,false);}
    if(response.status===429){const delay=Math.min(86400,Math.max(1,Number(response.headers.get('Retry-After'))||10));this.blockedUntil=Date.now()+delay*1000;throw Error(`Please wait ${delay}s before loading more text.`);}
    if(!response.ok)throw Error(response.status===409?'Book changed. Refresh the library and open it again.':response.status===410?'Update the app to continue reading.':'Published content is unavailable. Please retry online.');
    if(!response.headers.get('content-type')?.includes('application/json'))throw Error('Invalid reading response.');
    const chunks:Uint8Array[]=[];let size=0;const reader=response.body?.getReader();
    if(!reader)throw Error('Reading response unavailable.');
    while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>(action==='episode'?32*1024*1024:1024*1024)){await reader.cancel();throw Error('Reading response too large.');}chunks.push(value);}
    const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
    const data=JSON.parse(new TextDecoder().decode(bytes));if(data.revision!==this.book.version)throw Error('Publication revision could not be verified.');return data;
  }
  private async connect(){const data=await this.request('session');if(!/^rs_[a-f0-9]{64}$/.test(data.session))throw Error('Invalid reading session.');this.session=data.session;}
  async open(){
    await this.connect();const data=await this.request('manifest');
    if(data.protocol!==2||!Array.isArray(data.chapters)||!data.chapters.length||data.chapters.length>600)throw Error('Invalid reading manifest.');
    this.chapters=data.chapters.map((c:RemoteChapter)=>{
      if(typeof c.title!=='string'||typeof c.href!=='string'||!this.book.sectionIds.some(id=>c.href==='OEBPS/section-'+id+'.xhtml')||!Number.isSafeInteger(c.length)||c.length<1||c.length>16000000||!/^[a-f0-9]{64}$/.test(c.contentHash))throw Error('Invalid episode metadata.');
      // Never trust a text/html field in a metadata response, or spread it into persistent data.
      return {title:c.title,href:c.href,navigationTitle:c.navigationTitle,chapterLabel:c.chapterLabel,arc:c.arc,contentHash:c.contentHash,length:c.length,text:''};
    });return this.chapters;
  }
  async load(chapterIndex:number,offset=0){
    const generation=++this.generation,chapter=this.chapters[chapterIndex];if(!chapter)throw Error('Episode unavailable.');
    const data=await this.request('episode',{chapter:String(chapterIndex)});
    if(generation!==this.generation)throw new Error('Reading request cancelled.');
    if(data.chapter!==chapterIndex||data.href!==chapter.href||data.contentHash!==chapter.contentHash||typeof data.text!=='string'||data.text.length!==chapter.length)throw Error('Invalid reading episode.');
    // Retain only the current episode. No prefetch, EPUB fallback or manuscript persistence.
    for(const c of this.chapters)c.text='';
    chapter.text=data.text;
    return {chapterIndex,start:Math.max(0,Math.min(chapter.length-1,Math.trunc(offset)))};
  }
  clear(){this.generation++;this.session='';for(const c of this.chapters)c.text='';}
}
