import {makeEpub,type EpubSection} from './epub.ts';
import {DOMParser} from 'linkedom';
import {unzipSync,strFromU8} from 'fflate';
import {parseEpub} from './parser.js';
import {sha256 as digest,type Book,type Chapter} from './delivery.ts';
export async function parseEdition(book:Book,sections:EpubSection[]):Promise<Chapter[]>{
 const bytes=makeEpub(book,sections);
 const zip={loadAsync:async(buffer:Uint8Array)=>{const entries=unzipSync(buffer);const files=Object.fromEntries(Object.entries(entries).map(([name,raw])=>[name,{_data:{uncompressedSize:raw.length},async:async()=>strFromU8(raw)}]));return{files,file:(path:string)=>files[path]};}};
 const parsed=await parseEpub(bytes,book.title,{DOMParser,JSZip:zip,preserveSourceHref:true});
 const chapters:Chapter[]=await Promise.all(parsed.chapters.map(async(c:Omit<Chapter,'contentHash'>)=>({...c,contentHash:await digest(c.text)})));
 if(chapters.length>600||chapters.some(c=>!book.section_ids.some(id=>c.href==='OEBPS/section-'+id+'.xhtml')))throw Error('Invalid episode');
 return chapters;
}
