import {parseEpub,chapterLabelOf} from './epub.js?v=10';
import {marked} from './vendor/marked.js?v=1';
import {escapeHTML as esc} from './ui.js?v=14';

const MAX=18000000;
export const normalizedTitle=value=>String(value||'').replace(/^(?:bab|chapter|episode)\s*(?:\d+|[ivxlcdm]+)[\s.:—–-]*/i,'').normalize('NFKC').replace(/\s+/g,' ').trim().toLocaleLowerCase();
const docOf=html=>new DOMParser().parseFromString(html,'text/html');
const plain=html=>docOf(html).body.textContent.replace(/\s+/g,' ').trim();
const arc=value=>/^(?:arc|ark|part)\s+(?:\d+|[ivxlcdm]+)(?=\s|[.:—–-]|$)/i.test(value||'');
export function sectionKind(section,book={}){
 const doc=docOf(section.content_html||'');
 if(section.kind==='page'||arc(section.title)||Array.from(doc.querySelectorAll('h1,h2')).some(el=>/^arc[_-]/i.test(el.id)))return 'page';
 if(/^(?:halaman judul|sinopsis|synopsis|tentang buku|informasi buku|sampul|cover|tamat)$/i.test(section.title))return 'page';
 if(!plain(section.content_html)&&doc.querySelector('img'))return 'page';
 if(normalizedTitle(section.title)===normalizedTitle(book.title)&&plain(section.content_html).length<1800)return 'page';
 return 'episode';
}
export function sectionLabel(section){
 const direct=chapterLabelOf(section.title);if(direct)return direct;
 const doc=docOf(section.content_html||'');
 for(const node of doc.querySelectorAll('h1,h2,h3,.chapter-no')){
  const label=chapterLabelOf(node.textContent)||node.id.match(/^(bab|chapter|episode)[_-]?(\d+)(?:[_-](?:title|heading))?$/i)?.slice(1).join(' ');
  if(label)return chapterLabelOf(label);
 }
 return '';
}
function part(title,html,label=''){
 return {title:title.trim()||'Untitled chapter',content_html:html,kind:arc(title)?'page':'episode',label:label||chapterLabelOf(title)};
}
async function inlineImages(html,zip,path){
 const doc=docOf(html);doc.querySelectorAll('script,style,iframe,object,embed,form').forEach(el=>el.remove());
 for(const img of doc.querySelectorAll('img')){
  const source=img.getAttribute('src')||'';if(/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(source))continue;
  const url=new URL(source,'https://epub.local/'+path),key=decodeURIComponent(url.pathname.slice(1)),file=url.origin==='https://epub.local'&&zip.file(key),extension=key.split('.').pop().toLowerCase();
  if(!file||!['jpg','jpeg','png','webp','gif'].includes(extension)||file._data?.uncompressedSize>10000000){img.removeAttribute('src');continue;}
  img.src=`data:image/${extension==='jpg'?'jpeg':extension};base64,${await file.async('base64')}`;
 }
 return doc.body.innerHTML;
}
export async function importPublisherEpub(file){
 if(file.size>MAX)throw Error('Use an EPUB smaller than 18 MB.');
 const bytes=await file.arrayBuffer(),parsed=await parseEpub(bytes,file.name,{includeMarkup:true}),zip=await JSZip.loadAsync(bytes),parts=[];let previousArc='';
 for(const chapter of parsed.chapters){
  if(chapter.arc&&chapter.arc.id!==previousArc){previousArc=chapter.arc.id;parts.push({...part(chapter.arc.label+' — '+chapter.arc.title,`<p>${esc(chapter.arc.label)}</p><h1>${esc(chapter.arc.title)}</h1>`),kind:'page'});}
  const heading=[chapter.chapterLabel,chapter.title].filter(Boolean).join(' — '),body=await inlineImages(chapter.html||chapter.text.split(/\n\s*\n/).map(p=>'<p>'+esc(p)+'</p>').join(''),zip,chapter.href);
  const item=part(chapter.title||chapter.chapterLabel,`<h1>${esc(heading)}</h1>${body}`,chapter.chapterLabel);item.kind=sectionKind(item,parsed);parts.push(item);
 }
 let cover=null;
 const container=new DOMParser().parseFromString(await zip.file('META-INF/container.xml').async('string'),'application/xml'),opfPath=container.getElementsByTagName('rootfile')[0].getAttribute('full-path'),opf=new DOMParser().parseFromString(await zip.file(opfPath).async('string'),'application/xml');
 const coverId=Array.from(opf.getElementsByTagName('meta')).find(n=>n.getAttribute('name')==='cover')?.getAttribute('content');
 const coverItem=Array.from(opf.getElementsByTagName('item')).find(n=>/\bcover-image\b/.test(n.getAttribute('properties')||'')||coverId&&n.id===coverId);
 if(coverItem){const path=decodeURIComponent(new URL(coverItem.getAttribute('href'),'https://epub.local/'+opfPath).pathname.slice(1)),source=zip.file(path),mime=coverItem.getAttribute('media-type');if(source&&['image/jpeg','image/png','image/webp'].includes(mime)&&source._data?.uncompressedSize<=3000000)cover=new Blob([await source.async('uint8array')],{type:mime});}
 return {...parsed,parts,cover,sourceFile:file};
}
function htmlParts(html,fallback){
 const doc=docOf(html);doc.querySelectorAll('script,style,iframe,object,embed,form').forEach(el=>el.remove());
 const all=[...doc.querySelectorAll('h1,h2,h3')],explicit=all.filter(n=>chapterLabelOf(n.textContent)||arc(n.textContent)),level=Math.min(...all.map(n=>Number(n.tagName[1]))),heads=explicit.length?explicit:all.filter(n=>Number(n.tagName[1])===level),parts=[];
 if(!heads.length){if(!doc.body.textContent.trim())throw Error('No readable chapter text was found.');return [part(fallback,doc.body.innerHTML)];}
 for(const [i,node] of heads.entries()){
  const range=doc.createRange();range.setStartAfter(node);if(heads[i+1])range.setEndBefore(heads[i+1]);else range.setEnd(doc.body,doc.body.childNodes.length);
  const holder=doc.createElement('div');holder.append(range.cloneContents());const title=node.textContent.trim();
  if(!holder.textContent.trim()&&!arc(title))continue;
  parts.push(part(title,`<h1>${esc(title)}</h1>${holder.innerHTML}`));
 }
 return parts;
}
export async function importChapterFile(file){
 if(file.size>MAX)throw Error('Update file is larger than 18 MB.');
 const extension=file.name.split('.').pop().toLowerCase(),fallback=file.name.replace(/\.[^.]+$/,'');
 if(extension==='epub')return(await importPublisherEpub(file)).parts;
 const text=(await file.text()).replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');if(!text.trim())throw Error('The update file is empty.');
 if(['md','markdown'].includes(extension))return htmlParts(marked.parse(text,{async:false}),fallback);
 if(['html','htm','xhtml'].includes(extension))return htmlParts(text,fallback);
 if(extension!=='txt')throw Error('Choose TXT, Markdown, HTML, or EPUB.');
 const lines=text.split('\n'),parts=[];let title=fallback,body=[];
 const flush=()=>{if(body.join('\n').trim()||arc(title))parts.push(part(title,`<h1>${esc(title)}</h1>`+body.join('\n').split(/\n\s*\n/).filter(p=>p.trim()).map(p=>'<p>'+esc(p.trim()).replaceAll('\n','<br/>')+'</p>').join('')));};
 for(const line of lines){const heading=line.match(/^#{1,3}\s+(.+)$/)?.[1]||(/^(?:bab|chapter|episode|arc|part)\s+(?:\d+|[ivxlcdm]+)(?=\s|[.:—–-]|$)/i.test(line.trim())?line.trim():null);if(heading){flush();title=heading;body=[];}else body.push(line);}
 flush();return parts;
}
function canonicalLabel(value=''){
 const match=value.match(/^(BAB|EPISODE|BAGIAN)\s+([IVXLCDM]+|\d+)$/i);if(!match)return value;
 const roman=match[2].toUpperCase(),digits={I:1,V:5,X:10,L:50,C:100,D:500,M:1000};let number=Number(roman);
 if(!Number.isFinite(number)){number=0;for(let i=0;i<roman.length;i++)number+=(digits[roman[i]]<digits[roman[i+1]]?-1:1)*digits[roman[i]];}
 return match[1].toUpperCase()+' '+number;
}
export function matchUpdates(parts,sections){
 const hasArcs=sections.some(section=>arc(section.title)||/id=[\"']arc[_-]/i.test(section.content_html));let number=0;
 const indexed=sections.map(section=>{const kind=section.kind||sectionKind(section);if(kind==='episode'&&hasArcs)number++;return {section,title:normalizedTitle(section.title),label:canonicalLabel(sectionLabel(section)||(kind==='episode'&&hasArcs?'BAB '+number:'')),text:plain(section.content_html)};});
 return parts.map(incoming=>{
  const title=normalizedTitle(incoming.title),label=canonicalLabel(incoming.label);
  const candidates=indexed.filter(s=>(s.title&&s.title===title)||(label&&s.label===label));
  return {...incoming,target:candidates.length>1?'?':candidates.length===1?(candidates[0].text===plain(incoming.content_html)?'skip':candidates[0].section.id):'new'};
 });
}

export function planPublication(book,sections,parts,{first=1,interval=1,start,now=Date.now()}={}){
 if(book.status==='completed'){first=0;interval=1;}
 if(!Number.isInteger(first)||first<0||first>600||!Number.isFinite(interval)||interval<1||interval>365)throw Error('Check the release settings.');
 const next=Date.parse(start);if(book.status!=='completed'&&parts.filter(p=>p.target==='new'&&p.kind==='episode').length>first&&(!Number.isFinite(next)||next<=now))throw Error('Choose a future date for the next release.');
 const result=sections.map(s=>({...s})),changed=[],used=new Set(),kinds=Object.fromEntries(sections.map(s=>[s.id,sectionKind(s,book)]));
 for(const item of parts){
  if(item.target==='skip')continue;if(!item.title.trim()||item.title.length>300)throw Error('Each chapter needs a title of 1–300 characters.');if(item.target==='?')throw Error('Choose a target for each ambiguous chapter.');
  if(item.target==='new'){const added={id:crypto.randomUUID(),title:item.title,content_html:item.content_html,is_enabled:true,release_at:null};result.push(added);kinds[added.id]=item.kind;changed.push({id:added.id,title:added.title,action:'add'});}
  else{if(used.has(item.target))throw Error('Two updates target the same chapter.');used.add(item.target);const index=result.findIndex(s=>s.id===item.target);if(index<0)throw Error('The target chapter no longer exists.');const title=normalizedTitle(item.title)?item.title:result[index].title,doc=docOf(item.content_html);if(!normalizedTitle(item.title)&&doc.querySelector('h1'))doc.querySelector('h1').textContent=[item.label,title].filter(Boolean).join(' — ');result[index]={...result[index],title,content_html:doc.body.innerHTML};changed.push({id:item.target,title:result[index].title,action:'replace'});}
 }
 let addedStories=0;
 for(const section of result)if(!section.release_at&&kinds[section.id]==='episode'){section.release_at=book.status==='completed'||addedStories<first?new Date(now).toISOString():new Date(next+(addedStories-first)*interval*86400000).toISOString();addedStories++;}
 for(let i=0;i<result.length;i++)if(!result[i].release_at)result[i].release_at=result.slice(i+1).find(s=>kinds[s.id]==='episode')?.release_at||result.slice(0,i).reverse().find(s=>kinds[s.id]==='episode')?.release_at||new Date(now).toISOString();
 if(book.status==='completed')result.forEach(s=>{s.release_at=new Date(now).toISOString();s.is_enabled=true;});
 if(!result.length||result.length>600)throw Error('A book needs 1–600 sections.');
 if(result.reduce((n,s)=>n+new TextEncoder().encode(s.content_html).length,0)>16000000)throw Error('Publication content is larger than 16 MB.');
 return {book:{...book},sections:result.map((s,position)=>({...s,position})),kinds,changed};
}
