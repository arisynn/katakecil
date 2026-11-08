export const PARSER_REVISION = 8;

// Covers stay inside the EPUB: never load a URL supplied by a book.
async function coverFromPackage(zip,opf,opfPath,DOMParser){
 const base='https://epub.local/';
 const fileAt=(href,path)=>{try{const u=new URL(href,base+path);return u.origin===base.slice(0,-1)?decodeURIComponent(u.pathname.slice(1)):null;}catch{return null;}};
 const raster=async path=>{
  const file=path&&zip.file(path);if(!file||file._data?.uncompressedSize>5*1024*1024)return '';
  const bytes=await file.async('uint8array');if(bytes.length>5*1024*1024)return '';
  const mime=bytes[0]===255&&bytes[1]===216&&bytes[2]===255?'image/jpeg':bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71?'image/png':String.fromCharCode(...bytes.slice(0,6)).match(/^GIF8[79]a$/)?'image/gif':String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'?'image/webp':'';
  return mime?'data:'+mime+';base64,'+await file.async('base64'):'';
 };
 const items=Array.from(opf.getElementsByTagName('item'));
 const coverId=Array.from(opf.getElementsByTagName('meta')).find(n=>n.getAttribute('name')==='cover')?.getAttribute('content');
 const candidates=items.filter(n=>/\bcover-image\b/.test(n.getAttribute('properties')||''));
 candidates.push(...items.filter(n=>coverId&&n.getAttribute('id')===coverId));
 const guide=Array.from(opf.getElementsByTagName('reference')).filter(n=>n.getAttribute('type')==='cover');
 candidates.push(...guide,...items.filter(n=>/cover/i.test(n.getAttribute('id')||'')||/(?:^|\/)cover[._-]/i.test(n.getAttribute('href')||'')));
 for(const item of [...new Set(candidates)]){
  try{
   const path=fileAt(item.getAttribute('href'),opfPath),direct=await raster(path);if(direct)return direct;
   const file=path&&zip.file(path);if(!file||file._data?.uncompressedSize>1024*1024)continue;
   // A common cover is XHTML containing img, or SVG wrapping a raster image.
   if(!/\.(?:xhtml?|html?|svg)$/i.test(path))continue;
   const doc=new DOMParser().parseFromString(await file.async('string'),'text/html');
   for(const img of doc.querySelectorAll('img,image')){const href=img.getAttribute('src')||img.getAttribute('href')||img.getAttribute('xlink:href');if(!href)continue;const found=await raster(fileAt(href,path));if(found)return found;}
  }catch{/* An optional malformed cover must not block a readable book. */}
 }
 return '';
}
export async function extractEpubCover(buffer,options={}){
 if(buffer.byteLength>30*1024*1024)return '';
 try{
  const zip=await (options.JSZip||globalThis.JSZip).loadAsync(buffer);
  const entries=Object.values(zip.files);if(entries.length>5000||entries.reduce((n,f)=>n+(f._data?.uncompressedSize||0),0)>100*1024*1024)return '';
  const Parser=options.DOMParser||globalThis.DOMParser;
  const container=zip.file('META-INF/container.xml');if(!container||container._data?.uncompressedSize>1024*1024)return '';
  const path=new Parser().parseFromString(await container.async('string'),'application/xml').getElementsByTagName('rootfile')[0]?.getAttribute('full-path');
  const packageFile=path&&zip.file(path);if(!packageFile||packageFile._data?.uncompressedSize>1024*1024)return '';
  return await coverFromPackage(zip,new Parser().parseFromString(await packageFile.async('string'),'application/xml'),path,Parser);
 }catch{return '';}
}

const arcName=(value='',nested=false)=>{
 const match=String(value).trim().match(new RegExp('^(arc|ark|part'+(nested?'|bagian|book|buku':'')+')\\s+(\\d+|[ivxlcdm]+)(?=\\s|[.:—–-]|$)[\\s.:—–-]*(.*)$','i'));
 return match?{label:'ARC '+match[2].toUpperCase(),title:match[3].trim()}:null;
};

export function chapterLabelOf(value=''){
 const match=String(value).match(/^(bab|episode|chapter|bagian)\s*(\d+(?:\.\d+)?|[ivxlcdm]+(?=\s|[.:—–-]|$))/i);
 if(!match)return '';return ({bab:'BAB',episode:'EPISODE',chapter:'BAB',bagian:'BAGIAN'}[match[1].toLowerCase()])+' '+match[2].toUpperCase();
}

/* EPUB content is parsed as inert XML and rendered as text only. */
export async function parseEpub(buffer, fallback = 'Untitled book', options = {}) {
  // Server reading uses the same inert parser with explicit dependencies, without shared globals.
  const JSZip = options.JSZip || globalThis.JSZip;
  const DOMParser = options.DOMParser || globalThis.DOMParser;
  if (buffer.byteLength > 30 * 1024 * 1024) throw new Error('This EPUB is larger than 30 MB. Please choose a smaller file.');
  const zip = await JSZip.loadAsync(buffer);
  const entries = Object.values(zip.files);
  if (entries.length > 5000 || entries.reduce((n, f) => n + (f._data?.uncompressedSize || 0), 0) > 100 * 1024 * 1024) throw new Error('This EPUB is too large to safely open in the browser.');
  if (zip.file('META-INF/encryption.xml')) throw new Error('Encrypted or DRM-protected EPUBs are not supported. Please use a DRM-free edition.');
  const xml = (source) => {
    const document = new DOMParser().parseFromString(source, 'application/xml');
    if (document.querySelector('parsererror')) throw new Error('The EPUB contains an invalid XML document.');
    return document;
  };
  const read = async (path) => {
    const file = zip.file(path);
    if (!file) throw new Error('An essential EPUB file is missing. Please try another edition.');
    return file.async('string');
  };
  const container = xml(await read('META-INF/container.xml'));
  const opfPath = container.getElementsByTagName('rootfile')[0]?.getAttribute('full-path');
  if (!opfPath) throw new Error('This file does not contain a valid EPUB package.');
  const opf = xml(await read(opfPath));
  const metadata = (name) => opf.getElementsByTagNameNS('*', name)[0]?.textContent?.trim();
  const manifest = new Map(Array.from(opf.getElementsByTagName('item'), el => [el.id, el]));
  const resolve = (path) => {
    const parts = (opfPath.slice(0, opfPath.lastIndexOf('/') + 1) + decodeURIComponent(path.split('#')[0])).split('/');
    const normalized = [];
    for (const part of parts) { if (part === '..') normalized.pop(); else if (part !== '.') normalized.push(part); }
    return normalized.join('/');
  };
  const chapterNames = new Map(),chapterArcs=new Map(),fragmentNames=new Map(),fragmentArcs=new Map();
  const navTarget=(href,path)=>{const url=new URL(href,'https://epub.local/'+path);if(url.origin!=='https://epub.local')throw Error('External navigation');return decodeURIComponent(url.pathname.slice(1));};
  const rememberFragment=(href,path,label,arc)=>{const url=new URL(href,'https://epub.local/'+path);if(url.origin!=='https://epub.local')return;const key=decodeURIComponent(url.pathname.slice(1))+decodeURIComponent(url.hash);if(url.hash){fragmentNames.set(key,label);if(arc)fragmentArcs.set(key,arc);}};
  const ncx = Array.from(manifest.values()).find(el => el.getAttribute('media-type') === 'application/x-dtbncx+xml');
  if (ncx) {
    try {
      const ncxPath=resolve(ncx.getAttribute('href')),toc = xml(await read(ncxPath));
      for (const point of toc.getElementsByTagName('navPoint')) {
        const content = point.getElementsByTagName('content')[0];
        const label = point.getElementsByTagName('text')[0]?.textContent?.trim();
        if (content && label){rememberFragment(content.getAttribute('src'),ncxPath,label);const key=navTarget(content.getAttribute('src'),ncxPath);if(!chapterNames.has(key))chapterNames.set(key,label);
          for(let parent=point.parentElement;parent;parent=parent.parentElement)if(parent.localName==='navPoint'){
            const named=parent.getElementsByTagName('text')[0]?.textContent?.trim(),arc=arcName(named,true);
            if(arc){const info={...arc,id:navTarget(parent.getElementsByTagName('content')[0]?.getAttribute('src')||key,ncxPath)+'#'+arc.label};chapterArcs.set(key,info);rememberFragment(content.getAttribute('src'),ncxPath,label,info);break;}
          }
        }
      }
    } catch { /* Chapter headings remain available without optional navigation. */ }
  }
  // EPUB 3 navigation is as important as the older NCX table of contents.
  const navItem=Array.from(manifest.values()).find(el=>/\bnav\b/.test(el.getAttribute('properties')||''));
  if(navItem){try{
    const navPath=resolve(navItem.getAttribute('href'));
    const navDoc=new DOMParser().parseFromString(await read(navPath),'text/html');
    const toc=Array.from(navDoc.querySelectorAll('nav')).find(node=>node.getAttribute('epub:type')?.split(/\s+/).includes('toc')||node.getAttribute('role')==='doc-toc')||navDoc.querySelector('nav')||navDoc.body;
    for(const link of toc.querySelectorAll('a[href]')){
      const target=new URL(link.getAttribute('href'),'https://epub.local/'+navPath);
      if(target.origin!=='https://epub.local')continue;
      const key=decodeURIComponent(target.pathname.slice(1));rememberFragment(link.getAttribute('href'),navPath,link.textContent.replace(/\s+/g,' ').trim());
      if(!chapterNames.has(key))chapterNames.set(key,link.textContent.replace(/\s+/g,' ').trim());
      for(let li=link.closest('li')?.parentElement?.closest('li');li;li=li.parentElement?.closest('li')){
        const parent=li.querySelector(':scope > a,:scope > span'),arc=arcName(parent?.textContent?.replace(/\s+/g,' ').trim(),true);
        if(arc){const info={...arc,id:(parent?.getAttribute('href')?navTarget(parent.getAttribute('href'),navPath):navPath)+'#'+arc.label};chapterArcs.set(key,info);rememberFragment(link.getAttribute('href'),navPath,link.textContent.replace(/\s+/g,' ').trim(),info);break;}
      }
    }
  }catch{/* The spine still supplies readable text. */}}
  const chapterMarker=/^(?:bab|episode|chapter|bagian)\s*(?:\d+(?:\.\d+)?(?=\s|[.:—–-]|[A-ZÀ-Ý]|$)|[ivxlcdm]+(?=\s|[.:—–-]|$))[\s.:—–-]*/i;
  const plain=node=>{const clone=node.cloneNode(true);clone.querySelectorAll('br').forEach(el=>el.replaceWith(' '));return clone.textContent.replace(/\s+/g,' ').trim();};
  const realTitle=(value,node=null)=>{
    const named=node?.querySelector('.chapter-name,.chapter-title-text,.subtitle');
    if(named)return plain(named);
    return value.replace(chapterMarker,'').trim();
  };
  const specialTitle=value=>/^(?:prolog(?:ue)?|epilog(?:ue)?|interlude|selingan|afterword|kata penutup)(?:\s*[.:—–-].*)?$/i.test(value);
  const isMarker=value=>value.length<=180&&chapterMarker.test(value);
  // Some EPUBs keep chapter numbers in semantic heading IDs rather than visible text.
  const headingLabel=node=>{
    const match=node.id?.match(/^(bab|chapter|episode|bagian)[_-]?(\d+)(?:[_-](?:title|heading))?$/i);
    return match?chapterLabelOf(match[1]+' '+Number(match[2])):'';
  };
  const isGenerated=value=>/^(?:section|bagian|bab|chapter)\s*\d*$/i.test(value);
  const chapters = [];
  let currentArc=null;
  for (const ref of opf.getElementsByTagName('itemref')) {
    if (ref.getAttribute('linear') === 'no') continue;
    const item = manifest.get(ref.getAttribute('idref'));
    if (!item || /cover|pg-footer/.test(item.id) || /\bnav\b/.test(item.getAttribute('properties') || '')) continue;
    const href = item.getAttribute('href');
    if (!/html|xml/.test(item.getAttribute('media-type') || '')) continue;
    const path = resolve(href);
    if(/(?:^|\/)(?:cover|front|title(?:page)?|imprint|copyright|colophon|toc|contents)\.(?:xhtml?|html?)$/i.test(path))continue;
    const doc = new DOMParser().parseFromString(await read(path), 'text/html');
    doc.querySelectorAll('script,style,nav,iframe,object,embed,form,header,footer,[hidden],#pg-header,#pg-footer,.pg-boilerplate,.toc').forEach(el => el.remove());
    const blocks = Array.from(doc.body.querySelectorAll('p,h1,h2,h3,h4,pre,li')).filter(el => !el.parentElement?.closest('p,pre,li'));
    const navigationTitle=chapterNames.get(path)||'',bodyTitle=blocks.find(el=>/^H[1-4]$/.test(el.tagName));
    const semanticFront=Array.from(doc.querySelectorAll('*')).some(el=>el.getAttributeNames().some(name=>/(?:^|:)type$/.test(name)&&/\b(?:titlepage|copyright-page|toc)\b/.test(el.getAttribute(name)||'')));
    const frontName=/^(?:halaman\s+judul(?:\s*&\s*sinopsis)?|sinopsis|synopsis|title\s*page|copyright|hak\s*cipta|imprint|informasi\s+buku|daftar\s+isi)$/i;
    const normalizedTitle=value=>String(value).normalize('NFKC').toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu,'');
    const isBookTitle=bodyTitle&&normalizedTitle(plain(bodyTitle))===normalizedTitle(metadata('title')||fallback);
    if(!chapters.length&&(semanticFront||frontName.test(navigationTitle)||frontName.test(bodyTitle?plain(bodyTitle):'')||isBookTitle&&doc.body.textContent.length<1800&&doc.body.textContent.toLocaleLowerCase().includes((metadata('creator')||'\u0000').toLocaleLowerCase())))continue;
    const arcHeading=blocks.find(el=>/^H[1-3]$/.test(el.tagName)&&/^arc[_-]\d+(?:[_-](?:title|heading))?$/i.test(el.id));
    const textArc=blocks.slice(0,3).map(el=>arcName(plain(el))).find(Boolean);
    const declaredArc=arcName(navigationTitle)||textArc||(arcHeading?{label:'ARC '+Number(arcHeading.id.match(/\d+/)[0]),title:plain(arcHeading)}:null);
    if(chapterArcs.has(path))currentArc=chapterArcs.get(path);
    if(declaredArc){
      const title=declaredArc.title||plain(bodyTitle||blocks[0]);
      currentArc={...declaredArc,title:arcName(title)?'':title,id:path+'#'+(arcHeading?.id||declaredArc.label)};
      const range=/^(?:episode|bab|chapter)\s*\d+\s*(?:[–—-]|sampai|to)\s*\d+$/i;
      if(blocks.every(el=>/^H[1-4]$/.test(el.tagName)||arcName(plain(el))||range.test(plain(el))||plain(el)===currentArc.title))continue;
    }
    const chapterStart=chapters.length;
    const navKeys=new Map();
    for(const [key,label] of fragmentNames){
      if(!key.startsWith(path+'#'))continue;
      const id=key.slice(path.length+1),target=doc.getElementById(id);if(!target)continue;
      const block=blocks.find(el=>el===target||target.contains(el)||!!(target.compareDocumentPosition(el)&4));
      if(block&&!navKeys.has(block))navKeys.set(block,{id,label});
    }
    const navLabel=el=>navKeys.get(el)?.label;
    const headings = blocks.filter(el => /^H[123]$/.test(el.tagName)||isMarker(plain(el))||navLabel(el));
    const explicit = headings.filter(el=>isMarker(plain(el))||/^H[123]$/.test(el.tagName)&&/chapter\s*[IVXLCDM\d]+/i.test(plain(el)));
    const level = headings.some(el=>el.tagName==='H2') ? 'H2' : headings.some(el=>el.tagName==='H1') ? 'H1' : 'H3';
    const tocBoundaries=blocks.filter(el=>navLabel(el));
    // A real TOC is stronger evidence than visual heading size. Subheadings remain text.
    const boundaries = new Set([...(tocBoundaries.length&&!isBookTitle?tocBoundaries:explicit.length?explicit:headings.filter(el=>el.tagName===level)),...headings.filter(el=>specialTitle(plain(el)))]);
    let sourceTitle=chapterNames.get(path)||'';
    let sourceLabel='';
    let title=realTitle(sourceTitle);
    if(isGenerated(title))title='';
    let content = [];
    const frontPreamble=isBookTitle||blocks.slice(0,6).some(el=>/^by\s/i.test(plain(el))&&plain(el).length<240&&plain(el).toLocaleLowerCase().includes((metadata('creator')||'\u0000').toLocaleLowerCase()));
    let started = !boundaries.size;
    let partId='',partNumber=0;
    let markupAfter=null,markupBefore=null;
    const markup = end => {
      const range=doc.createRange();if(markupBefore)range.setStartBefore(markupBefore);else if(markupAfter)range.setStartAfter(markupAfter);else range.setStart(doc.body,0);
      if(end)range.setEndBefore(end);else range.setEnd(doc.body,doc.body.childNodes.length);
      const holder=doc.createElement('div');holder.append(range.cloneContents());return holder.innerHTML;
    };
    const flush = (end=null) => {
      const text = content.join('\n\n').trim();
      if(text.length>0&&!/^(?:by\s)|contents|illustrations|project gutenberg|copyright|titlepage/i.test(sourceTitle||title))chapters.push({title,text,href:partId&&!options.preserveSourceHref?path+'#'+encodeURIComponent(partId):path,chapterLabel:chapterLabelOf(sourceTitle)||sourceLabel,navigationTitle:sourceTitle||title||'Informasi buku',...(options.includeMarkup?{html:markup(end)}:{}),...(currentArc?{arc:{...currentArc}}:{})});
      content=[];
    };
    for (const block of blocks) {
      const value = plain(block);
      if (!value) continue;
      if(!started&&!boundaries.has(block)&&!/^H[1-4]$/.test(block.tagName)){if(frontPreamble)continue;if(value.replace(/^by\s+/i,'').toLocaleLowerCase()===(metadata('creator')||'\u0000').toLocaleLowerCase())continue;started=true;}
      const arcMarker=/^H[1-3]$/.test(block.tagName)&&block.id.match(/^arc[_-](\d+)(?:[_-](?:title|heading))?$/i);
      const inlineArc=/^H[1-3]$/.test(block.tagName)&&arcName(value);
      if(inlineArc){if(started)flush(block);currentArc={...inlineArc,id:path+'#'+(block.id||inlineArc.label)};sourceTitle=value;sourceLabel='';title=inlineArc.title;markupAfter=block;markupBefore=null;started=true;continue;}
      if(arcMarker){
        if(started)flush(block);
        currentArc={id:path+'#'+block.id,label:'ARC '+Number(arcMarker[1]),title:value};
        sourceTitle=value;sourceLabel='';title=value;markupAfter=block;markupBefore=null;started=true;
        continue;
      }
      if(started&&!title&&!content.length&&(/^H[1-4]$/.test(block.tagName)||block.matches('.chapter-name,.chapter-title,.subtitle'))&&!isMarker(value)){title=realTitle(value,block);sourceLabel=headingLabel(block)||sourceLabel;sourceTitle=sourceTitle?sourceTitle+' — '+value:value;markupAfter=block;markupBefore=null;continue;}
      if (boundaries.has(block)) {
        if (started) flush(block);
        // Some illustrated editions put image captions inside chapter headings.
        partId=navKeys.get(block)?.id||block.id||'kk-part-'+(++partNumber);
        if(fragmentArcs.has(path+'#'+partId))currentArc=fragmentArcs.get(path+'#'+partId);
        sourceTitle=navLabel(block)||(value.match(/chapter\s*[IVXLCDM\d]+(?:[.\s:–—-].*)?$/i)?.[0]||value).trim();
        sourceLabel=headingLabel(block);
        title=realTitle(sourceTitle,block);
        if(isGenerated(title))title='';
        markupAfter=block;markupBefore=null;
        if(!/^H[1-4]$/.test(block.tagName)&&!isMarker(value)&&navLabel(block)!==value){content.push(value);markupBefore=block;}
        started = true;
      } else if (started) content.push(value);
    }
    if (started) flush();
    // Retain the old href for single-section documents, including server UUID episodes.
    if(chapters.length-chapterStart===1)chapters[chapterStart].href=path;
    if (!blocks.length) {
      const text=doc.body.textContent.replace(/\s+/g,' ').trim();
      if(text.length>0)chapters.push({title,text,href:path,chapterLabel:chapterLabelOf(sourceTitle)||sourceLabel,navigationTitle:sourceTitle||title||'Informasi buku',...(currentArc?{arc:{...currentArc}}:{})});
    }
  }
  if (!chapters.length) throw new Error('No readable text was found. Image-only and fixed-layout EPUBs are not supported.');
  let narrativeNumber=0;
  for(const chapter of chapters)if(chapter.arc){narrativeNumber++;if(!chapter.chapterLabel&&chapter.title)chapter.chapterLabel=(/^id(?:-|$)/i.test(metadata('language')||'')?'BAB ':'CHAPTER ')+narrativeNumber;}
  return { title: metadata('title') || fallback, author: metadata('creator') || 'Unknown author', language: metadata('language') || 'en', parsedRevision:PARSER_REVISION, chapters, ...(options.includeCover?{cover:await coverFromPackage(zip,opf,opfPath,DOMParser)}:{}) };
}

export function paginate(chapters, maxCharacters = 1800) {
  const pages = [];
  chapters.forEach((chapter, chapterIndex) => {
    let offset = 0;
    while (offset < chapter.text.length) {
      const limit = pages.length && pages[pages.length - 1]?.chapterIndex === chapterIndex ? maxCharacters : Math.round(maxCharacters * .72);
      let end = Math.min(offset + limit, chapter.text.length);
      if (end < chapter.text.length) {
        const paragraph = chapter.text.lastIndexOf('\n\n', end);
        if (paragraph > offset + limit * .52) end = paragraph + 2;
        else { const space = chapter.text.lastIndexOf(' ', end); if (space > offset) end = space + 1; }
      }
      pages.push({ chapterIndex, start: offset, end, text: chapter.text.slice(offset, end) });
      offset = end;
    }
  });
  return pages;
}
