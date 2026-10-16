/** Pure import helpers. Never publish directly from file parsing. */
import {parseMarkdownUpload} from './importMarkdown';
import {titleInfo} from './importStructure';
export {titleInfo} from './importStructure';

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
  reason?: string;
  reviewed?: boolean;
  candidate_kind?: 'episode'|'frontmatter'|'arc'|'ignored'|'review'|'unsupported';
  section_type?: 'frontmatter' | 'arc';
};
export type ImportCover={data:Blob;mime:string;name:string;origin:string;reason:string;score:number;width:number;height:number};
export type ParsedManuscript = {
  name: string;
  format: 'epub' | 'md' | 'txt' | 'zip';
  title: string;
  creator: string;
  language: string;
  chapters: ImportChapter[];
  warnings: string[];
  cover?: {data: Blob; mime: string};
  covers?:ImportCover[];
};

export const MAX_IMPORT_EPISODES = 120;
/** EPUB often carries navigation, legal notices, and author pages in its spine.
 * Excluded by default, but kept in the review screen so the author may opt in.
 * Prologue/Epilogue are narrative chapters; don't discard them automatically.
 */
export function classifyEpubSection(title:string,source=''): 'frontmatter'|'arc'|'episode' {
  const name=cleanText(title).replace(/[.:—–\-]+$/,'').replace(/\s+/g,' ').toLowerCase();
  const path=source.replace(/^.*\//,'').replace(/\.(?:xhtml|html|htm|md|txt)$/i,'').replace(/[_\-]+/g,' ').trim().toLowerCase();
  if (/^(?:arc|bagian|part|jilid|volume)\s+[ivxlcdm\d]+\b/i.test(name)) return 'arc';
  if (/^(?:episode|bab|chapter|chap\.?|prolog|prologue|epilog|epilogue|interlude|interlud)\b/i.test(name)) return 'episode';
  const nonStory=/^(?:daftar isi|table of contents|contents|toc|copyright|hak cipta|halaman hak cipta|tentang penulis|about the author|about author|front matter|frontmatter|half title|halftitlepage|cover|sampul|cover page|title page|halaman judul|acknowledg(?:e)?ments?|ucapan terima kasih|dedication|dedikasi|persembahan|prakata|kata pengantar|pengantar|preface|foreword|penerbit|publisher|isbn|kolofon|colophon|bibliografi|bibliography|index|indeks|daftar gambar|daftar tabel|legal notices?|legal|imprint|disclaimer|catatan penerbit|credits?|kredit)(?:\s*[:—–-]\s*.*)?$/i;
  if(nonStory.test(name)) return 'frontmatter';
  if(nonStory.test(path)) return 'frontmatter';
  return 'episode';
}

export function cleanText(value: string): string {
  return value.normalize('NFC').replace(/[\u200b\ufeff]/g, '').trim();
}
export function normalizeContent(value: string): string {
  return cleanText(value).replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n');
}
export function parsePlainManuscript(text:string,name:string):ParsedManuscript {
  if(text.length > 8_000_000) throw Error('Naskah teks maksimal 8 MB per file.');
  const format: 'md'|'txt' = /\.txt$/i.test(name)?'txt':'md';
  const transformed=text;
  const firstHeading=transformed.match(/^#\s+([^\n]+)$/m)?.[1]?.trim();
  const detectedTitle=firstHeading && titleInfo(firstHeading).kind==='other'?firstHeading:null;
  const parsed=parseMarkdownUpload(transformed,name);
  const chapters:ImportChapter[]=parsed.map((part,i)=>{
    const type=classifyEpubSection(part.title,name);
    const note=/^(?:readme|outline|laporan|audit|sinopsis|daftar tokoh|catatan revisi|rencana)(?:\b|[_ -])/i.test(part.title)||/(?:^|\/)(?:docs|reports|audit)\//i.test(name);
    const reason=part.review_reason||(note?'Dokumen kerja; dikeluarkan dari impor sampai ditinjau.':type==='episode'?'Judul dan struktur kandidat episode.':'Materi tambahan, bukan episode bernomor.');
    return {...part,key:`${format}-${i}`,confidence:part.review_reason||note?'periksa':part.episode_number!==null?'tinggi':'sedang',include:!note,origin:name,reason,reviewed:false,candidate_kind:note?'ignored':part.review_reason?'review':type,...(type!=='episode'?{section_type:type,episode_number:null}:{} )};
  });
  return {name,format,title:detectedTitle||name.replace(/\.(md|txt)$/i,'').replace(/[_-]+/g,' ').trim(),creator:'',language:'id',chapters,warnings:[]};
}
export function validateImport(chapters:ImportChapter[], existing: {episode_number:number;content_md:string}[]): string[] {
  const errors:string[]=[];
  const chosen=chapters.filter(c=>c.include);
  if(chosen.some(c=>c.confidence==='periksa'&&!c.reviewed))errors.push('Periksa dan konfirmasi bagian yang belum pasti.');
  if(!chosen.length) errors.push('Pilih sedikitnya satu episode untuk diimpor.');
  if(chosen.length>MAX_IMPORT_EPISODES) errors.push(`Maksimal ${MAX_IMPORT_EPISODES} episode per impor.`);
  const existingNumbers=new Set(existing.map(e=>e.episode_number));
  const existingContent=new Set(existing.map(e=>normalizeContent(e.content_md)).filter(Boolean));
  const numbers=new Set<number>();
  const bodies=new Set<string>();
  for(const chapter of chosen){
    if(!chapter.title.trim()) errors.push('Ada episode tanpa judul.');
    if(chapter.title.trim().length>180||chapter.arc_title.length>180)errors.push('Judul atau arc maksimal 180 karakter.');
    if(!chapter.content_md.trim()) errors.push(`Naskah “${chapter.title}” kosong.`);
    if(chapter.content_md.length > 1_000_000) errors.push(`Episode “${chapter.title}” melebihi 1 juta karakter.`);
    if(chapter.episode_number!==null){
      if(!Number.isInteger(chapter.episode_number)||chapter.episode_number<0||chapter.episode_number>9999) errors.push(`Nomor episode “${chapter.title}” tidak valid.`);
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
export function assignEpisodeNumbers(chapters:ImportChapter[], existing:{episode_number:number}[],mode:'continue'|'start'|'gaps'='continue',start=1):ImportChapter[] {
  const used=new Set(existing.map(e=>e.episode_number));
  chapters.forEach(c=>{if(c.include&&c.episode_number!==null)used.add(c.episode_number);});
  let next=mode==='gaps'?1:mode==='start'?Math.max(0,Math.floor(start)):Math.max(0,...existing.map(e=>e.episode_number))+1;
  return chapters.map(c=>{if(!c.include||c.episode_number!==null)return c;while(used.has(next))next++;const assigned=next++;used.add(assigned);return {...c,episode_number:assigned};});
}
export function changeOrder(chapters:ImportChapter[], index:number,delta:number):ImportChapter[]{
  const target=index+delta;if(target<0||target>=chapters.length)return chapters;
  const next=chapters.slice();[next[index],next[target]]=[next[target],next[index]];return next;
}
export function mergeAdjacent(chapters:ImportChapter[], index:number):ImportChapter[] {
  if(index<0||index>=chapters.length-1)return chapters;
  const a=chapters[index],b=chapters[index+1];
  return [...chapters.slice(0,index),{...a,content_md:`${a.content_md.trim()}\n\n${b.content_md.trim()}`.trim(),confidence:'periksa' as const,reviewed:false},...chapters.slice(index+2)];
}
export function splitChapter(chapters:ImportChapter[], index:number,offset:number):ImportChapter[]{
  const chapter=chapters[index];if(!chapter||offset<10||offset>chapter.content_md.length-10)return chapters;
  const before=chapter.content_md.slice(0,offset).trim(),after=chapter.content_md.slice(offset).trim();
  if(!before||!after)return chapters;
  return [...chapters.slice(0,index),{...chapter,content_md:before,confidence:'periksa' as const,reviewed:false},
    {...chapter,key:`${chapter.key}-split-${Date.now()}`,episode_number:null,title:`${chapter.title} (lanjutan)`,content_md:after,confidence:'periksa' as const,reviewed:false},...chapters.slice(index+1)];
}
