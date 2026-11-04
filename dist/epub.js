export const PARSER_REVISION = 4;

export function chapterLabelOf(value=''){
 const match=String(value).match(/^(bab|episode|chapter|bagian)\s*(\d+(?:\.\d+)?|[ivxlcdm]+(?=\s|[.:—–-]|$))/i);
 if(!match)return '';return ({bab:'BAB',episode:'EPISODE',chapter:'BAB',bagian:'BAGIAN'}[match[1].toLowerCase()])+' '+match[2].toUpperCase();
}

/* EPUB content is parsed as inert XML and rendered as text only. */
export async function parseEpub(buffer, fallback = 'Untitled book') {
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
  const chapterNames = new Map();
  const ncx = Array.from(manifest.values()).find(el => el.getAttribute('media-type') === 'application/x-dtbncx+xml');
  if (ncx) {
    try {
      const toc = xml(await read(resolve(ncx.getAttribute('href'))));
      for (const point of toc.getElementsByTagName('navPoint')) {
        const content = point.getElementsByTagName('content')[0];
        const label = point.getElementsByTagName('text')[0]?.textContent?.trim();
        if (content && label) chapterNames.set(resolve(content.getAttribute('src')), label);
      }
    } catch { /* Chapter headings remain available without optional navigation. */ }
  }
  // EPUB 3 navigation is as important as the older NCX table of contents.
  const navItem=Array.from(manifest.values()).find(el=>/\bnav\b/.test(el.getAttribute('properties')||''));
  if(navItem){try{
    const navPath=resolve(navItem.getAttribute('href'));
    const navDoc=new DOMParser().parseFromString(await read(navPath),'text/html');
    for(const link of navDoc.querySelectorAll('a[href]')){
      const target=new URL(link.getAttribute('href'),'https://epub.local/'+navPath);
      const key=decodeURIComponent(target.pathname.slice(1));
      if(!chapterNames.has(key))chapterNames.set(key,link.textContent.replace(/\s+/g,' ').trim());
    }
  }catch{/* The spine still supplies readable text. */}}
  const chapterMarker=/^(?:bab|episode|chapter|bagian)\s*(?:\d+(?=\s|[.:—–-]|[A-ZÀ-Ý]|$)|[ivxlcdm]+(?=\s|[.:—–-]|$))[\s.:—–-]*/i;
  const plain=node=>{const clone=node.cloneNode(true);clone.querySelectorAll('br').forEach(el=>el.replaceWith(' '));return clone.textContent.replace(/\s+/g,' ').trim();};
  const realTitle=(value,node=null)=>{
    const named=node?.querySelector('.chapter-name,.chapter-title-text,.subtitle');
    if(named)return plain(named);
    return value.replace(chapterMarker,'').trim();
  };
  const isMarker=value=>value.length<=180&&chapterMarker.test(value);
  const isGenerated=value=>/^(?:section|bagian|bab|chapter)\s*\d*$/i.test(value);
  const chapters = [];
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
    const headings = blocks.filter(el => /^H[123]$/.test(el.tagName)||isMarker(plain(el)));
    const explicit = headings.filter(el=>isMarker(plain(el))||/^H[123]$/.test(el.tagName)&&/chapter\s*[IVXLCDM\d]+/i.test(plain(el)));
    const level = headings.some(el=>el.tagName==='H2') ? 'H2' : headings.some(el=>el.tagName==='H1') ? 'H1' : 'H3';
    const boundaries = new Set(explicit.length?explicit:headings.filter(el=>el.tagName===level));
    let sourceTitle=chapterNames.get(path)||'';
    let title=realTitle(sourceTitle);
    if(isGenerated(title))title='';
    let content = [];
    let started = !boundaries.size;
    const flush = () => {
      const text = content.join('\n\n').trim();
      if(text.length>0&&!/^(?:by\s)|contents|illustrations|project gutenberg|copyright|titlepage/i.test(sourceTitle||title))chapters.push({title,text,href:path,chapterLabel:chapterLabelOf(sourceTitle)||chapterLabelOf(chapterNames.get(path)),navigationTitle:sourceTitle||title||'Informasi buku'});
      content=[];
    };
    for (const block of blocks) {
      const value = plain(block);
      if (!value) continue;
      if(started&&!title&&!content.length&&(/^H[1-4]$/.test(block.tagName)||block.matches('.chapter-name,.chapter-title,.subtitle'))&&!isMarker(value)){title=realTitle(value,block);sourceTitle=sourceTitle?sourceTitle+' — '+value:value;continue;}
      if (boundaries.has(block)) {
        if (started) flush();
        // Some illustrated editions put image captions inside chapter headings.
        sourceTitle=(value.match(/chapter\s*[IVXLCDM\d]+(?:[.\s:–—-].*)?$/i)?.[0]||value).trim();
        title=realTitle(sourceTitle,block);
        if(isGenerated(title))title='';
        started = true;
      } else if (started) content.push(value);
    }
    if (started) flush();
    if (!blocks.length) {
      const text=doc.body.textContent.replace(/\s+/g,' ').trim();
      if(text.length>0)chapters.push({title,text,href:path,chapterLabel:chapterLabelOf(sourceTitle)||chapterLabelOf(chapterNames.get(path)),navigationTitle:sourceTitle||title||'Informasi buku'});
    }
  }
  if (!chapters.length) throw new Error('No readable text was found. Image-only and fixed-layout EPUBs are not supported.');
  return { title: metadata('title') || fallback, author: metadata('creator') || 'Unknown author', language: metadata('language') || 'en', parsedRevision:PARSER_REVISION, chapters };
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
