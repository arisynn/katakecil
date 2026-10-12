/** Browser-only EPUB 2/3 importer. Parses untrusted XHTML as inert XML/HTML;
 * only Markdown/plain text can leave this module. Never inject EPUB HTML into the DOM.
 */
import JSZip from 'jszip';
import {cleanText,titleInfo,classifyEpubSection} from './importManuscript';
import type {ImportChapter, ParsedManuscript} from './importManuscript';

const MAX_ARCHIVE = 18_000_000;
const MAX_FILES=800;
const MAX_UNCOMPRESSED=70_000_000;
const MAX_DOC=3_000_000;
const MAX_TEXT=12_000_000;
const SKIP_TAGS=new Set(['script','style','iframe','object','embed','form','input','button','svg','audio','video','nav','head']);
const chapterName=/^(?:(?:episode|bab|chapter|chap\.?)(?:\s+|\s*[:#])|prolog|epilog|interlude|interlud)\b/i;
const arcName=/^(?:arc|bagian|part|jilid|volume)\s+[ivxlcdm\d]+/i;

function xml(source:string,kind='application/xml'):Document{
  if(/<!ENTITY\b/i.test(source))throw Error('Deklarasi entitas XML tidak diizinkan dalam EPUB.');
  const doc=new DOMParser().parseFromString(source,kind as DOMParserSupportedType);
  if(doc.getElementsByTagName('parsererror').length)throw Error('Struktur XML EPUB rusak atau tidak terbaca.');
  return doc;
}
function elements(root:Document|Element,name:string):Element[]{
  return Array.from(root.getElementsByTagName('*')).filter(n=>n.localName.toLowerCase()===name.toLowerCase());
}
function getAttr(el:Element,key:string):string{return el.getAttribute(key)||'';}
function basename(path:string){return path.replace(/^.*\//,'');}
function resolvePackage(root:string,relative:string):string{
  const path=decodeURIComponent(relative.split('#')[0].split('?')[0].replace(/\\/g,'/'));
  const absolute=path.startsWith('/')?path.slice(1):root.split('/').slice(0,-1).concat(path).join('/');
  const parts:string[]=[];
  for(const part of absolute.split('/')){if(part==='.'||part==='')continue;if(part==='..'){if(!parts.length)throw Error('EPUB memakai path di luar paket.');parts.pop();}else parts.push(part);}
  return parts.join('/');
}
function normalized(s:string):string{return s.replace(/\s+/g,' ').trim();}
function readHeading(el:Element){return normalized(el.textContent||'');}
function inline(node:Node):string{
  if(node.nodeType===3)return (node.nodeValue||'').replace(/\s+/g,' ');
  if(node.nodeType!==1)return '';
  const el=node as Element;const tag=el.localName.toLowerCase();if(SKIP_TAGS.has(tag))return '';
  if(tag==='br')return '\n';
  if(tag==='img'||tag==='image')return '';
  const value=Array.from(el.childNodes).map(inline).join('');
  if(!value.trim())return '';
  if(tag==='em'||tag==='i')return `*${value.trim()}*`;
  if(tag==='b'||tag==='strong')return `**${value.trim()}**`;
  if(tag==='code')return `\`${value.trim()}\``;
  return value;
}
function htmlToMarkdown(container:Element|DocumentFragment):string {
  let result='';
  const walk=(node:Node)=>{
    if(node.nodeType===3){const val=(node.nodeValue||'').replace(/\s+/g,' ');if(val.trim())result+=val;return;}
    if(node.nodeType!==1)return;
    const el=node as Element;const tag=el.localName.toLowerCase();if(SKIP_TAGS.has(tag))return;
    if(tag==='img'||tag==='image')return;
    if(tag==='br'){result+='\n';return;}
    if(/^h[1-6]$/.test(tag)){const level=Math.min(Number(tag[1]),4);result+=`\n\n${'#'.repeat(level)} ${normalized(inline(el))}\n\n`;return;}
    if(tag==='hr'){result+='\n\n---\n\n';return;}
    if(tag==='p'||tag==='blockquote'||tag==='li'){
      const val=inline(el).trim();
      if(val)result+=`\n\n${tag==='li'?'- ':tag==='blockquote'?'> ':''}${val}\n\n`;
      return;
    }
    if(tag==='table'){result+='\n\n'+normalized(el.textContent||'')+'\n\n';return;}
    if(tag==='div'||tag==='section'||tag==='article'||tag==='body'||tag==='main'||tag==='ol'||tag==='ul'){
      for(const child of Array.from(el.childNodes))walk(child);
      if(tag==='section'||tag==='article')result+='\n\n';return;
    }
    if(tag==='a'||tag==='span'||tag==='strong'||tag==='em'||tag==='i'||tag==='b'||tag==='small'||tag==='sup'||tag==='sub'){
      result+=inline(el);return;
    }
    for(const child of Array.from(el.childNodes))walk(child);
  };
  for(const node of Array.from(container.childNodes))walk(node);
  return result.replace(/[ \t]+\n/g,'\n').replace(/\n[ \t]+/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
}
function getBody(doc:Document):Element {return elements(doc,'body')[0]||doc.documentElement;}
function normalizeTitle(s:string):string{return cleanText(s).replace(/^\s*[\-–—:]+/,'').slice(0,180);}

/** Chapter extraction uses spine order, not filename alphabetical sorting. */
function splitDocument(doc:Document,source:string,tocTitle:string,arc:string,index:number,warnings:string[],tocEntries:TocEntry[]=[]):ImportChapter[]{
  const body=getBody(doc);
  const headings=elements(body,'h1').concat(elements(body,'h2'),elements(body,'h3'),elements(body,'h4'))
    .sort((a,b)=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_PRECEDING?1:-1);
  const chapterHeads=headings.filter(h=>chapterName.test(readHeading(h)));
  const out:ImportChapter[]=[];
  const withAnchor=tocEntries.filter(t=>t.fragment).map(t=>({entry:t,element:Array.from(body.getElementsByTagName('*')).find(x=>x.id===t.fragment)})).filter(x=>x.element) as {entry:TocEntry;element:Element}[];
  if(chapterHeads.length<2 && withAnchor.length>=2){
    const range=doc.createRange();
    for(let i=0;i<withAnchor.length;i++){
      const current=withAnchor[i],next=withAnchor[i+1];
      range.setStartBefore(current.element);if(next)range.setEndBefore(next.element);else range.setEndAfter(body.lastChild||body);
      const text=htmlToMarkdown(range.cloneContents());if(!text)continue;
      const info=titleInfo(current.entry.title);
      out.push({key:`epub-${index}-${i}`,episode_number:info.number,title:current.entry.title,arc_title:current.entry.arc||arc,content_md:text,include:true,confidence:'sedang',origin:source});
    }
  } else if(chapterHeads.length>=2){
    const range=doc.createRange();
    for(let i=0;i<chapterHeads.length;i++){
      const current=chapterHeads[i],next=chapterHeads[i+1];
      range.setStartAfter(current);if(next)range.setEndBefore(next);else range.setEndAfter(body.lastChild||body);
      const bodyMd=htmlToMarkdown(range.cloneContents());
      if(!bodyMd)continue;
      const info=titleInfo(readHeading(current));
      out.push({key:`epub-${index}-${i}`,episode_number:info.number,title:info.title,arc_title:arc,content_md:bodyMd,include:true,confidence:'tinggi',origin:source});
    }
  } else {
    const rawHeading=chapterHeads[0]||headings.find(h=>chapterName.test(readHeading(h)))||headings[0];
    const title=normalizeTitle(tocTitle|| (rawHeading?readHeading(rawHeading):basename(source).replace(/\.x?html?$/i,'').replace(/[-_]/g,' ')))||`Bagian ${index+1}`;
    const info=titleInfo(title);
    // remove first chapter heading from body without mutating original XML and without losing preceding content
    const cloned=body.cloneNode(true) as Element;
    if(rawHeading){const equivalentHeadings=elements(cloned,rawHeading.localName);const originalArray=elements(body,rawHeading.localName);const hIndex=originalArray.indexOf(rawHeading);equivalentHeadings[hIndex]?.remove();}
    const bodyMd=htmlToMarkdown(cloned);
    if(bodyMd)out.push({key:`epub-${index}-0`,episode_number:info.number,title,arc_title:arc,content_md:bodyMd,include:true,confidence:chapterHeads.length?info.confidence:tocTitle?'sedang':'periksa',origin:source});
  }
  if(!out.length&&htmlToMarkdown(body).length>100)warnings.push(`Bagian ${source} tidak terbagi otomatis. Periksa XHTML-nya.`);
  return out;
}

type TocEntry={href:string;fragment:string;title:string;arc:string};
function findNav(doc:Document,packageFile:string):TocEntry[]{
  const entries:TocEntry[]=[];
  const navs=elements(doc,'nav');
  const navigation=navs.find(n=>/\btoc\b/.test(n.getAttribute('epub:type')||n.getAttribute('type')||''))||navs[0];
  if(!navigation)return entries;
  const collect=(ol:Element,parent='')=>{
    for(const li of Array.from(ol.children).filter(n=>n.localName.toLowerCase()==='li')){
      const link=Array.from(li.children).find(n=>['a','span'].includes(n.localName.toLowerCase()));
      const title=normalized(link?.textContent||'');
      const href=link?.getAttribute('href')||'';
      if(href)entries.push({href:resolvePackage(packageFile,href),fragment:decodeURIComponent(href.split('#')[1]||''),title,arc:parent});
      const nested=Array.from(li.children).find(n=>n.localName.toLowerCase()==='ol');
      if(nested)collect(nested,arcName.test(title)?title:parent);
    }
  };
  const ol=elements(navigation,'ol')[0];if(ol)collect(ol);
  return entries;
}
function findNcx(doc:Document,packageFile:string):TocEntry[]{
  const entries:TocEntry[]=[];
  const walk=(parent:Element,arc='')=>{
    for(const node of Array.from(parent.children).filter(el=>el.localName==='navPoint')){
      const label=elements(node,'navLabel')[0];const title=normalized(label?.textContent||'');
      const content=Array.from(node.children).find(el=>el.localName==='content');const src=content?.getAttribute('src')||'';
      if(src)entries.push({href:resolvePackage(packageFile,src),fragment:decodeURIComponent(src.split('#')[1]||''),title,arc});
      walk(node,arcName.test(title)?title:arc);
    }
  };
  const map=elements(doc,'navMap')[0];if(map)walk(map);
  return entries;
}

export async function parseEpubFile(file:File):Promise<ParsedManuscript> {
  if(!/\.epub$/i.test(file.name))throw Error('Pilih berkas berakhiran .epub.');
  if(file.size<50||file.size>MAX_ARCHIVE)throw Error('Ukuran EPUB harus 50 byte–18 MB.');
  const header=new Uint8Array(await file.slice(0,4).arrayBuffer());
  if(header[0]!==0x50||header[1]!==0x4b)throw Error('Berkas bukan arsip EPUB/ZIP yang valid.');
  let archive:JSZip;
  try{archive=await JSZip.loadAsync(await file.arrayBuffer());}catch{throw Error('EPUB rusak, terenkripsi, atau tidak dapat dibuka.');}
  const paths=Object.values(archive.files).filter(f=>!f.dir);
  if(paths.length>MAX_FILES)throw Error(`Terlalu banyak berkas dalam EPUB (maks. ${MAX_FILES}).`);
  let declaredTotal=0;
  const seen=new Set<string>();
  for(const entry of paths){
    const original=(entry as typeof entry & {unsafeOriginalName?:string}).unsafeOriginalName||entry.name;
    if(original.includes('\\')||original.startsWith('/')||original.split('/').includes('..')||/[\u0000-\u001f]/.test(original))throw Error('Nama berkas EPUB tidak aman.');
    const key=entry.name.normalize('NFC').toLowerCase();if(seen.has(key))throw Error('EPUB memiliki nama berkas duplikat.');seen.add(key);
    const size=(entry as typeof entry & {_data?:{uncompressedSize?:number}})._data?.uncompressedSize;
    if(typeof size!=='number'||!Number.isFinite(size)||size<0)throw Error('Ukuran isi EPUB tidak dapat divalidasi.');
    declaredTotal+=size;
    if(declaredTotal>MAX_UNCOMPRESSED)throw Error('EPUB terlalu besar setelah diekstraksi.');
    if(/\.(?:html?|xhtml|xml|ncx|opf)$/i.test(entry.name)&&size>MAX_DOC)throw Error('Salah satu dokumen EPUB melebihi batas 3 MB.');
  }
  if(archive.file('META-INF/encryption.xml'))throw Error('EPUB memiliki bagian terenkripsi/DRM atau obfuscation. Gunakan EPUB yang tidak dienkripsi.');
  const warnings:string[]=[];
  const get=async(name:string):Promise<string>=>{
    const entry=archive.file(name);if(!entry)throw Error(`Bagian EPUB tidak ditemukan: ${name}`);
    const raw=await entry.async('string');if(raw.length>MAX_DOC)throw Error(`Dokumen ${name} terlalu besar.`);return raw;
  };
  const container=xml(await get('META-INF/container.xml'));
  const rootfile=elements(container,'rootfile')[0];if(!rootfile)throw Error('EPUB tidak memiliki rootfile OPF.');
  const packagePath=getAttr(rootfile,'full-path');
  if(!packagePath)throw Error('Lokasi package OPF kosong.');
  const opfName=resolvePackage('META-INF/container.xml','/'+packagePath);
  const opf=xml(await get(opfName));
  const metadata=elements(opf,'metadata')[0]||opf.documentElement;
  const findMeta=(name:string)=>normalized(elements(metadata,name)[0]?.textContent||'');
  const title=findMeta('title')||file.name.replace(/\.epub$/i,'');
  const creator=findMeta('creator');const language=findMeta('language');
  const items=new Map<string,{path:string;type:string;props:string}>();
  for(const el of elements(opf,'item')){
    const id=getAttr(el,'id'),href=getAttr(el,'href');if(id&&href)items.set(id,{path:resolvePackage(opfName,href),type:getAttr(el,'media-type'),props:getAttr(el,'properties')});
  }
  const spine=elements(opf,'spine')[0];if(!spine)throw Error('EPUB tidak memiliki spine (urutan baca).');
  const refs=Array.from(spine.children).filter(el=>el.localName==='itemref'&&getAttr(el,'linear')!=='no').map(el=>getAttr(el,'idref'));
  if(!refs.length)throw Error('EPUB tidak memiliki bab dalam spine.');
  let toc:TocEntry[]=[];
  const navItem=Array.from(items.values()).find(x=>x.props.split(/\s+/).includes('nav'));
  const tocId=getAttr(spine,'toc');const ncxItem=items.get(tocId);
  try{
    if(navItem)toc=findNav(xml(await get(navItem.path),'application/xhtml+xml'),navItem.path);
    else if(ncxItem)toc=findNcx(xml(await get(ncxItem.path)),ncxItem.path);
  }catch{warnings.push('Daftar isi tidak dapat dibaca. Judul episode ditebak dari heading.');}
  const chapterList:ImportChapter[]=[];
  let totalText=0, omittedImages=0;
  for(let i=0;i<refs.length;i++){
    const item=items.get(refs[i]);if(!item)throw Error(`Spine mengacu ke item tidak ditemukan (${refs[i]}).`);
    if(!/xhtml\+xml|html/i.test(item.type))continue;
    const raw=await get(item.path);
    if(/<!ENTITY\b/i.test(raw))throw Error('EPUB mengandung entitas XML yang tidak diperbolehkan.');
    let doc:Document;
    try{doc=xml(raw,'application/xhtml+xml');}
    catch{throw Error(`XHTML ${basename(item.path)} tidak valid. Perbaiki EPUB atau ekspor ulang dari editor ebook sebelum mengimpor.`);}
    omittedImages+=elements(doc,'img').length;
    const entries=toc.filter(t=>t.href===item.path);
    const label=entries[0]?.title||'';
    const arc=entries.find(t=>t.arc)?.arc||'';
    const parsed=splitDocument(doc,item.path,label,arc,i,warnings,entries);
    const semanticTags=[getBody(doc),...elements(getBody(doc),'section')].map(el=>el.getAttribute('epub:type')||el.getAttributeNS('http://www.idpf.org/2007/ops','type')||'').join(' ');
    const isKnownNonStory=/(?:^|\s)(?:frontmatter|cover|titlepage|halftitlepage|copyright-page|toc|dedication|acknowledgments|colophon|imprint)(?:$|\s)/i.test(semanticTags);
    for(const part of parsed){
      const sectionType=isKnownNonStory?'frontmatter':classifyEpubSection(part.title,item.path);
      if(sectionType!=='episode'){
        part.include=false;part.confidence='periksa';
        part.section_type=sectionType;
      }
      totalText+=part.content_md.length;
      if(totalText>MAX_TEXT)throw Error('Isi naskah terlalu panjang untuk sekali impor (maks. 12 juta karakter).');
      chapterList.push(part);
    }
  }
  if(!chapterList.length)throw Error('Tidak ditemukan naskah teks pada spine. EPUB fixed-layout atau hanya berisi gambar belum didukung.');
  if(chapterList.length>240)throw Error('Terlalu banyak bagian ditemukan. Pecah EPUB sebelum mengimpor.');
  if(omittedImages)warnings.push(`${omittedImages} ilustrasi ditemukan. Gambar di dalam episode belum dipindahkan ke Markdown; tinjau naskah sebelum impor.`);
  if(!toc.length)warnings.push('Tidak ditemukan daftar isi EPUB; beberapa judul mungkin perlu dikoreksi.');
  const exclusions=chapterList.filter(x=>x.section_type==='frontmatter').length;
  if(exclusions)warnings.push(`${exclusions} halaman non-episode dikecualikan otomatis (misalnya sampul, daftar isi, atau hak cipta). Halaman tersebut tetap bisa ditinjau dan dicentang secara manual.`);
  if(chapterList.some(x=>x.confidence==='periksa'&&x.include))warnings.push('Sebagian batas/judul episode masih belum pasti. Periksa daftar sebelum menyimpan.');
  let cover:ParsedManuscript['cover'];
  const coverID=elements(opf,'meta').find(x=>getAttr(x,'name')==='cover')?.getAttribute('content');
  const coverItem=(coverID&&items.get(coverID))||Array.from(items.values()).find(x=>x.props.split(/\s+/).includes('cover-image'));
  if(coverItem && /^image\/(?:png|jpeg|webp)$/.test(coverItem.type)){
    const z=archive.file(coverItem.path);
    if(z){const bytes=await z.async('uint8array');if(bytes.byteLength<=5_000_000)cover={data:new Blob([Uint8Array.from(bytes)],{type:coverItem.type}),mime:coverItem.type};else warnings.push('Sampul terlalu besar untuk diunggah otomatis (maks. 5 MB).');}
  }
  return {name:file.name,format:'epub',title:cleanText(title),creator,language,chapters:chapterList,warnings,cover};
}
