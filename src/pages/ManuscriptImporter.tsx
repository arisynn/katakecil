import {CoverEditor,type CoverSource} from '../features/covers/CoverEditor';
import {CoverCandidates} from '../features/covers/CoverCandidates';
import {newCoverOperation,saveCover,publishCover,type CoverUploadOperation} from '../features/covers/api';
import type {PreparedCover} from '../features/covers/model';
import BrandIcon from '../components/BrandIcon';
import PublicationOptions from '../features/studio/components/PublicationOptions';
import {defaultPublicationOptions,publicationPreview} from '../utils/publicationPlan';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Book, Episode } from '../data/library';
import { slugify } from '../data/library';
import { supabase } from '../data/supabase';
import { navigate } from '../utils/nav';
import {readZip} from '../features/import/readZip';
import {useLeaveGuard} from '../hooks/useLeaveGuard';
import {ImportRejected,commitImport,commitPublishingImport,importStatus,rememberOperation,forgetOperation,pendingOperation} from '../data/manuscriptImport';
import { assignEpisodeNumbers, changeOrder, mergeAdjacent, parsePlainManuscript, splitChapter, validateImport, type ImportChapter, type ParsedManuscript } from '../utils/importManuscript';
const bodyHash=async(body:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(body.trim())))).map(b=>b.toString(16).padStart(2,'0')).join('');
const errorText = (e: unknown) => e instanceof Error ? e.message : String(e);
type Props = {
    books: Book[];
    episodes: Episode[];
    onChanged: () => Promise<void>;
};
const ACCEPT = '.zip,.epub,.md,.txt,application/zip,application/epub+zip,text/plain,text/markdown';
const MAX_FILE = 20_000_000;
const safeId = (value: string) => slugify(value) || 'cerita-baru';
// Database IDs must remain unique even if an older novel with the same title is in Trash.
// Keep the generated ID stable across retries for one file/title to avoid duplicate imports
// when the network response is lost after the transaction commits.
const newImportId = (title: string) => {
    const base = safeId(title).slice(0, 58).replace(/-+$/, '') || 'cerita-baru';
    const suffix = crypto.randomUUID().replace(/-/g, '').slice(0, 12);
    return `${base}-${suffix}`;
};
const meaningfulFrontmatter = (title: string) => /(?:kata pengantar|prakata|pengantar|preface|foreword|dedikasi|persembahan|ucapan terima kasih|acknowledgment|about the author|tentang penulis|catatan penulis)/i.test(title);
export default function ManuscriptImporter({ books, episodes, onChanged }: Props) {
    const [reading, setReading] = useState(false);
    const [publication,setPublication]=useState(defaultPublicationOptions);
    const [publishImportedCover,setPublishImportedCover]=useState(true);
    const abortRef = useRef<AbortController|null>(null);
    const operation = useRef<{id:string;payload:Record<string,unknown>}|null>(null);
    const [pendingId,setPendingId] = useState<string|null>(()=>pendingOperation());
    const [filter,setFilter] = useState('all');
    const [numberMode,setNumberMode] = useState<'continue'|'start'|'gaps'>('continue');
    const [numberStart,setNumberStart] = useState(1);
    const [undo,setUndo] = useState<ImportChapter[]|null>(null);
    const locked = Boolean(pendingId);
    useEffect(()=>()=>abortRef.current?.abort(),[]);
    const [pickedName, setPickedName] = useState('');
    const lastFileRef = useRef<File | null>(null);
    const pendingNewId = useRef<{
        title: string;
        id: string;
    } | null>(null);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerStatus, setPickerStatus] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [readPhase, setReadPhase] = useState('');
    const [importReport, setImportReport] = useState<{
        cover: boolean;
        parts: number;
        episodes: number;
        pages: number;
        saved: boolean;
    } | null>(null);
    const [parsed, setParsed] = useState<ParsedManuscript | null>(null);
    const [chapters, setChapters] = useState<ImportChapter[]>([]);
    const initialBook = new URLSearchParams(window.location.search).get('book') || '';
    const [destination, setDestination] = useState(books.some(b => b.id === initialBook) ? initialBook : 'new');
    const [bookTitle, setBookTitle] = useState('');
    const [bookGenre, setBookGenre] = useState('Fiksi');
    const [useCover,setUseCover]=useState(false),[coverSource,setCoverSource]=useState<CoverSource|null>(null),[coverChoice,setCoverChoice]=useState<string|null>(null),[preparedCover,setPreparedCover]=useState<PreparedCover|null>(null),[coverPreparing,setCoverPreparing]=useState(false),[coverRetry,setCoverRetry]=useState<CoverUploadOperation|null>(null);
    const coverOperation=useRef<CoverUploadOperation|null>(null);
    const [expanded, setExpanded] = useState<string | null>(null);
    const [splitAt, setSplitAt] = useState<number>(0);
    const [step, setStep] = useState<'upload' | 'review'>('upload');
    const textareaRef = useRef<HTMLTextAreaElement | null>(null);
    const coverURL = useMemo(() => preparedCover ? URL.createObjectURL(preparedCover.normalized) : '', [preparedCover?.normalized]);
    useEffect(() => () => { if (coverURL)
        URL.revokeObjectURL(coverURL); }, [coverURL]);
    const currentEpisodes = episodes.filter(e => e.book_id === destination);
    const occupiedNumbers = useMemo(() => destination === 'new' ? [] : currentEpisodes, [destination, episodes]);
    const warnings = useMemo(() => { const eps = chapters.filter(c => !c.section_type); return eps.some(c => c.include) ? validateImport(eps, occupiedNumbers) : []; }, [chapters, occupiedNumbers]);
    const selected = chapters.filter(c => c.include && !c.section_type);
    let releasePreview:ReturnType<typeof publicationPreview>=[],publicationError='';
    try{releasePreview=publicationPreview(selected,currentEpisodes,publication);}catch(e){publicationError=errorText(e);}
    const finishCover=async(op:CoverUploadOperation)=>{const asset=await saveCover(op,new AbortController().signal,setSaveStage);if(op.publishOnImport){setSaveStage('Menerbitkan sampul…');await publishCover(asset.id,op.expectedImportVersion??0,op.importPublicationId!);}return asset;};
    const chosenSections = chapters.filter(c => c.include && Boolean(c.section_type));
    const dirty = chapters.some(c => c.confidence === 'periksa' && !c.reviewed && c.include);
    const sectionErrors = chosenSections.flatMap(c=>!c.title.trim()||!c.content_md.trim()?['Ada halaman tanpa judul/isi.']:c.content_md.length>1_000_000?['Halaman melebihi 1 juta karakter.']:c.confidence==='periksa'&&!c.reviewed?['Konfirmasi halaman yang perlu diperiksa.']:[]);
    if(chosenSections.length>60)sectionErrors.push('Maksimal 60 halaman buku per impor.');
    const allErrors = [...warnings,...sectionErrors];
    useLeaveGuard(reading||saving||Boolean(parsed)||locked||Boolean(coverRetry),()=>{
        if(saving)return false;
        if(!window.confirm(locked?'Status impor belum dipastikan. Tinggalkan halaman dan periksa status ketika kembali?':'Tinggalkan analisis ini? Hasil pemeriksaan yang belum disimpan akan hilang.'))return false;
        abortRef.current?.abort();return true;
    });
    const recover = async () => {
        if(!pendingId)return;
        setSaving(true);setError('');
        try { const result=await importStatus(pendingId);
            if(result){forgetOperation();operation.current=null;setPendingId(null);setParsed(null);setChapters([]);if(coverOperation.current)setCoverRetry(coverOperation.current);setSuccess(`Impor terverifikasi: ${result.imported_count} episode + ${result.sections_count} halaman (${result.publication_mode&&result.publication_mode!=='draft'?'penerbitan tersimpan':'draf'}). Sampul dapat diatur dari pengaturan novel.`);setDestination(result.book_id);await onChanged();}
            else if(operation.current){setError('Belum ada transaksi tersimpan. Tekan Coba simpan lagi; identitas operasi tetap sama.');}
            else {forgetOperation();setPendingId(null);setError('Tidak ditemukan transaksi tersimpan. Pilih kembali berkas dan periksa Studio sebelum membuat impor baru.');}
        }catch(e){setError(errorText(e));}finally{setSaving(false);}
    };
    const importFile = async (file?: File) => {
        if (!file)
            return;
        abortRef.current?.abort();
        const controller=new AbortController();abortRef.current=controller;
        pendingNewId.current = null;
        setPickerOpen(false);
        setPickerStatus('Berkas diterima, menyiapkan analisis…');
        setPickedName(file.name || 'Berkas tanpa nama');
        setError('');
        setSuccess('');
        setPublication(defaultPublicationOptions());setPublishImportedCover(true);
        setParsed(null);setUseCover(false);setCoverChoice(null);setCoverSource(null);setPreparedCover(null);coverOperation.current=null;
        setImportReport(null);
        setStep('upload');
        setChapters([]);
        setReading(true);
        setReadPhase('Membaca berkas…');
        try {
            if (file.size > MAX_FILE)
                throw Error('ZIP maksimal 20 MB; EPUB maksimal 18 MB.');
            if (!/\.(epub|zip)$/i.test(file.name) && file.size > 8000000)
                throw Error('Markdown/TXT maksimal 8 MB.');
            const kind = file.name.toLowerCase();
            const mime = file.type.toLowerCase();
            let result: ParsedManuscript;
            if(kind.endsWith('.zip')) { result=await readZip(file,controller.signal,setReadPhase); }
            else if (kind.endsWith('.epub') || mime === 'application/epub+zip') {
                if(file.size>18_000_000)throw Error('EPUB maksimal 18 MB.');
                const {parseEpubFile}=await import('../utils/importEpub');
                setReadPhase('Membaca EPUB dan mencari struktur episode…');
                result = await parseEpubFile(file);
            }
            else if (/\.(md|txt)$/.test(kind) || mime === 'text/markdown' || mime === 'text/plain') {
                setReadPhase('Mengenali pembagian episode…');
                const text=new TextDecoder('utf-8',{fatal:true}).decode(await file.arrayBuffer());
                if(text.includes('\0'))throw Error('Berkas bukan teks UTF-8 yang valid.');
                result = parsePlainManuscript(text, file.name);
            }
            else
                throw Error('Format yang didukung: .zip, .epub, .md, atau .txt.');
            if(controller.signal.aborted)return;
            if (!result.chapters.length)
                throw Error('Tidak ditemukan bagian yang bisa disimpan.');
            result.chapters = result.chapters.map(c => c.section_type ? { ...c, include: c.section_type === 'frontmatter' && meaningfulFrontmatter(c.title), episode_number: null } : c);
            setImportReport({ cover: Boolean(result.cover), parts: result.chapters.length, episodes: result.chapters.filter(c => !c.section_type&&!['ignored','unsupported'].includes(c.candidate_kind||'')).length, pages: result.chapters.filter(c => !!c.section_type).length, saved: false });
            setParsed(result);
            setChapters(result.chapters);
            setBookTitle(result.title);
            setStep('review');
            setPickerStatus('Analisis selesai, periksa episode dan halaman buku.');
        }
        catch (e) {
            setError(controller.signal.aborted?'Analisis dibatalkan.':errorText(e));
            setPickerStatus('Analisis gagal, baca pesan kesalahan di atas.');
        }
        finally {
            setReading(false);
        }
    };
    // A single change handler is more reliable than racing input/change handlers
    // on Android, especially if the same File object fires both events.
    const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
        const input = event.currentTarget;
        const file = input.files?.item(0);
        setPickerOpen(false);
        if (!file) {
            setPickerStatus('Tidak ada berkas baru. Coba pilih lagi.');
            return;
        }
        if (lastFileRef.current === file)
            return;
        lastFileRef.current = file;
        input.value = '';
        void importFile(file);
    };
    useEffect(() => {
        if (!pickerOpen)
            return;
        const resume = () => {
            if (document.visibilityState !== 'visible')
                return;
            // Give the Android content picker a moment to dispatch the change event.
            window.setTimeout(() => setPickerOpen(open => {
                if (open)
                    setPickerStatus('Kembali dari pemilih berkas. Jika belum muncul nama berkas, tekan Pilih lagi.');
                return false;
            }), 900);
        };
        window.addEventListener('pageshow', resume);
        window.addEventListener('focus', resume);
        document.addEventListener('visibilitychange', resume);
        return () => { window.removeEventListener('pageshow', resume); window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume); };
    }, [pickerOpen]);
    const update = (i: number, changes: Partial<ImportChapter>) => {setUndo(chapters);setChapters(prev => prev.map((x, index) => index === i ? { ...x, reviewed: changes.reviewed ?? false, ...changes } : x));};
    const autoNumber = () => {setUndo(chapters);setChapters(prev => { const eps = assignEpisodeNumbers(prev.filter(c => !c.section_type), occupiedNumbers,numberMode,numberStart); let j = 0; return prev.map(c => c.section_type ? c : eps[j++]); });};
    const split = (i: number) => { setUndo(chapters);setChapters(prev => splitChapter(prev, i, splitAt)); setExpanded(null); setSplitAt(0); };
    const open = (chapter: ImportChapter) => { setExpanded(prev => prev === chapter.key ? null : chapter.key); setSplitAt(0); };
    const [saveStage, setSaveStage] = useState('');
    const persist = async () => {
        if (!supabase || !parsed)
            return;
        setError('');
        setSuccess('');
        const chosen = chapters.filter(c => c.include && !c.section_type);
        const sections = chapters.filter(c => c.include && c.section_type);
        const conflicts = [...(chosen.length ? validateImport(chosen, occupiedNumbers) : []),...sectionErrors];
        if (conflicts.length) {
            setError(conflicts.join(' '));
            return;
        }
        if (chosen.some(c => c.episode_number === null)) {
            setError('Tetapkan nomor episode terlebih dahulu.');
            return;
        }
        if (!chosen.length && !sections.length) {
            setError('Pilih sedikitnya satu episode atau halaman buku.');
            return;
        }
        if (destination === 'new' && !bookTitle.trim()) {
            setError('Judul novel baru wajib diisi.');
            return;
        }
        if(publicationError){setError(publicationError);return;}
        const title = destination === 'new' ? bookTitle : books.find(b => b.id === destination)?.title;
        if (!operation.current && !window.confirm(`Simpan ${chosen.length} episode dan ${sections.length} halaman buku ke “${title}”?\n\n${publication.mode==='draft'?'Episode baru tetap DRAFT.':`Penerbitan: ${releasePreview.filter(p=>!p.release_at).length} bab sekarang dan ${releasePreview.filter(p=>p.release_at).length} bab terjadwal. Novel tampil publik.`} Jadwal lama tidak diubah.`))
            return;
        if(useCover&&(!preparedCover||coverPreparing)){setError('Tunggu sampai sampul selesai disiapkan, atau pilih Tanpa sampul.');return;}
        setSaving(true);
        setSaveStage('Memvalidasi tujuan penyimpanan…');
        try {
            // Title is not an identifier: a soft-deleted novel still reserves its primary key.
            // Reuse this ID on retry, but generate a fresh ID for another manuscript/title.
            if (destination === 'new' && (!pendingNewId.current || pendingNewId.current.title !== bookTitle.trim()))
                pendingNewId.current = { title: bookTitle.trim(), id: newImportId(bookTitle) };
            let bookId = destination === 'new' ? pendingNewId.current!.id : destination;
            const { data: sectionsOld, error: sectionsError } = destination === 'new' ? { data: [], error: null } : await supabase.from('qr_book_sections').select('position').eq('book_id', bookId).order('position', { ascending: false }).limit(1);
            if (sectionsError)
                throw sectionsError;
            const maxPosition = sectionsOld?.[0]?.position ?? 0;
            const existingHashes=new Set(occupiedNumbers.map(e=>e.content_hash).filter(Boolean));
            const hashes=await Promise.all(chosen.map(c=>bodyHash(c.content_md)));
            if(hashes.some(hash=>existingHashes.has(hash)))throw Error('Isi episode sama dengan naskah yang sudah ada. Keluarkan bagian duplikat sebelum menyimpan.');
            const payload = chosen.map(c => ({ episode_number: c.episode_number, title: c.title.trim(), arc_title: c.arc_title.trim(), content_md: c.content_md.trim() }));
            const pages = sections.map((c, i) => ({ position: maxPosition + i + 1, section_type: c.section_type, title: c.title.trim(), content_md: c.content_md.trim() }));
            setSaveStage('Menyimpan novel, halaman, dan episode dalam satu transaksi…');
            if(!operation.current){
                const operationPayload={book_id:bookId,new_title:destination==='new'?bookTitle.trim():'',genre:bookGenre.trim()||'Fiksi',source_name:parsed.name,format:parsed.format,title_detected:parsed.title,...(publication.mode!=='draft'?{publishing:{mode:publication.mode,plan:releasePreview.map(({episode_number,release_at})=>({episode_number,release_at})),weekdays:publication.weekdays,time:publication.time}}:{}),episodes:payload,sections:pages,decisions:chapters.map(c=>({origin:c.origin.slice(0,1024),kind:c.section_type||c.candidate_kind||'episode',action:c.include?'include':'exclude',episode_number:c.include&&!c.section_type?c.episode_number:null,reason:(c.reason||'Keputusan penulis').slice(0,255),reviewed:Boolean(c.reviewed)}))};
                if(new TextEncoder().encode(JSON.stringify(operationPayload)).length>12_000_000)throw Error('Total naskah terpilih maksimal 12 MB. Pecah impor menjadi beberapa bagian.');
                // Freeze payload and UUID across every ambiguous network retry.
                operation.current={id:crypto.randomUUID(),payload:operationPayload};
                rememberOperation(operation.current.id);setPendingId(operation.current.id);
            }
            if(useCover&&preparedCover&&!coverOperation.current){coverOperation.current=await newCoverOperation(bookId,preparedCover);coverOperation.current.publishOnImport=Boolean(operation.current.payload.publishing)&&publishImportedCover;coverOperation.current.expectedImportVersion=books.find(b=>b.id===bookId)?.cover_version??0;coverOperation.current.importPublicationId=crypto.randomUUID();}
            const receipt=await (operation.current.payload.publishing?commitPublishingImport:commitImport)(operation.current.id,operation.current.payload);
            if(receipt.book_id!==bookId||receipt.imported_count!==payload.length||receipt.sections_count!==pages.length)throw Error('Hasil impor belum sesuai. Periksa status operasi sebelum melanjutkan.');
            forgetOperation();setPendingId(null);operation.current=null;
            let coverWarning = '';
            if (coverOperation.current) {
                try {await finishCover(coverOperation.current);coverOperation.current=null;setCoverRetry(null);}
                catch {setCoverRetry(coverOperation.current);coverWarning=' Sampul belum berhasil disimpan. Gunakan Coba simpan sampul di bawah; tidak perlu mengimpor bab lagi.';}
            }
            setSaveStage('Memuat ulang Studio…');
            let refreshWarning = '';
            try {
                await onChanged();
            }
            catch {
                refreshWarning = ' Muat ulang halaman Studio untuk melihat hasilnya.';
            }
            setImportReport({ cover: Boolean(parsed.cover), parts: chapters.length, episodes: payload.length, pages: pages.length, saved: true });
            setSuccess(`Impor berhasil: ${payload.length} episode ${receipt.publication_mode&&receipt.publication_mode!=='draft'?'dengan penerbitan sesuai pratinjau':'draft'} + ${pages.length} halaman buku tersimpan di “${title}”.${coverWarning}${refreshWarning}`);
            pendingNewId.current = null;
            setChapters([]);
            setParsed(null);
            setStep('upload');
            setPickedName('');
            setDestination(bookId);
        }
        catch (e) {
            if(e instanceof ImportRejected){forgetOperation();operation.current=null;setPendingId(null);}
            setError(errorText(e));
        }
        finally {
            setSaving(false);
            setSaveStage('');
        }
    };
    return <>
  <button className="studio-backlink" onClick={() => navigate(destination === 'new' ? '/studio/cerita' : `/studio/cerita/${destination}`)}><BrandIcon name="arrow-left" size={16}/> Kembali ke karya</button>
  <div className="studio-page-head"><span className="studio-kicker">RUANG UPLOAD</span><h1>Upload Naskah</h1><p>Pilih berkas, periksa pembagian bab, lalu simpan draf atau atur penerbitan otomatis.</p></div>
  <div className="v4-progress v69-upload-steps" aria-label="Tahapan impor"><span className={!parsed && !success ? 'active' : ''}><BrandIcon name="upload" size={15}/> 1 · Pilih file</span><BrandIcon name="arrow-right" size={16}/><span className={parsed && !success ? 'active' : ''}><BrandIcon name="book-open" size={15}/> 2 · Periksa bab</span><BrandIcon name="arrow-right" size={16}/><span className={success ? 'active' : ''}><BrandIcon name="shield" size={15}/> 3 · Atur penerbitan</span></div>
  {pendingId && <section className="studio-panel"><p>Status penyimpanan perlu dipastikan. Pemeriksaan dikunci agar retry memakai isi yang sama.</p><button disabled={saving} className="studio-light-button" onClick={()=>void recover()}>Periksa status impor</button>{operation.current && <button disabled={saving} className="studio-light-button" onClick={()=>void persist()}>Coba simpan lagi</button>}</section>}
  {error && <div className="studio-error" role="alert">{error}</div>}
  {saveStage && <div className="v5-import-stage" role="status" aria-live="polite"><span className="v4-picker-spinner"/> {saveStage}</div>}
  {(reading || importReport) && <section className="studio-panel kk-import-progress" aria-label="Tahapan pemrosesan impor" aria-live="polite">
    <div className="studio-panel-top"><h2>Progres impor</h2><BrandIcon name="book-open" size={17}/></div>
    {reading && <p className="studio-muted">{readPhase}</p>}
    {importReport && <ul className="kk-import-checklist">
      <li><BrandIcon name="check-circle" size={17}/>Berkas {parsed?.format.toUpperCase() || pickedName.split('.').pop()?.toUpperCase() || 'naskah'} berhasil dibaca</li>
      <li><BrandIcon name="check-circle" size={17}/>{importReport.cover ? 'Sampul ditemukan' : 'Tidak ada sampul terdeteksi — bisa ditambahkan nanti'}</li>
      <li><BrandIcon name="check-circle" size={17}/>{importReport.parts} bagian ditemukan ({importReport.episodes} calon episode, {importReport.pages} halaman buku, {importReport.parts-importReport.episodes-importReport.pages} bagian lain)</li>
      {importReport.saved && <li><BrandIcon name="check-circle" size={17}/>{importReport.episodes} episode berhasil disimpan</li>}
      {importReport.saved && <li><BrandIcon name="check-circle" size={17}/>Penyimpanan database berhasil diverifikasi</li>}
    </ul>}
  </section>}
  {coverRetry&&<section className="studio-panel"><p>Naskah sudah tersimpan. Sampul masih menunggu penyelesaian.</p><button type="button" className="studio-primary" disabled={saving} onClick={()=>{setSaving(true);setError('');void finishCover(coverRetry).then(()=>{setCoverRetry(null);coverOperation.current=null;setSuccess(coverRetry.publishOnImport?'Sampul berhasil diterbitkan. Naskah tidak diimpor ulang.':'Sampul privat berhasil disimpan. Naskah tidak diimpor ulang.');return onChanged();}).catch(e=>setError(errorText(e))).finally(()=>{setSaving(false);setSaveStage('');});}}>Coba simpan sampul</button><button type="button" className="studio-light-button" disabled={saving} onClick={()=>{setCoverRetry(null);coverOperation.current=null;}}>Atur sampul nanti</button></section>}
  {success && <div className="studio-success" role="status">{success} <button className="studio-light-button" onClick={() => navigate(`/studio/cerita/${destination}`)}>Lihat novel <BrandIcon name="arrow-right" size={16}/></button></div>}
  {reading && <button className="studio-light-button" onClick={()=>abortRef.current?.abort()}>Batalkan analisis</button>}
  <section className="studio-panel v4-upload-panel" aria-label="Unggah berkas naskah">
   <label className={`v4-dropzone${reading ? ' v4-upload-reading' : ''}`}>
    <BrandIcon name="upload" size={32} aria-hidden="true"/>
    <strong>{reading ? 'Menganalisis naskah…' : parsed ? 'Pilih berkas lain' : 'Pilih ZIP, EPUB, MD, atau TXT dari HP'}</strong>
    <small>{reading ? `Berkas diterima: ${pickedName}. Sedang membaca isi dan pembagian episode.` : 'ZIP 20 MB · EPUB 18 MB · MD/TXT 8 MB. Periksa isi dan pilih cara penerbitan sebelum menyimpan.'}</small>
    <input type="file" name="manuscript" aria-label="Pilih berkas ZIP, EPUB, MD, atau TXT" accept={ACCEPT} disabled={reading || saving || locked} onClick={() => { setPickerOpen(true); setPickerStatus('Menunggu berkas dari pemilih file Android…'); }} onChange={handleFileSelection}/>
   </label>
   <div className="v4-picker-status" role="status" aria-live="polite">
    {reading ? <><span className="v4-picker-spinner" aria-hidden="true"/> {readPhase} Berkas: {pickedName}.</>
            : parsed ? <>✓ {pickedName} berhasil dibaca. Periksa hasilnya di bawah sebelum menyimpan.</>
                : error && pickedName ? <>Berkas {pickedName} belum berhasil diproses. Lihat pesan kesalahan di atas; kamu boleh memilihnya lagi.</>
                    : success ? <>Impor selesai. Kamu bisa memilih berkas berikutnya.</>
                        : <>{pickerOpen ? 'Memilih berkas…' : pickerStatus || 'Setelah memilih berkas, nama file dan progres pembacaan akan muncul di sini.'}</>}
   </div>
  </section>
  {parsed && step === 'review' && <fieldset disabled={saving||locked} className="kk-import-fieldset">
   <section className="studio-panel v4-metadata">
    <div className="studio-panel-top"><h2>Hasil pembacaan</h2><span className="v3-counter">{parsed.format.toUpperCase()}</span></div>
    <div className="v4-metadata-grid">{coverURL && <img src={coverURL} alt="Sampul naskah" className="v4-cover"/>}<div><strong>{parsed.title}</strong><small>{parsed.creator || 'Penulis tidak tercantum'} · {parsed.language || 'Bahasa tidak tercantum'}</small><p>{chapters.length} bagian terdeteksi · {selected.length} episode dipilih · {chosenSections.length} halaman buku dipilih</p></div></div>
    {parsed.warnings.map((w, i) => <div className="v4-warning" key={i}><BrandIcon name="alert" size={16}/>{w}</div>)}
   </section>
   <section className="studio-panel v4-target"><div className="studio-panel-top"><h2>Tujuan penyimpanan</h2><BrandIcon name="books" size={19}/></div>
    <label className="studio-label">Simpan ke novel<select value={destination} onChange={e => setDestination(e.target.value)}><option value="new">+ Novel baru</option>{books.map(b => <option key={b.id} value={b.id}>{b.title}</option>)}</select></label>
    {destination === 'new' && <div className="v4-target-fields"><label className="studio-label">Judul novel hasil deteksi<input maxLength={180} value={bookTitle} onChange={e => setBookTitle(e.target.value)}/></label><label className="studio-label">Genre<input maxLength={70} value={bookGenre} onChange={e => setBookGenre(e.target.value)}/></label><p className="studio-muted">Novel baru dibuat sesuai pilihan penerbitan. Sinopsis bisa dilengkapi kemudian.</p></div>}
    {destination !== 'new' && <p className="studio-muted">Ditemukan {currentEpisodes.length} episode lama. Nomor dan isi duplikat akan ditolak; seluruh jadwal yang sudah ada tetap utuh.</p>}
   </section>
   {!!parsed.covers?.length&&<CoverCandidates covers={parsed.covers} selected={coverChoice} disabled={saving||locked} onChoose={c=>{setUseCover(Boolean(c));setCoverChoice(c?.origin||null);setCoverSource(c?{data:c.data,name:c.name}:null);setPreparedCover(null);coverOperation.current=null;}}/>}
   {useCover&&<section className="studio-panel"><CoverEditor value={preparedCover} onChange={v=>{setPreparedCover(v);coverOperation.current=null;}} source={coverSource} title={destination==='new'?bookTitle:books.find(b=>b.id===destination)?.title} disabled={saving||locked} onBusy={setCoverPreparing}/><p className="studio-muted">{publication.mode!=='draft'&&publishImportedCover?'Sampul yang dipilih akan diterbitkan setelah naskah berhasil disimpan.':'Sampul disimpan privat. Kamu bisa menerbitkannya nanti melalui pengaturan karya.'}</p></section>}
   <section className="studio-panel v4-review"><div className="studio-panel-top"><h2>Periksa isi buku</h2><span className="v3-counter">{selected.length} dipilih</span></div>
    <p className="studio-muted">Kata pengantar, dedikasi, dan catatan penulis dapat disimpan sebagai halaman buku tersendiri, tanpa nomor episode. Daftar isi dan halaman hak cipta tidak dipilih otomatis. Episode 0 tetap didukung.</p>
    <div className="kk-import-toolbar"><label className="studio-label">Nomor untuk bagian yang belum bernomor<select value={numberMode} onChange={e=>setNumberMode(e.target.value as typeof numberMode)}><option value="continue">Lanjut setelah nomor terbesar</option><option value="start">Mulai dari nomor pilihan</option><option value="gaps">Isi celah nomor yang kosong</option></select></label>{numberMode==='start'&&<label className="studio-label">Nomor awal<input type="number" min="0" max="9999" value={numberStart} onChange={e=>setNumberStart(Number(e.target.value))}/></label>}</div>
    <div className="v4-actions"><button type="button" className="studio-light-button" onClick={autoNumber}><BrandIcon name="check-circle" size={16}/> Isi nomor kosong otomatis</button><button type="button" className="studio-light-button" onClick={() => {setUndo(chapters);setChapters(prev => prev.map(c => ({ ...c, include: !c.section_type && c.candidate_kind!=='ignored' && c.candidate_kind!=='unsupported' })));}}>Pilih semua episode</button></div>
    <div className="kk-import-toolbar"><label>Filter <select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">Semua bagian</option><option value="episode">Episode</option><option value="section">Halaman buku</option><option value="review">Perlu diperiksa</option><option value="excluded">Dikeluarkan</option></select></label><button className="studio-light-button" disabled={!undo} onClick={()=>{if(undo)setChapters(undo);setUndo(null);}}>Urungkan perubahan terakhir</button><button className="studio-light-button" onClick={()=>{setUndo(chapters);setChapters(x=>[...x].sort((a,b)=>(a.episode_number??10000)-(b.episode_number??10000)));}}>Urutkan berdasarkan nomor</button></div>
    <div className="v4-chapter-stack">{chapters.map((chapter, i) => <div hidden={filter==='episode'?Boolean(chapter.section_type)||['ignored','unsupported'].includes(chapter.candidate_kind||''):filter==='section'?!chapter.section_type:filter==='review'?chapter.confidence!=='periksa'||Boolean(chapter.reviewed):filter==='excluded'?chapter.include:false} className={`v4-chapter ${!chapter.include ? 'v4-excluded' : ''}`} key={chapter.key}>
      <div className="v4-chapter-line"><label className="v4-checkbox"><input type="checkbox" aria-label={`Simpan ${chapter.title}`} checked={chapter.include} disabled={!chapter.content_md.trim()||chapter.candidate_kind==='unsupported'} onChange={e => update(i, { include: e.target.checked })}/></label>
       <span className="v4-chapter-number">{chapter.section_type ? 'H' : chapter.episode_number ?? '—'}</span>
       <button type="button" className="v4-chapter-name" onClick={() => open(chapter)}><strong>{chapter.title}</strong><small>{chapter.section_type ? "Halaman buku / " + (chapter.section_type === "arc" ? "pemisah arc" : "materi depan") + " · " : ""}{chapter.arc_title || 'Tanpa arc'} · {chapter.content_md.trim().split(/\s+/).filter(Boolean).length} kata · {chapter.confidence === 'periksa' ? 'Perlu dicek' : `Deteksi ${chapter.confidence}`}</small></button>
       <button type="button" className="v4-icon-btn" aria-label={expanded === chapter.key ? 'Tutup' : 'Edit episode'} onClick={() => open(chapter)}>{expanded === chapter.key ? <BrandIcon name="chevron-up" size={19}/> : <BrandIcon name="chevron-down" size={19}/>}</button>
      </div>
      {expanded === chapter.key && <div className="v4-chapter-edit"><p className="studio-muted">Sumber: {chapter.origin}<br/>{chapter.reason||'Periksa judul, nomor, dan isi sebelum menyimpan.'}</p>
       <label className="studio-label">Jenis bagian<select value={chapter.section_type||'episode'} disabled={!chapter.content_md.trim()} onChange={e=>update(i,{section_type:e.target.value==='episode'?undefined:e.target.value as 'frontmatter'|'arc',candidate_kind:e.target.value as 'episode'|'frontmatter'|'arc',confidence:'periksa',reviewed:false})}><option value="episode">Episode</option><option value="frontmatter">Halaman buku</option><option value="arc">Pemisah arc</option></select></label>
       {chapter.confidence==='periksa' && <label className="studio-check"><input type="checkbox" checked={Boolean(chapter.reviewed)} onChange={e=>update(i,{reviewed:e.target.checked})}/> Saya sudah memeriksa klasifikasi dan isi bagian ini</label>}
       <div className="v4-chapter-fields"><label className="studio-label" hidden={Boolean(chapter.section_type)}>Nomor episode<input type="number" min="0" max="9999" value={chapter.episode_number ?? ''} onChange={e => update(i, { episode_number: e.target.value === '' ? null : Number(e.target.value) })}/></label><label className="studio-label">Judul<input value={chapter.title} maxLength={180} onChange={e => update(i, { title: e.target.value })}/></label></div>
       <label className="studio-label">Arc / bagian<input value={chapter.arc_title} maxLength={180} onChange={e => update(i, { arc_title: e.target.value })}/></label>
       <label className="studio-label">Isi Markdown<textarea ref={textareaRef} className="v4-manuscript" value={chapter.content_md} onClick={e => setSplitAt(e.currentTarget.selectionStart)} onKeyUp={e => setSplitAt(e.currentTarget.selectionStart)} onSelect={e => setSplitAt(e.currentTarget.selectionStart)} onChange={e => { update(i, { content_md: e.target.value }); setSplitAt(e.currentTarget.selectionStart); }}/></label>
       <div className="v4-edit-actions"><button className="studio-light-button" title="Naik satu posisi" disabled={i === 0} onClick={() => {setUndo(chapters);setChapters(x => changeOrder(x, i, -1));}}><BrandIcon name="arrow-up" size={16}/> Naik</button><button className="studio-light-button" disabled={i === chapters.length - 1} onClick={() => {setUndo(chapters);setChapters(x => changeOrder(x, i, 1));}}><BrandIcon name="arrow-down" size={16}/> Turun</button><button className="studio-light-button" disabled={i === chapters.length - 1} onClick={() => { if (window.confirm('Gabungkan isi episode ini dengan bagian berikutnya?')) {
                    setUndo(chapters);setChapters(x => mergeAdjacent(x, i));
                    setExpanded(null);
                } }}><BrandIcon name="layers" size={16}/> Gabung berikutnya</button><button className="studio-light-button" disabled={splitAt < 10 || splitAt > chapter.content_md.length - 10} onClick={() => split(i)}><BrandIcon name="scissors" size={16}/> Pisah di kursor</button></div>
       <small className="studio-muted">Untuk memisah episode, letakkan kursor di dalam naskah lalu pilih “Pisah di kursor”. Urutan naik/turun membantu pemeriksaan. Urutan baca mengikuti nomor episode. Konten tidak diubah oleh AI.</small>
      </div>}
     </div>)}</div>
   </section>
   <section className="studio-panel v4-confirm"><div className="studio-panel-top"><h2>Atur penerbitan</h2><BrandIcon name="shield" size={20}/></div>
    {allErrors.length > 0 && <div className="v4-error-list">{allErrors.slice(0, 12).map((w, i) => <p key={i}><BrandIcon name="alert" size={14}/>{w}</p>)}</div>}
    {chapters.some(c => c.include && !c.section_type && c.episode_number === null) && <div className="v4-warning"><BrandIcon name="alert" size={15}/> Masih ada nomor episode kosong. Klik “Isi nomor kosong otomatis” sebelum menyimpan.</div>}
    {dirty && <div className="v4-warning"><BrandIcon name="alert" size={15}/> Ada bagian dengan deteksi tidak pasti. Periksa atau keluarkan dari impor sebelum lanjut.</div>}
    <p className="studio-muted">{chapters.filter(c=>!c.include).length} bagian dilewati. {selected.length>0&&`Rentang nomor: ${Math.min(...selected.map(c=>c.episode_number??0))}–${Math.max(...selected.map(c=>c.episode_number??0))}. `}Episode dan halaman buku yang dicentang disimpan sesuai pilihan penerbitan di bawah.</p>
    <PublicationOptions value={publication} onChange={setPublication} preview={releasePreview} error={publicationError} count={selected.length} hasExisting={destination!=='new'}/>
    {useCover&&publication.mode!=='draft'&&<label className="studio-check"><input type="checkbox" checked={publishImportedCover} onChange={e=>setPublishImportedCover(e.target.checked)}/><span>Terbitkan sampul yang dipilih bersama novel</span></label>}
    <button type="button" className="studio-primary v4-confirm-button" disabled={saving || Boolean(publicationError) || allErrors.length > 0 || (!selected.length && !chosenSections.length) || selected.some(c => c.episode_number === null)} onClick={() => void persist()}>{saving ? 'Menyimpan…' : `Simpan ${selected.length} episode + ${chosenSections.length} halaman`} <BrandIcon name="arrow-right" size={18}/></button>
   </section>
  </fieldset>}
 </>;
}
