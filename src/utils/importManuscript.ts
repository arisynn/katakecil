/** Pure import helpers. Never publish directly from file parsing. */
import {parseMarkdownUpload} from './importMarkdown';

export type Confidence = 'tinggi' | 'sedang' | 'periksa';
export type ImportChapter = {
  key: string;
  episode_number: number | null;
  title: string;
  arc_title: string;
  content_md: string;
  confidence: Confidence;
  include: boolean;
  origin: string;
};
export type ParsedManuscript = {
  name: string;
  format: 'epub' | 'md' | 'txt';
  title: string;
  creator: string;
  language: string;
  chapters: ImportChapter[];
  warnings: string[];
  cover?: {data: Blob; mime: string};
};

export const MAX_IMPORT_EPISODES = 120;
export function cleanText(value: string): string {
  return value.normalize('NFC').replace(/[\u200b\ufeff]/g, '').trim();
}
export function normalizeContent(value: string): string {
  return cleanText(value).replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
}
export function titleInfo(raw: string): {number: number | null; title: string; confidence: Confidence; kind: 'chapter' | 'arc' | 'other'} {
  const title = cleanText(raw).replace(/\s+/g,' ').slice(0,180);
  if (/^(?:arc|bagian|part|volume|jilid)\s+(?:[ivxlcdm\d]+)\b/i.test(title)) return {number:null,title,confidence:'tinggi',kind:'arc'};
  const match = title.match(/^(?:episode|bab|chapter|chap\.?|bagian cerita)\s*(?:ke[- ]?)?(\d{1,4}|[IVXLCDM]{1,9})(?:\s*[.:—–-]\s*|\s+)?(.*)$/i);
  if (match) {
    let number = /^\d+$/.test(match[1]) ? Number(match[1]) : fromRoman(match[1]);
    if (!Number.isSafeInteger(number) || number < 1 || number > 9999) number = null;
    return {number,title:title || 'Episode',confidence:number === null?'sedang':'tinggi',kind:'chapter'};
  }
  if (/^(?:prolog|epilog|interlude|interlud|prakata|pendahuluan|penutup)$/i.test(title)) return {number:null,title,confidence:'sedang',kind:'chapter'};
  return {number:null,title,confidence:'periksa',kind:'other'};
}
function fromRoman(raw: string): number | null {
  const symbols: Record<string,number> = {I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
  let total=0, prev=0;
  for(const c of raw.toUpperCase().split('').reverse()) {const value=symbols[c];if(!value)return null;total+=value<prev?-value:value;prev=Math.max(prev,value);}
  return total>0 && total<10000 ? total:null;
}
export function parsePlainManuscript(text:string,name:string):ParsedManuscript {
  if(text.length > 8_000_000) throw Error('Naskah teks maksimal 8 MB per file.');
  const format: 'md'|'txt' = /\.txt$/i.test(name)?'txt':'md';
  const transformed=format==='txt'
    ?text.replace(/^(\s*)((?:Bab|Episode|Chapter)\s+[\dIVXLCDM]+(?:\s*[-—–:]\s*[^\n]+)?)\s*$/gim,(_,indent:string,heading:string)=>`${indent}### ${heading}`)
    :text;
  const firstHeading=transformed.match(/^#\s+([^\n]+)$/m)?.[1]?.trim();
  const detectedTitle=firstHeading && titleInfo(firstHeading).kind==='other'?firstHeading:null;
  const parsed=parseMarkdownUpload(transformed,name);
  const chapters=parsed.map((part,i)=>({key:`${format}-${i}`,episode_number:part.episode_number,title:part.title,arc_title:part.arc_title,content_md:part.content_md,confidence:part.episode_number!==null?'tinggi' as const:'sedang' as const,include:true,origin:name}));
  return {name,format,title:detectedTitle||name.replace(/\.(md|txt)$/i,'').replace(/[_-]+/g,' ').trim(),creator:'',language:'id',chapters,warnings:[]};
}
export function validateImport(chapters:ImportChapter[], existing: {episode_number:number;content_md:string}[]): string[] {
  const errors:string[]=[];
  const chosen=chapters.filter(c=>c.include);
  if(!chosen.length) errors.push('Pilih sedikitnya satu episode untuk diimpor.');
  if(chosen.length>MAX_IMPORT_EPISODES) errors.push(`Maksimal ${MAX_IMPORT_EPISODES} episode per impor.`);
  const existingNumbers=new Set(existing.map(e=>e.episode_number));
  const existingContent=new Set(existing.map(e=>normalizeContent(e.content_md)).filter(Boolean));
  const numbers=new Set<number>();
  const bodies=new Set<string>();
  for(const chapter of chosen){
    if(!chapter.title.trim()) errors.push('Ada episode tanpa judul.');
    if(!chapter.content_md.trim()) errors.push(`Naskah “${chapter.title}” kosong.`);
    if(chapter.content_md.length > 1_000_000) errors.push(`Episode “${chapter.title}” melebihi 1 juta karakter.`);
    if(chapter.episode_number!==null){
      if(!Number.isInteger(chapter.episode_number)||chapter.episode_number<1||chapter.episode_number>9999) errors.push(`Nomor episode “${chapter.title}” tidak valid.`);
      if(numbers.has(chapter.episode_number))errors.push(`Nomor episode ${chapter.episode_number} berulang dalam impor.`);
      if(existingNumbers.has(chapter.episode_number))errors.push(`Episode ${chapter.episode_number} sudah ada di novel. Nomor lama tidak akan ditimpa.`);
      numbers.add(chapter.episode_number);
    }
    const normalized=normalizeContent(chapter.content_md);
    if(normalized && (bodies.has(normalized)||existingContent.has(normalized)))errors.push(`Isi “${chapter.title}” terduplikasi.`);
    bodies.add(normalized);
  }
  return [...new Set(errors)];
}
export function assignEpisodeNumbers(chapters:ImportChapter[], existing:{episode_number:number}[]):ImportChapter[] {
  const used=new Set(existing.map(e=>e.episode_number));
  chapters.forEach(c=>{if(c.include&&c.episode_number!==null)used.add(c.episode_number);});
  let next=1;
  return chapters.map(c=>{if(!c.include||c.episode_number!==null)return c;while(used.has(next))next++;const assigned=next++;used.add(assigned);return {...c,episode_number:assigned};});
}
export function changeOrder(chapters:ImportChapter[], index:number,delta:number):ImportChapter[]{
  const target=index+delta;if(target<0||target>=chapters.length)return chapters;
  const next=chapters.slice();[next[index],next[target]]=[next[target],next[index]];return next;
}
export function mergeAdjacent(chapters:ImportChapter[], index:number):ImportChapter[] {
  if(index<0||index>=chapters.length-1)return chapters;
  const a=chapters[index],b=chapters[index+1];
  return [...chapters.slice(0,index),{...a,content_md:`${a.content_md.trim()}\n\n${b.content_md.trim()}`.trim(),confidence:'periksa' as const},...chapters.slice(index+2)];
}
export function splitChapter(chapters:ImportChapter[], index:number,offset:number):ImportChapter[]{
  const chapter=chapters[index];if(!chapter||offset<10||offset>chapter.content_md.length-10)return chapters;
  const before=chapter.content_md.slice(0,offset).trim(),after=chapter.content_md.slice(offset).trim();
  if(!before||!after)return chapters;
  return [...chapters.slice(0,index),{...chapter,content_md:before,confidence:'periksa' as const},
    {...chapter,key:`${chapter.key}-split-${Date.now()}`,episode_number:null,title:`${chapter.title} (lanjutan)`,content_md:after,confidence:'periksa' as const},...chapters.slice(index+1)];
}
