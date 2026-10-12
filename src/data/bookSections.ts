import {supabase} from './supabase';
export type BookSection={id:string;book_id:string;position:number;section_type:'frontmatter'|'arc';title:string;content_md:string;created_at:string;updated_at:string};
export async function loadBookSections(bookId:string):Promise<BookSection[]>{
 if(!supabase)throw Error('Supabase belum dikonfigurasi.');
 const {data,error}=await supabase.from('qr_book_sections').select('*').eq('book_id',bookId).is('deleted_at',null).order('position');
 if(error)throw error;
 return (data??[]) as BookSection[];
}
export async function saveBookSection(section:Partial<BookSection>&{book_id:string,title:string,content_md:string,section_type:'frontmatter'|'arc'}){
 if(!supabase)throw Error('Supabase belum dikonfigurasi.');
 if(!section.title.trim()||!section.content_md.trim())throw Error('Judul dan isi halaman harus diisi.');
 if(section.id){
  const {error}=await supabase.from('qr_book_sections').update({title:section.title.trim(),content_md:section.content_md,section_type:section.section_type}).eq('id',section.id);
  if(error)throw error;
 }else{
  const {data:last,error:positionError}=await supabase.from('qr_book_sections').select('position').eq('book_id',section.book_id).order('position',{ascending:false}).limit(1);
  if(positionError)throw positionError;
  const position=(last?.[0]?.position??0)+1;
  const {error}=await supabase.from('qr_book_sections').insert({book_id:section.book_id,position,title:section.title.trim(),content_md:section.content_md,section_type:section.section_type});
  if(error)throw error;
 }
}
