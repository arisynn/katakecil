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
// Database IDs must remain unique even if an older novel with the same title is in Trash.
// Keep the generated ID stable across retries for one file/title to avoid duplicate imports
// when the network response is lost after the transaction commits.
const newImportId=(title:string)=>{
 const base=safeId(title).slice(0,58).replace(/-+$/,'')||'cerita-baru';
 const suffix=crypto.randomUUID().replace(/-/g,'').slice(0,12);
 return `${base}-${suffix}`;
};
const meaningfulFrontmatter=(title:string)=>/(?:kata pengantar|prakata|pengantar|preface|foreword|dedikasi|persembahan|ucapan terima kasih|acknowledgment|about the author|tentang penulis|catatan penulis)/i.test(title);

export default function ManuscriptImporter({books,episodes,onChanged}:Props){
 const [reading,setReading]=useState(false);
 const [pickedName,setPickedName]=useState('');
 const lastFileRef=useRef<File|null>(null);
 const pendingNewId=useRef<{title:string;id:string}|null>(null);
 const [pickerOpen,setPickerOpen]=useState(false);
 const [pickerStatus,setPickerStatus]=useState('');
 const [saving,setSaving]=useState(false);
 const [error,setError]=useState('');
 const [success,setSuccess]=useState('');
 const [readPhase,setReadPhase]=useState('');
 const [importReport,setImportReport]=useState<{cover:boolean;parts:number;episodes:number;pages:number;saved:boolean}|null>(null);
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
 const warnings=useMemo(()=>{const eps=chapters.filter(c=>!c.section_type);return eps.some(c=>c.include)?validateImport(eps,occupiedNumbers):[];},[chapters,occupiedNumbers]);
 const selected=chapters.filter(c=>c.include&&!c.section_type);
 const chosenSections=chapters.filter(c=>c.include&&Boolean(c.section_type));
 const dirty=chapters.some(c=>c.confidence==='periksa'&&c.include);
 const importFile=async(file?:File)=>{
  if(!file)return;
  pendingNewId.current=null;
  setPickerOpen(false);setPickerStatus('Berkas diterima, menyiapkan analisis…');
  setPickedName(file.name||'Berkas tanpa nama');
  setError('');setSuccess('');setParsed(null);setImportReport(null);setStep('upload');setChapters([]);setReading(true);setReadPhase('Membaca berkas…');
  try{
   if(file.size>MAX_FILE)throw Error('Ukuran EPUB maksimal 18 MB.');
   if(!file.name.toLowerCase().endsWith('.epub')&&file.size>8_000_000)throw Error('Markdown/TXT maksimal 8 MB.');
   const kind=file.name.toLowerCase();
   const mime=file.type.toLowerCase();
   let result:ParsedManuscript;
   if(kind.endsWith('.epub')||mime==='application/epub+zip'){setReadPhase('Membaca EPUB dan mencari struktur episode…');result=await parseEpubFile(file);}
   else if(/\.(md|txt)$/.test(kind)||mime==='text/markdown'||mime==='text/plain'){setReadPhase('Mengenali pembagian episode…');result=parsePlainManuscript(await file.text(),file.name);}
   else throw Error('Format yang didukung: .epub, .md, atau .txt.');
   if(!result.chapters.length)throw Error('Tidak ditemukan bagian yang bisa disimpan.');
   result.chapters=result.chapters.map(c=>c.section_type?{...c,include:c.section_type==='frontmatter'&&meaningfulFrontmatter(c.title),episode_number:null}:c);
   setImportReport({cover:Boolean(result.cover),parts:result.chapters.length,episodes:result.chapters.filter(c=>!c.section_type).length,pages:result.chapters.filter(c=>!!c.section_type).length,saved:false});setParsed(result);setChapters(result.chapters);setBookTitle(result.title);setStep('review');setPickerStatus('Analisis selesai, periksa episode dan halaman buku.');
  }catch(e){setError(errorText(e));setPickerStatus('Analisis gagal, baca pesan kesalahan di atas.');}finally{setReading(false);}
 };
 // A single change handler is more reliable than racing input/change handlers
 // on Android, especially if the same File object fires both events.
 const handleFileSelection=(event:React.ChangeEvent<HTMLInputElement>)=>{
  const input=event.currentTarget;
  const file=input.files?.item(0);
  setPickerOpen(false);
  if(!file){setPickerStatus('Tidak ada berkas baru. Coba pilih lagi.');return;}
  if(lastFileRef.current===file)return;
  lastFileRef.current=file;
  input.value='';
  void importFile(file);
 };
 useEffect(()=>{
  if(!pickerOpen)return;
  const resume=()=>{
   if(document.visibilityState!=='visible')return;
   // Give the Android content picker a moment to dispatch the change event.
   window.setTimeout(()=>setPickerOpen(open=>{
    if(open)setPickerStatus('Kembali dari pemilih berkas. Jika belum muncul nama berkas, tekan Pilih lagi.');
    return false;
   }),900);
  };
  window.addEventListener('pageshow',resume);
  window.addEventListener('focus',resume);
  document.addEventListener('visibilitychange',resume);
  return()=>{window.removeEventListener('pageshow',resume);window.removeEventListener('focus',resume);document.removeEventListener('visibilitychange',resume);};
 },[pickerOpen]);
 const update=(i:number,changes:Partial<ImportChapter>)=>setChapters(prev=>prev.map((x,index)=>index===i?{...x,...changes}:x));
 const autoNumber=()=>setChapters(prev=>{const eps=assignEpisodeNumbers(prev.filter(c=>!c.section_type),occupiedNumbers);let j=0;return prev.map(c=>c.section_type?c:eps[j++]);});
 const split=(i:number)=>{setChapters(prev=>splitChapter(prev,i,splitAt));setExpanded(null);setSplitAt(0);};
 const open=(chapter:ImportChapter)=>{setExpanded(prev=>prev===chapter.key?null:chapter.key);setSplitAt(0);};
 const [saveStage,setSaveStage]=useState('');
 const persist=async()=>{
  if(!supabase||!parsed)return;
  setError('');setSuccess('');
  const chosen=chapters.filter(c=>c.include&&!c.section_type);
  const sections=chapters.filter(c=>c.include&&c.section_type);
  const conflicts=chosen.length?validateImport(chosen,occupiedNumbers):[];
  if(conflicts.length){setError(conflicts.join(' '));return;}
  if(chosen.some(c=>c.episode_number===null)){setError('Tetapkan nomor episode terlebih dahulu.');return;}
  if(!chosen.length&&!sections.length){setError('Pilih sedikitnya satu episode atau halaman buku.');return;}
  if(destination==='new'&&!bookTitle.trim()){setError('Judul novel baru wajib diisi.');return;}
  const title=destination==='new'?bookTitle:books.find(b=>b.id===destination)?.title;
  if(!window.confirm(`Simpan ${chosen.length} episode dan ${sections.length} halaman buku ke “${title}”?\n\nEpisode baru tetap DRAFT, tanpa mengubah jadwal yang sudah ada.`))return;
  setSaving(true);setSaveStage('Memvalidasi tujuan penyimpanan…');
  try{
   // Title is not an identifier: a soft-deleted novel still reserves its primary key.
   // Reuse this ID on retry, but generate a fresh ID for another manuscript/title.
   if(destination==='new'&&(!pendingNewId.current||pendingNewId.current.title!==bookTitle.trim()))
    pendingNewId.current={title:bookTitle.trim(),id:newImportId(bookTitle)};
   let bookId=destination==='new'?pendingNewId.current!.id:destination;
   const {data:sectionsOld,error:sectionsError}=destination==='new'?{data:[],error:null}:await supabase.from('qr_book_sections').select('position').eq('book_id',bookId).order('position',{ascending:false}).limit(1);
   if(sectionsError)throw sectionsError;
   const maxPosition=sectionsOld?.[0]?.position??0;
   const payload=chosen.map(c=>({episode_number:c.episode_number,title:c.title.trim(),arc_title:c.arc_title.trim(),content_md:c.content_md.trim()}));
   const pages=sections.map((c,i)=>({position:maxPosition+i+1,section_type:c.section_type,title:c.title.trim(),content_md:c.content_md.trim()}));
   setSaveStage('Menyimpan novel, halaman, dan episode dalam satu transaksi…');
   const rpcImport=(candidateId:string)=>supabase!.rpc('qr_import_manuscript_v5',{
    p_book_id:candidateId,p_new_title:destination==='new'?bookTitle.trim():'',p_new_genre:bookGenre.trim()||'Fiksi',
    p_source_name:parsed.name,p_format:parsed.format,p_title_detected:parsed.title,p_episodes:payload,p_sections:pages,
   });
   let {data,error:dbError}=await rpcImport(bookId);
   // A soft-deleted book reserves its ID. On the specific book-PK conflict,
   // retry twice with a new random ID; do not retry ambiguous network errors.
   for(let retry=0;destination==='new'&&retry<2&&dbError?.code==='23505'&&/qr_books_pkey/.test(dbError.message||'');retry++){
    bookId=newImportId(bookTitle);
    pendingNewId.current={title:bookTitle.trim(),id:bookId};
    setSaveStage('ID karya sudah dipakai. Membuat identitas baru dengan aman…');
    ({data,error:dbError}=await rpcImport(bookId));
   }
   if(dbError){
    if(dbError.code==='23505')throw Error('Identitas novel atau nomor episode sudah digunakan. Data lama tetap aman. Periksa Studio sebelum mengulangi impor.');
    if(dbError.code==='PGRST202'||dbError.code==='42883')throw Error('Fungsi impor V5 belum tersedia di database. Periksa migrasi Supabase.');
    throw new Error(dbError.message);
   }
   // Never announce full success solely from the RPC result; check recorded metadata.
   setSaveStage('Memeriksa bahwa isi benar-benar tersimpan…');
   const {data:batch,error:batchError}=await supabase.from('qr_import_batches')
     .select('book_id,imported_count,sections_count').eq('id',String(data?.batch_id||'')).single();
   if(batchError||!batch||batch.book_id!==bookId||Number(batch.imported_count)!==payload.length||Number(batch.sections_count)!==pages.length)
    throw Error('Database menerima impor, tetapi hasil verifikasi riwayat belum sesuai. Jangan impor ulang sebelum memeriksa Studio.');
   let coverWarning='';
   if(destination==='new'&&parsed.cover&&useCover){
    setSaveStage('Mengunggah sampul buku…');
    try{
     const ext=parsed.cover.mime==='image/png'?'png':parsed.cover.mime==='image/webp'?'webp':'jpg';
     const fileName=`${bookId}/import-${Date.now()}.${ext}`;
     const {error:uploadError}=await supabase.storage.from('story-covers').upload(fileName,parsed.cover.data,{contentType:parsed.cover.mime,upsert:false});
     if(uploadError)throw uploadError;
     const cover_url=supabase.storage.from('story-covers').getPublicUrl(fileName).data.publicUrl;
     const {error:coverError}=await supabase.from('qr_books').update({cover_url}).eq('id',bookId);
     if(coverError)throw coverError;
    }catch{coverWarning=' Sampul belum berhasil diunggah; naskah tetap aman. Tambahkan dari pengaturan novel.';}
   }
   setSaveStage('Memuat ulang Studio…');
   let refreshWarning='';
   try{await onChanged();}catch{refreshWarning=' Muat ulang halaman Studio untuk melihat hasilnya.';}
   setImportReport({cover:Boolean(parsed.cover),parts:chapters.length,episodes:payload.length,pages:pages.length,saved:true});
   setSuccess(`Impor berhasil: ${payload.length} episode draft + ${pages.length} halaman buku tersimpan di “${title}”.${coverWarning}${refreshWarning}`);
   pendingNewId.current=null;
   setChapters([]);setParsed(null);setStep('upload');setPickedName('');setDestination(bookId);
  }catch(e){setError(errorText(e));}
  finally{setSaving(false);setSaveStage('');}
 };
 return <>
  <button className="studio-backlink" onClick={()=>navigate(destination==='new'?'/studio/cerita':`/studio/cerita/${destination}`)}><ArrowLeft size={16}/> Kembali ke karya</button>
  <div className="studio-page-head"><span className="studio-kicker">SMART MANUSCRIPT IMPORTER · V5</span><h1>Impor <i>naskahmu.</i></h1><p>EPUB, Markdown, atau TXT. Pembacaan berkas dilakukan di browser; tidak dikirim ke layanan AI.</p></div>
  <div className="v4-progress"><span className="active"><FileUp size={15}/> 1 · Unggah</span><ArrowRight size={16}/><span className={step==='review'?'active':''}><BookOpen size={15}/> 2 · Periksa</span><ArrowRight size={16}/><span><ShieldCheck size={15}/> 3 · Draft</span></div>
  {error&&<div className="studio-error" role="alert">{error}</div>}
  {saveStage&&<div className="v5-import-stage" role="status" aria-live="polite"><span className="v4-picker-spinner"/> {saveStage}</div>}
  {(reading||importReport)&&<section className="studio-panel kk-import-progress" aria-label="Tahapan pemrosesan impor" aria-live="polite">
    <div className="studio-panel-top"><h2>Progres impor</h2><BookOpen size={17}/></div>
    {reading&&<p className="studio-muted">{readPhase}</p>}
    {importReport&&<ul className="kk-import-checklist">
      <li><CheckCircle2 size={17}/>Berkas {parsed?.format.toUpperCase()||pickedName.split('.').pop()?.toUpperCase()||'naskah'} berhasil dibaca</li>
      <li><CheckCircle2 size={17}/>{importReport.cover?'Sampul ditemukan':'Tidak ada sampul terdeteksi — bisa ditambahkan nanti'}</li>
      <li><CheckCircle2 size={17}/>{importReport.parts} bagian ditemukan ({importReport.episodes} calon episode, {importReport.pages} halaman buku)</li>
      {importReport.saved&&<li><CheckCircle2 size={17}/>{importReport.episodes} episode draft berhasil dibuat</li>}
      {importReport.saved&&<li><CheckCircle2 size={17}/>Penyimpanan database berhasil diverifikasi</li>}
    </ul>}
  </section>}
  {success&&<div className="studio-success" role="status">{success} <button className="studio-light-button" onClick={()=>navigate(`/studio/cerita/${destination}`)}>Lihat novel <ArrowRight size={16}/></button></div>}
  <section className="studio-panel v4-upload-panel" aria-label="Unggah berkas naskah">
   <label className={`v4-dropzone${reading?' v4-upload-reading':''}`}>
    <UploadCloud size={32} aria-hidden="true"/>
    <strong>{reading?'Menganalisis naskah…':parsed?'Pilih berkas lain':'Pilih EPUB, MD, atau TXT dari HP'}</strong>
    <small>{reading?`Berkas diterima: ${pickedName}. Sedang membaca isi dan pembagian episode.`:'Maksimum 18 MB. Berkas dibaca di browser dan tidak otomatis diterbitkan.'}</small>
    <input type="file" name="manuscript" aria-label="Pilih berkas EPUB, MD, atau TXT" accept={ACCEPT} disabled={reading||saving} onClick={()=>{setPickerOpen(true);setPickerStatus('Menunggu berkas dari pemilih file Android…');}} onChange={handleFileSelection}/>
   </label>
   <div className="v4-picker-status" role="status" aria-live="polite">
    {reading?<><span className="v4-picker-spinner" aria-hidden="true"/> {readPhase} Berkas: {pickedName}.</>
      :parsed?<>✓ {pickedName} berhasil dibaca. Periksa hasilnya di bawah sebelum menyimpan.</>
      :error&&pickedName?<>Berkas {pickedName} belum berhasil diproses. Lihat pesan kesalahan di atas; kamu boleh memilihnya lagi.</>
      :success?<>Impor selesai. Kamu bisa memilih berkas berikutnya.</>
      :<>{pickerOpen?'Memilih berkas…':pickerStatus||'Setelah memilih berkas, nama file dan progres pembacaan akan muncul di sini.'}</>}
   </div>
  </section>
  {parsed&&step==='review'&&<>
   <section className="studio-panel v4-metadata">
    <div className="studio-panel-top"><h2>Hasil pembacaan</h2><span className="v3-counter">{parsed.format.toUpperCase()}</span></div>
    <div className="v4-metadata-grid">{coverURL&&<img src={coverURL} alt="Sampul EPUB" className="v4-cover"/>}<div><strong>{parsed.title}</strong><small>{parsed.creator||'Penulis tidak tercantum'} · {parsed.language||'Bahasa tidak tercantum'}</small><p>{chapters.length} bagian terdeteksi · {selected.length} episode dipilih · {chosenSections.length} halaman buku dipilih</p></div></div>
    {parsed.warnings.map((w,i)=><div className="v4-warning" key={i}><TriangleAlert size={16}/>{w}</div>)}
   </section>
   <section className="studio-panel v4-target"><div className="studio-panel-top"><h2>Tujuan penyimpanan</h2><Library size={19}/></div>
    <label className="studio-label">Simpan ke novel<select value={destination} onChange={e=>setDestination(e.target.value)}><option value="new">+ Novel baru (privat)</option>{books.map(b=><option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
    {destination==='new'&&<div className="v4-target-fields"><label className="studio-label">Judul novel hasil deteksi<input maxLength={180} value={bookTitle} onChange={e=>setBookTitle(e.target.value)}/></label><label className="studio-label">Genre<input maxLength={70} value={bookGenre} onChange={e=>setBookGenre(e.target.value)}/></label><p className="studio-muted">Novel baru dibuat privat dengan ID unik, termasuk jika judul sama pernah digunakan atau berada di Sampah. Sinopsis bisa diisi kemudian.</p>{parsed.cover&&<label className="studio-check"><input type="checkbox" checked={useCover} onChange={e=>setUseCover(e.target.checked)}/><span><strong>Gunakan sampul EPUB</strong><small>Perhatian: sampul akan disimpan di bucket Storage publik, walaupun novel masih privat.</small></span></label>}</div>}
    {destination!=='new'&&<p className="studio-muted">Ditemukan {currentEpisodes.length} episode lama. Nomor dan isi duplikat akan ditolak; seluruh jadwal yang sudah ada tetap utuh.</p>}
   </section>
   <section className="studio-panel v4-review"><div className="studio-panel-top"><h2>Periksa isi buku</h2><span className="v3-counter">{selected.length} dipilih</span></div>
    <p className="studio-muted">Kata pengantar, dedikasi, dan catatan penulis dapat disimpan sebagai halaman buku tersendiri, tanpa nomor episode. Daftar isi dan halaman hak cipta tidak dipilih otomatis. Episode 0 tetap didukung.</p>
    <div className="v4-actions"><button type="button" className="studio-light-button" onClick={autoNumber}><CheckCircle2 size={16}/> Isi nomor kosong otomatis</button><button type="button" className="studio-light-button" onClick={()=>setChapters(prev=>prev.map(c=>({...c,include:!c.section_type})))}>Pilih semua episode</button></div>
    <div className="v4-chapter-stack">{chapters.map((chapter,i)=><div className={`v4-chapter ${!chapter.include?'v4-excluded':''}`} key={chapter.key}>
      <div className="v4-chapter-line"><label className="v4-checkbox"><input type="checkbox" aria-label={`Simpan ${chapter.title}`} checked={chapter.include} onChange={e=>update(i,{include:e.target.checked})}/></label>
       <span className="v4-chapter-number">{chapter.section_type?'H':chapter.episode_number??'—'}</span>
       <button type="button" className="v4-chapter-name" onClick={()=>open(chapter)}><strong>{chapter.title}</strong><small>{chapter.section_type?"Halaman buku / " + (chapter.section_type==="arc"?"pemisah arc":"materi depan") + " · ":""}{chapter.arc_title||'Tanpa arc'} · {chapter.content_md.trim().split(/\s+/).filter(Boolean).length} kata · {chapter.confidence==='periksa'?'Perlu dicek':`Deteksi ${chapter.confidence}`}</small></button>
       <button type="button" className="v4-icon-btn" aria-label={expanded===chapter.key?'Tutup':'Edit episode'} onClick={()=>open(chapter)}>{expanded===chapter.key?<ChevronUp size={19}/>:<ChevronDown size={19}/>}</button>
      </div>
      {expanded===chapter.key&&<div className="v4-chapter-edit"><div className="v4-chapter-fields"><label className="studio-label" hidden={Boolean(chapter.section_type)}>Nomor episode<input type="number" min="0" max="9999" value={chapter.episode_number??''} onChange={e=>update(i,{episode_number:e.target.value===''?null:Number(e.target.value),confidence:'tinggi'})}/></label><label className="studio-label">Judul<input value={chapter.title} maxLength={180} onChange={e=>update(i,{title:e.target.value,confidence:'tinggi'})}/></label></div>
       <label className="studio-label">Arc / bagian<input value={chapter.arc_title} maxLength={180} onChange={e=>update(i,{arc_title:e.target.value})}/></label>
       <label className="studio-label">Isi Markdown<textarea ref={textareaRef} className="v4-manuscript" value={chapter.content_md} onClick={e=>setSplitAt(e.currentTarget.selectionStart)} onKeyUp={e=>setSplitAt(e.currentTarget.selectionStart)} onSelect={e=>setSplitAt(e.currentTarget.selectionStart)} onChange={e=>{update(i,{content_md:e.target.value});setSplitAt(e.currentTarget.selectionStart);}}/></label>
       <div className="v4-edit-actions"><button className="studio-light-button" title="Naik satu posisi" disabled={i===0} onClick={()=>setChapters(x=>changeOrder(x,i,-1))}><ArrowUp size={16}/> Naik</button><button className="studio-light-button" disabled={i===chapters.length-1} onClick={()=>setChapters(x=>changeOrder(x,i,1))}><ArrowDown size={16}/> Turun</button><button className="studio-light-button" disabled={i===chapters.length-1} onClick={()=>{if(window.confirm('Gabungkan isi episode ini dengan bagian berikutnya?')){setChapters(x=>mergeAdjacent(x,i));setExpanded(null)}}}><Layers3 size={16}/> Gabung berikutnya</button><button className="studio-light-button" disabled={splitAt<10||splitAt>chapter.content_md.length-10} onClick={()=>split(i)}><Scissors size={16}/> Pisah di kursor</button></div>
       <small className="studio-muted">Untuk memisah episode, letakkan kursor di dalam naskah lalu pilih “Pisah di kursor”. Konten tidak diubah oleh AI.</small>
      </div>}
     </div>)}</div>
   </section>
   <section className="studio-panel v4-confirm"><div className="studio-panel-top"><h2>Simpan sebagai draft</h2><ShieldCheck size={20}/></div>
    {warnings.length>0&&<div className="v4-error-list">{warnings.slice(0,12).map((w,i)=><p key={i}><TriangleAlert size={14}/>{w}</p>)}</div>}
    {chapters.some(c=>c.include&&!c.section_type&&c.episode_number===null)&&<div className="v4-warning"><TriangleAlert size={15}/> Masih ada nomor episode kosong. Klik “Isi nomor kosong otomatis” sebelum menyimpan.</div>}
    {dirty&&<div className="v4-warning"><TriangleAlert size={15}/> Ada bagian dengan deteksi tidak pasti. Periksa atau keluarkan dari impor sebelum lanjut.</div>}
    <p className="studio-muted">Episode dan halaman buku yang dicentang disimpan. Episode baru menggunakan <strong>is_enabled=false</strong> dan <strong>release_at=NULL</strong>. Tidak ada publikasi otomatis.</p>
    <button type="button" className="studio-primary v4-confirm-button" disabled={saving||warnings.length>0||(!selected.length&&!chosenSections.length)||selected.some(c=>c.episode_number===null)} onClick={()=>void persist()}>{saving?'Menyimpan…':`Simpan ${selected.length} episode + ${chosenSections.length} halaman`} <ArrowRight size={18}/></button>
   </section>
  </>}
 </>;
}
