import JSZip from 'jszip';
import {boundedRead,inspectZip} from '../import/zip';
import {inspectImage} from '../covers/inspect';

export const EPUB_MAX_BYTES=18_000_000;
export type EpubToc={title:string;href:string};
export type EpubMetadata={title:string;creator:string;language:string;toc:EpubToc[];sections:number};
export type EpubDom={parse:(source:string)=>Document;create:()=>Document;serialize:(body:HTMLElement)=>string;imageUrl:(blob:Blob)=>Promise<string>;revoke:(url:string)=>void};
const browserDom=():EpubDom=>({parse:source=>new DOMParser().parseFromString(source,'application/xml'),create:()=>document.implementation.createHTMLDocument(''),serialize:body=>body.innerHTML,imageUrl:async blob=>URL.createObjectURL(blob),revoke:url=>URL.revokeObjectURL(url)});
const elements=(root:Document|Element,name:string)=>Array.from(root.getElementsByTagName('*')).filter(el=>el.localName===name);
function xml(source:string,dom:EpubDom){
 if(/<!ENTITY\b/i.test(source))throw Error('Entitas XML tidak didukung.');
 const doc=dom.parse(source);
 if(elements(doc,'parsererror').length)throw Error('Struktur EPUB rusak.');
 return doc;
}
export function epubPath(base:string,href:string){
 if(/^[a-z][a-z\d+.-]*:|^\/\/|[\\\u0000-\u001f]/i.test(href))throw Error('Tautan di luar paket EPUB.');
 const [raw,fragment='']=href.split('#');
 const decoded=decodeURIComponent(raw.split('?')[0]);
 if(decoded.startsWith('/'))throw Error('Path EPUB tidak valid.');
 const parts=raw?base.split('/').slice(0,-1):base.split('/');
 if(raw)for(const part of decoded.split('/')){if(part==='..'){if(!parts.length)throw Error('Path EPUB di luar paket.');parts.pop();}else if(part&&part!=='.')parts.push(part);}
 return {path:parts.join('/'),fragment:decodeURIComponent(fragment)};
}
export async function openEpub(file:Blob,dom:EpubDom=browserDom()):Promise<EpubArchive>{
 if(file.size>EPUB_MAX_BYTES||file.size<22)throw Error('EPUB maksimal 18 MB.');
 const bytes=new Uint8Array(await file.arrayBuffer()),entries=inspectZip(bytes),zip=await JSZip.loadAsync(bytes);
 const entryMap=new Map(entries.map(entry=>[entry.name,entry]));
 const read=async(path:string,limit=3_000_000)=>{const entry=entryMap.get(path);if(!entry)throw Error(`Berkas EPUB tidak ditemukan: ${path}`);return boundedRead(zip,entry,limit);};
 const text=async(path:string)=>new TextDecoder('utf-8',{fatal:true}).decode(await read(path));
 if((await text('mimetype')).trim()!=='application/epub+zip')throw Error('Berkas bukan EPUB yang valid.');
 if(entryMap.has('META-INF/encryption.xml'))throw Error('EPUB dengan DRM atau sumber daya terenkripsi belum didukung.');
 const container=xml(await text('META-INF/container.xml'),dom);
 const root=elements(container,'rootfile')[0]?.getAttribute('full-path');
 if(!root)throw Error('Paket EPUB tidak ditemukan.');
 const opfPath=epubPath('container.xml',root).path,opf=xml(await text(opfPath),dom);
 if(elements(opf,'meta').some(el=>el.getAttribute('property')==='rendition:layout'&&el.textContent?.trim()==='pre-paginated'))throw Error('EPUB fixed layout belum didukung. Gunakan EPUB dengan teks mengalir.');
 const items=new Map(elements(opf,'item').map(el=>[el.getAttribute('id')||'',{path:epubPath(opfPath,el.getAttribute('href')||'').path,type:el.getAttribute('media-type')||'',properties:el.getAttribute('properties')||''}]));
 const spine=elements(opf,'itemref').filter(el=>el.getAttribute('linear')!=='no').map(el=>items.get(el.getAttribute('idref')||''));
 if(!spine.length||spine.length>600||spine.some(item=>!item||!['application/xhtml+xml','text/html'].includes(item.type)||!entryMap.has(item.path)))throw Error('Urutan bacaan EPUB tidak didukung atau rusak.');
 if(new Set(spine.map(item=>item!.path)).size!==spine.length)throw Error('Urutan bacaan EPUB berulang belum didukung.');
 const toc:EpubToc[]=[];
 const add=(base:string,href:string,title:string)=>{try{const target=epubPath(base,href);if(spine.some(item=>item!.path===target.path)&&title.trim()&&toc.length<600)toc.push({title:title.replace(/\s+/g,' ').trim().slice(0,180),href:target.path+(target.fragment?'#'+encodeURIComponent(target.fragment):'')});}catch{/* Ignore unsafe/non-reading navigation. */}};
 const nav=[...items.values()].find(item=>item.properties.split(/\s+/).includes('nav'));
 if(nav){const doc=xml(await text(nav.path),dom);const navigation=elements(doc,'nav').find(el=>(el.getAttribute('epub:type')||el.getAttributeNS('http://www.idpf.org/2007/ops','type')||'').split(/\s+/).includes('toc'))||elements(doc,'nav')[0];if(navigation)for(const link of elements(navigation,'a'))add(nav.path,link.getAttribute('href')||'',link.textContent||'');}
 if(!toc.length){const ncx=[...items.values()].find(item=>item.type==='application/x-dtbncx+xml');if(ncx){const doc=xml(await text(ncx.path),dom);for(const point of elements(doc,'navPoint')){const content=elements(point,'content')[0],label=elements(point,'navLabel')[0];if(content)add(ncx.path,content.getAttribute('src')||'',label?.textContent||'');}}}
 if(!toc.length)for(const [index,item] of spine.entries())toc.push({title:`Bagian ${index+1}`,href:item!.path});
 // Canonical boundaries follow actual document order, never TOC order. Multiple
 // chapters inside one XHTML remain individually publishable without saved extracts.
 const canonical:EpubToc[]=[];
 for(const [index,item] of spine.entries()){
  const path=item!.path,doc=xml(await text(path),dom),body=elements(doc,'body')[0];if(!body)throw Error('Isi EPUB tidak terbaca.');
  const links=toc.filter(link=>epubPath('root.xml',link.href).path===path),all=Array.from(body.getElementsByTagName('*'));
  const ids=all.map(el=>el.getAttribute('id')).filter(Boolean);if(new Set(ids).size!==ids.length)throw Error('EPUB memiliki jangkar bab duplikat.');
  const anchors=new Map<string,EpubToc>();for(const link of links){const target=epubPath('root.xml',link.href);if(target.fragment){if(!ids.includes(target.fragment))throw Error('Jangkar daftar isi EPUB tidak ditemukan.');anchors.set(target.fragment,link);}}
  const ordered=all.filter(el=>anchors.has(el.getAttribute('id')||''));
  let prefix=false,seen=false;
  const walk=(node:Node)=>{if(seen)return;if(node.nodeType===1&&node===ordered[0]){seen=true;return;}if(node.nodeType===3&&node.nodeValue?.trim())prefix=true;if(node.nodeType===1&&['img','image'].includes((node as Element).localName))prefix=true;for(const child of Array.from(node.childNodes))walk(child);};
  if(ordered.length)walk(body);
  if(!ordered.length||prefix)canonical.push({title:links.find(link=>!epubPath('root.xml',link.href).fragment)?.title||(ordered.length?'Pembuka':elements(doc,'title')[0]?.textContent?.trim())||`Bagian ${index+1}`,href:path});
  for(const el of ordered)canonical.push(anchors.get(el.getAttribute('id')!)!);
 }
 if(!canonical.length||canonical.length>600)throw Error('Maksimal 600 bagian internal EPUB.');
 const metadata:EpubMetadata={title:(elements(opf,'title')[0]?.textContent||'Buku EPUB').trim().slice(0,180),creator:(elements(opf,'creator')[0]?.textContent||'').trim().slice(0,180),language:(elements(opf,'language')[0]?.textContent||'id').trim().slice(0,30),toc:canonical,sections:spine.length};
 return new EpubArchive(metadata,spine.map(item=>item!.path),text,read,items,dom);
}

/** Original ZIP stays intact. Only the currently displayed spine document is read
 * into memory; scripts, publisher CSS and remote resources never enter the UI. */
export class EpubArchive{
 constructor(readonly metadata:EpubMetadata,readonly spine:string[],private text:(path:string)=>Promise<string>,private read:(path:string,limit?:number)=>Promise<Uint8Array>,private items:Map<string,{path:string;type:string;properties:string}>,private dom:EpubDom){ }
 locate(href:string){const target=epubPath('root.xml',href);return {index:this.spine.indexOf(target.path),fragment:target.fragment};}
 async render(index:number,boundary?:{start:string;end:string}){
  const path=this.spine[index];if(!path)throw Error('Bagian buku tidak tersedia.');
  const doc=xml(await this.text(path),this.dom),body=elements(doc,'body')[0];if(!body)throw Error('Isi EPUB tidak terbaca.');
  const output=this.dom.create(),urls:string[]=[],images=new Map<string,{url:string;width:number;height:number}>();let imageBytes=0,active=!boundary?.start,started=active,ended=!boundary?.end,stopped=false;
  const allowed=new Set('p div section article main h1 h2 h3 h4 h5 h6 span strong b em i u s small sup sub blockquote pre code br hr ul ol li dl dt dd table thead tbody tfoot tr th td figure figcaption a img'.split(' '));
  const blocked=new Set('script style iframe object embed form input button svg math audio video head link meta base'.split(' '));
  const copy=async(node:Node,parent:Node):Promise<void>=>{
   if(stopped)return;
   if(node.nodeType===3){if(active)parent.appendChild(output.createTextNode(node.nodeValue||''));return;}
   if(node.nodeType!==1)return;
   const source=node as Element,tag=source.localName.toLowerCase();if(blocked.has(tag))return;
   const id=source.getAttribute('id');
   if(boundary?.end&&id===boundary.end){ended=true;stopped=true;return;}
   if(boundary?.start&&id===boundary.start){active=true;started=true;}
   const dest=allowed.has(tag)?output.createElement(tag):output.createElement('span');
   if(id)dest.setAttribute('id',id.slice(0,200));
   if(['ltr','rtl','auto'].includes(source.getAttribute('dir')||''))dest.setAttribute('dir',source.getAttribute('dir')!);
   if(tag==='a'){
    const href=source.getAttribute('href')||'';
    if(/^https:\/\//i.test(href)){try{const url=new URL(href);if(!url.username&&!url.password){dest.setAttribute('href',url.href);dest.setAttribute('target','_blank');dest.setAttribute('rel','noopener noreferrer');}}catch{/* Invalid URL. */}}
    else try{const target=epubPath(path,href);if(this.spine.includes(target.path)){dest.setAttribute('href','#');dest.setAttribute('data-epub-href',target.path+(target.fragment?'#'+encodeURIComponent(target.fragment):''));}}catch{/* No unsafe schemes. */}
   }
   if(tag==='img'&&active){
    dest.setAttribute('alt',(source.getAttribute('alt')||'Ilustrasi').slice(0,200));
    try{const imagePath=epubPath(path,source.getAttribute('src')||'').path,item=[...this.items.values()].find(value=>value.path===imagePath);if(!item||!/^image\/(png|jpeg|webp)$/.test(item.type))throw Error('Gambar dilewati.');
     let image=images.get(imagePath);if(!image){const bytes=await this.read(imagePath,8_000_000);imageBytes+=bytes.length;if(imageBytes>2_000_000)throw Error('Batas gambar.');const info=inspectImage(bytes);const url=await this.dom.imageUrl(new Blob([Uint8Array.from(bytes)],{type:info.mime}));image={url,width:info.width,height:info.height};images.set(imagePath,image);urls.push(url);}dest.setAttribute('src',image.url);dest.setAttribute('width',String(image.width));dest.setAttribute('height',String(image.height));dest.setAttribute('decoding','async');
    }catch{dest.setAttribute('alt','[Ilustrasi tidak didukung]');}
   }
   const wasActive=active;
   for(const child of Array.from(source.childNodes))await copy(child,dest);
   if(wasActive||dest.childNodes.length)parent.appendChild(dest);
  };
  try{for(const child of Array.from(body.childNodes))await copy(child,output.body);if(!started||!ended)throw Error('Batas episode EPUB tidak ditemukan.');return {html:this.dom.serialize(output.body),dispose:()=>urls.forEach(url=>this.dom.revoke(url))};}catch(error){urls.forEach(url=>this.dom.revoke(url));throw error;}
 }
 async renderSection(sectionIndex:number){
  const item=this.metadata.toc[sectionIndex];if(!item)throw Error('Episode EPUB tidak ditemukan.');
  const start=this.locate(item.href),next=this.metadata.toc[sectionIndex+1],end=next?this.locate(next.href):null;
  return this.render(start.index,{start:start.fragment,end:end?.index===start.index?end.fragment:''});
 }
}
