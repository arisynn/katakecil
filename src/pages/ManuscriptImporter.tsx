import React,{useEffect,useMemo,useRef,useState} from 'react';
import {ArrowDown,ArrowLeft,ArrowRight,ArrowUp,BookOpen,Check,CheckCircle2,ChevronDown,ChevronUp,FileText,FileUp,Layers3,Library,Merge,Scissors,ShieldCheck,UploadCloud,TriangleAlert,X} from 'lucide-react';
import type {Book,Episode} from '../data/library';
import {slugify} from '../data/library';
import {supabase} from '../data/supabase';
import {navigate} from '../utils/nav';
import {parseEpubFile} from '../utils/importEpub';
import {assignEpisodeNumbers,changeOrder,mergeAdjacent,parsePlainManuscript,splitChapter,validateImport,type ImportChapter,type ParsedManuscript} from '../utils/importManuscript';

const errorText=(e:unknown)=>e instanceof Error?e.message:String(e);
type Props={books:Book[];episodes:Episode[];onChanged:()=>Promise<void>};
const ACCEPT='.epub,.md,.txt,application/epub+zip,text/plain,text/markdown';
const MAX_FILE=18_000_000;
const safeId=(value:string)=>slugify(value)||'cerita-baru';

export default function ManuscriptImporter({books,episodes,onChanged}:Props){
 const [reading,setReading]=useState(false);
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 const [parsed,setParsed]=useState<ParsedManuscript|null>(null);
 const [chapters,setChapters]=useState<ImportChapter[]>([]);
 const initialBook = new URLSearchParams(window.location.search).get('book')||'';
 const [destination,setDestination]=useState(books.some(b=>b.id===initialBook)?initialBook:'new');
 const [bookTitle,setBookTitle]=useState('');
 const [bookGenre,setBookGenre]=useState('Fiksi');
 const [useCover,setUseCover]=useState(false);
 const [expanded,setExpanded]=useState<string|null>(null);
 const [splitAt,setSplitAt]=useState<number>(0);
 const [step,setStep]=useState<'upload'|'review'>('upload');
 const textareaRef=useRef<HTMLTextAreaElement|null>(null);
 const coverURL=useMemo(()=>parsed?.cover?URL.createObjectURL(parsed.cover.data):'', [parsed?.cover]);
 useEffect(()=>()=>{if(coverURL)URL.revokeObjectURL(coverURL);},[coverURL]);
 const currentEpisodes=episodes.filter(e=>e.book_id===destination);
 const occupiedNumbers=useMemo(()=>destination==='new'?[]:currentEpisodes, [destination,episodes]);
 const warnings=useMemo(()=>validateImport(chapters,occupiedNumbers),[chapters,occupiedNumbers]);
 const selected=chapters.filter(c=>c.include);
 const dirty=chapters.some(c=>c.confidence==='periksa'&&c.include);
 const importFile=async(file?:File)=>{
  if(!file)return;setError('');setSuccess('');setParsed(null);setStep('upload');setChapters([]);setReading(true);
  try{
   if(file.size>MAX_FILE)throw Error('Maksimal 18 MB untuk EPUB; 8 MB untuk Markdown/TXT.');
   const kind=file.name.toLowerCase();
   let result:ParsedManuscript;
   if(kind.endsWith('.epub'))result=await parseEpubFile(file);
   else if(/\.(md|txt)$/.test(kind))result=parsePlainManuscript(await file.text(),file.name);
   else throw Error('Format yang didukung: .epub, .md, atau .txt.');
   if(!result.chapters.length)throw Error('Tidak ditemukan episode untuk diimpor.');
   setParsed(result);setChapters(result.chapters);setBookTitle(result.title);setStep('review');
  }catch(e){setError(errorText(e));}finally{setReading(false);}
 };
 const update=(i:number,changes:Partial<ImportChapter>)=>setChapters(prev=>prev.map((x,index)=>index===i?{...x,...changes}:x));
 const autoNumber=()=>setChapters(prev=>assignEpisodeNumbers(prev,occupiedNumbers));
 const split=(i:number)=>{setChapters(prev=>splitChapter(prev,i,splitAt));setExpanded(null);setSplitAt(0);};
 const open=(chapter:ImportChapter)=>{setExpanded(prev=>prev===chapter.key?null:chapter.key);setSplitAt(0);};
 const persist=async()=>{
  if(!supabase||!parsed)return;
  setError('');setSuccess('');
  const chosen=chapters.filter(c=>c.include);
  const conflicts=validateImport(chapters,occupiedNumbers);
  if(conflicts.length){setError(conflicts.join(' '));return;}
  if(chosen.some(c=>c.episode_number===null)){setError('Tetapkan nomor episode terlebih dahulu dengan tombol Isi nomor otomatis atau isi manual.');return;}
  if(destination==='new'&&!bookTitle.trim()){setError('Judul novel baru wajib diisi.');return;}
  const title=destination==='new'?bookTitle:books.find(b=>b.id===destination)?.title;
  if(!window.confirm(`Simpan ${chosen.length} episode ke “${title}” sebagai DRAFT?\n\nTidak ada episode yang diterbitkan dan jadwal lama tidak akan diubah.`))return;
  setSaving(true);
  let bookId=destination;
  let bookCreated=false;
  let coverWarning='';
  try{
   if(destination==='new'){
    bookId=safeId(bookTitle);
    if(books.some(b=>b.id===bookId||b.slug===bookId))throw Error('Judul/slug novel sudah digunakan. Pilih novel yang ada atau ubah judul.');
    const {error:bookError}=await supabase.from('qr_books').insert({id:bookId,slug:bookId,title:bookTitle.trim(),synopsis:'',genre:bookGenre.trim()||'Fiksi',cover_url:null,status:'ongoing',is_published:false,is_featured:false});
    if(bookError)throw bookError;
    bookCreated=true;
    // The optional cover may fail (missing Storage policies, etc.) without losing manuscripts.
    if(parsed.cover&&useCover){
     try{
      const ext=parsed.cover.mime==='image/png'?'png':parsed.cover.mime==='image/webp'?'webp':'jpg';
      const fileName=`${bookId}/import-${Date.now()}.${ext}`;
      const {error:uploadError}=await supabase.storage.from('story-covers').upload(fileName,parsed.cover.data,{contentType:parsed.cover.mime,upsert:false});
      if(uploadError)throw uploadError;
      const cover_url=supabase.storage.from('story-covers').getPublicUrl(fileName).data.publicUrl;
      const {error:coverError}=await supabase.from('qr_books').update({cover_url}).eq('id',bookId);
      if(coverError)throw coverError;
     }catch{coverWarning=' Sampul EPUB belum berhasil disimpan; unggah nanti melalui pengaturan novel.';}
    }
   }
   const payload=chosen.map(c=>({episode_number:c.episode_number,title:c.title.trim(),arc_title:c.arc_title.trim(),content_md:c.content_md.trim()}));
   const {data,error:dbError}=await supabase.rpc('qr_import_drafts',{p_book_id:bookId,p_source_name:parsed.name,p_format:parsed.format,p_title_detected:parsed.title,p_episodes:payload});
   if(dbError)throw new Error(`${dbError.message}. Pastikan migrasi database V4 telah dijalankan.`);
   let refreshWarning='';
   try{await onChanged();}catch{refreshWarning=' Data berhasil disimpan, tetapi daftar novel belum berhasil dimuat ulang. Segarkan halaman Studio.';}
   setSuccess(`${Number(data?.imported_count??chosen.length)} episode disimpan sebagai draft di novel “${title}”.${coverWarning}${refreshWarning}`);
   setChapters([]);setParsed(null);setStep('upload');
   setDestination(bookId);
  }catch(e){setError(`${errorText(e)}${bookCreated?' Novel baru sudah dibuat sebagai privat, tetapi impor gagal. Buka novel tersebut untuk mengulang impor.':''}`);}
  finally{setSaving(false);}
 };
 return <>
  <button className="studio-backlink" onClick={()=>navigate(destination==='new'?'/studio/cerita':`/studio/cerita/${destination}`)}><ArrowLeft size={16}/> Kembali ke karya</button>
  <div className="studio-page-head"><span className="studio-kicker">SMART MANUSCRIPT IMPORTER · V4</span><h1>Impor <i>naskahmu.</i></h1><p>EPUB, Markdown, atau TXT. Pembacaan berkas dilakukan di browser; tidak dikirim ke layanan AI.</p></div>
  <div className="v4-progress"><span className="active"><FileUp size={15}/> 1 · Unggah</span><ArrowRight size={16}/><span className={step==='review'?'active':''}><BookOpen size={15}/> 2 · Periksa</span><ArrowRight size={16}/><span><ShieldCheck size={15}/> 3 · Draft</span></div>
  {error&&<div className="studio-error" role="alert">{error}</div>}
  {success&&<div className="studio-success" role="status">{success} <button className="studio-light-button" onClick={()=>navigate(`/studio/cerita/${destination}`)}>Lihat novel <ArrowRight size={16}/></button></div>}
  <section className="studio-panel v4-upload-panel">
   <label className="v4-dropzone"><UploadCloud size={32}/><strong>{reading?'Menganalisis berkas…':parsed?'Ganti berkas':'Pilih EPUB, MD, atau TXT dari HP'}</strong><small>Maksimum EPUB 18 MB. Berkas diproses di browser. Draft tetap privat setelah disimpan.</small>
    <input type="file" accept={ACCEPT} disabled={reading||saving} onChange={e=>{void importFile(e.target.files?.[0]);e.currentTarget.value='';}}/></label>
  </section>
  {parsed&&step==='review'&&<>
   <section className="studio-panel v4-metadata">
    <div className="studio-panel-top"><h2>Hasil pembacaan</h2><span className="v3-counter">{parsed.format.toUpperCase()}</span></div>
    <div className="v4-metadata-grid">{coverURL&&<img src={coverURL} alt="Sampul EPUB" className="v4-cover"/>}<div><strong>{parsed.title}</strong><small>{parsed.creator||'Penulis tidak tercantum'} · {parsed.language||'Bahasa tidak tercantum'}</small><p>{chapters.length} bagian terdeteksi · {selected.length} dipilih untuk impor · {chapters.filter(c=>c.confidence==='periksa').length} perlu perhatian</p></div></div>
    {parsed.warnings.map((w,i)=><div className="v4-warning" key={i}><TriangleAlert size={16}/>{w}</div>)}
   </section>
   <section className="studio-panel v4-target"><div className="studio-panel-top"><h2>Tujuan penyimpanan</h2><Library size={19}/></div>
    <label className="studio-label">Simpan ke novel<select value={destination} onChange={e=>setDestination(e.target.value)}><option value="new">+ Novel baru (privat)</option>{books.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
    {destination==='new'&&<div className="v4-target-fields"><label className="studio-label">Judul novel hasil deteksi<input maxLength={180} value={bookTitle} onChange={e=>setBookTitle(e.target.value)}/></label><label className="studio-label">Genre<input maxLength={70} value={bookGenre} onChange={e=>setBookGenre(e.target.value)}/></label><p className="studio-muted">Novel baru dibuat privat. Sinopsis bisa diisi kemudian.</p>{parsed.cover&&<label className="studio-check"><input type="checkbox" checked={useCover} onChange={e=>setUseCover(e.target.checked)}/><span><strong>Gunakan sampul EPUB</strong><small>Perhatian: sampul akan disimpan di bucket Storage publik, walaupun novel masih privat.</small></span></label>}</div>}
    {destination!=='new'&&<p className="studio-muted">Ditemukan {currentEpisodes.length} episode lama. Nomor dan isi duplikat akan ditolak; seluruh jadwal yang sudah ada tetap utuh.</p>}
   </section>
   <section className="studio-panel v4-review"><div className="studio-panel-top"><h2>Periksa episode</h2><span className="v3-counter">{selected.length} dipilih</span></div>
    <p className="studio-muted">Judul dan nomor dari EPUB adalah perkiraan bila daftar isi tidak lengkap. Kamu bisa mengedit semuanya sebelum menyimpan.</p>
    <div className="v4-actions"><button type="button" className="studio-light-button" onClick={autoNumber}><CheckCircle2 size={16}/> Isi nomor kosong otomatis</button><button type="button" className="studio-light-button" onClick={()=>setChapters(prev=>prev.map(c=>({...c,include:true})))}>Pilih semua</button></div>
    <div className="v4-chapter-stack">{chapters.map((chapter,i)=><div className={`v4-chapter ${!chapter.include?'v4-excluded':''}`} key={chapter.key}>
      <div className="v4-chapter-line"><label className="v4-checkbox"><input type="checkbox" aria-label={`Impor ${chapter.title}`} checked={chapter.include} onChange={e=>update(i,{include:e.target.checked})}/></label>
       <span className="v4-chapter-number">{chapter.episode_number??'—'}</span>
       <button type="button" className="v4-chapter-name" onClick={()=>open(chapter)}><strong>{chapter.title}</strong><small>{chapter.arc_title||'Tanpa arc'} · {chapter.content_md.trim().split(/\s+/).filter(Boolean).length} kata · {chapter.confidence==='periksa'?'Perlu dicek':`Deteksi ${chapter.confidence}`}</small></button>
       <button type="button" className="v4-icon-btn" aria-label={expanded===chapter.key?'Tutup':'Edit episode'} onClick={()=>open(chapter)}>{expanded===chapter.key?<ChevronUp size={19}/>:<ChevronDown size={19}/>}</button>
      </div>
      {expanded===chapter.key&&<div className="v4-chapter-edit"><div className="v4-chapter-fields"><label className="studio-label">Nomor episode<input type="number" min="1" max="9999" value={chapter.episode_number??''} onChange={e=>update(i,{episode_number:e.target.value===''?null:Number(e.target.value),confidence:'tinggi'})}/></label><label className="studio-label">Judul<input value={chapter.title} maxLength={180} onChange={e=>update(i,{title:e.target.value,confidence:'tinggi'})}/></label></div>
       <label className="studio-label">Arc / bagian<input value={chapter.arc_title} maxLength={180} onChange={e=>update(i,{arc_title:e.target.value})}/></label>
       <label className="studio-label">Isi Markdown<textarea ref={textareaRef} className="v4-manuscript" value={chapter.content_md} onClick={e=>setSplitAt(e.currentTarget.selectionStart)} onKeyUp={e=>setSplitAt(e.currentTarget.selectionStart)} onSelect={e=>setSplitAt(e.currentTarget.selectionStart)} onChange={e=>{update(i,{content_md:e.target.value});setSplitAt(e.currentTarget.selectionStart);}}/></label>
       <div className="v4-edit-actions"><button className="studio-light-button" title="Naik satu posisi" disabled={i===0} onClick={()=>setChapters(x=>changeOrder(x,i,-1))}><ArrowUp size={16}/> Naik</button><button className="studio-light-button" disabled={i===chapters.length-1} onClick={()=>setChapters(x=>changeOrder(x,i,1))}><ArrowDown size={16}/> Turun</button><button className="studio-light-button" disabled={i===chapters.length-1} onClick={()=>{if(window.confirm('Gabungkan isi episode ini dengan bagian berikutnya?')){setChapters(x=>mergeAdjacent(x,i));setExpanded(null)}}}><Layers3 size={16}/> Gabung berikutnya</button><button className="studio-light-button" disabled={splitAt<10||splitAt>chapter.content_md.length-10} onClick={()=>split(i)}><Scissors size={16}/> Pisah di kursor</button></div>
       <small className="studio-muted">Untuk memisah episode, letakkan kursor di dalam naskah lalu pilih “Pisah di kursor”. Konten tidak diubah oleh AI.</small>
      </div>}
     </div>)}</div>
   </section>
   <section className="studio-panel v4-confirm"><div className="studio-panel-top"><h2>Simpan sebagai draft</h2><ShieldCheck size={20}/></div>
    {warnings.length>0&&<div className="v4-error-list">{warnings.slice(0,12).map((w,i)=><p key={i}><TriangleAlert size={14}/>{w}</p>)}</div>}
    {chapters.some(c=>c.include&&c.episode_number===null)&&<div className="v4-warning"><TriangleAlert size={15}/> Masih ada nomor episode kosong. Klik “Isi nomor kosong otomatis” sebelum menyimpan.</div>}
    {dirty&&<div className="v4-warning"><TriangleAlert size={15}/> Ada bagian dengan deteksi tidak pasti. Periksa atau keluarkan dari impor sebelum lanjut.</div>}
    <p className="studio-muted">Hanya episode yang dicentang yang akan disimpan. Semua disimpan dengan <strong>is_enabled=false</strong> dan <strong>release_at=NULL</strong>. Tidak ada publikasi otomatis.</p>
    <button type="button" className="studio-primary v4-confirm-button" disabled={saving||warnings.length>0||!selected.length||selected.some(c=>c.episode_number===null)} onClick={()=>void persist()}>{saving?'Menyimpan…':`Konfirmasi dan impor ${selected.length} draft`} <ArrowRight size={18}/></button>
   </section>
  </>}
 </>;
}
