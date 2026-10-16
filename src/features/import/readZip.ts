import {COVER_LIMITS} from '../covers/model';
import type {ZipResult} from './zip';
import type {ParsedManuscript} from '../../utils/importManuscript';
export async function readZip(file:File,signal:AbortSignal,progress:(value:string)=>void):Promise<ParsedManuscript>{
  if(file.size>20_000_000)throw Error('ZIP maksimal 20 MB.');
  const bytes=await file.arrayBuffer();if(signal.aborted)throw new DOMException('Dibatalkan','AbortError');
  const result=await new Promise<ZipResult>((resolve,reject)=>{
    const worker=new Worker(new URL('./zip.worker.ts',import.meta.url),{type:'module'});
    const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);worker.terminate();};
    const abort=()=>{finish();reject(new DOMException('Dibatalkan','AbortError'));};
    const timer=setTimeout(()=>{finish();reject(Error('Analisis terlalu lama. Pecah ZIP menjadi bagian lebih kecil.'));},60_000);
    signal.addEventListener('abort',abort,{once:true});
    worker.onerror=()=>{finish();reject(Error('Pemrosesan ZIP gagal. Coba berkas yang lebih kecil.'));};
    worker.onmessage=event=>{const msg=event.data;if(msg.type==='progress')progress(msg.message);else{finish();if(msg.type==='result')resolve(msg.result);else reject(Error(msg.message));}};
    worker.postMessage({bytes,name:file.name},[bytes]);
  });
  for(const entry of result.epubs){
    if(signal.aborted)throw new DOMException('Dibatalkan','AbortError');
    progress('Membaca struktur EPUB dalam ZIP…');
    const {parseEpubFile}=await import('../../utils/importEpub');
    const parsed=await parseEpubFile(new File([Uint8Array.from(entry.bytes)],entry.name,{type:'application/epub+zip'}),70_000_000-result.expanded);
    result.parsed.chapters.push(...parsed.chapters.map(c=>({...c,key:`nested-${c.key}`,origin:`${entry.name}/${c.origin}`})));
    result.parsed.warnings.push(...parsed.warnings);
    const candidates=[...(result.parsed.covers||[]),...(parsed.covers||[]).map(c=>({...c,origin:`${entry.name}/${c.origin}`}))].sort((a,b)=>b.score-a.score);
    let total=0;result.parsed.covers=candidates.filter((c,i)=>{total+=c.data.size;return i<COVER_LIMITS.candidates&&total<=COVER_LIMITS.candidateBytes;});result.parsed.cover=result.parsed.covers[0];
  }
  if(signal.aborted)throw new DOMException('Dibatalkan','AbortError');
  return result.parsed;
}
