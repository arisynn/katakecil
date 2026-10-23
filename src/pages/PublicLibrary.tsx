import {CoverDetail} from '../features/covers/CoverDetail';
import BrandIcon from '../components/BrandIcon';
import {useEffect, useMemo, useState} from 'react';
import {Cover, fallbackCover} from '../components/Cover';
import {getPublicLibrary, type Book, type EpisodeSummary} from '../data/library';
import {isConfigured} from '../data/supabase';
import {navigate} from '../utils/nav';
import {useUiTheme} from '../hooks/useUiTheme';
import PublicHeader from '../components/public/PublicHeader';
import {BookmarkButton} from '../features/public/components/StoryCard';
import {Action, EmptyLibrary} from '../features/public/components/LibraryUI';
import {getPublicUpcomingChapters, formatUpcomingChapter, type UpcomingChapter} from '../data/publicSchedule';
import {parseReadingProgress} from '../utils/readingProgress';
import {readerHeading} from '../utils/readerHeading';

const demoDate='2026-10-01T00:00:00.000Z';
const demoBooks:Book[]=[
 ['Senja di Ujung Kota','Romansa','Tentang pertemuan sederhana dan hal-hal yang membuat kita memilih tinggal.'],
 ['Langit yang Sama','Fiksi','Dua perjalanan, satu langit, dan sebuah tempat untuk kembali.'],
 ['Jejak di Kertas','Slice of Life','Di antara halaman dan ingatan, ada cerita yang belum selesai.'],
].map(([title,genre,synopsis],i)=>({id:`v6-demo-${i}`,slug:`v6-demo-${i}`,title,genre,synopsis,cover_url:fallbackCover({id:`v6-demo-${i}`,title}),status:'ongoing',is_published:true,is_featured:false,created_at:demoDate,updated_at:demoDate}));
const countFor=(episodes:EpisodeSummary[],book:Book)=>episodes.filter(e=>e.book_id===book.id).length;
function readProgress(book:Book){try{return parseReadingProgress(JSON.parse(localStorage.getItem(`kk-secure-progress-${book.id}`)||'null'));}catch{return null;}}

function useLibrary(){
 const [data,setData]=useState<{books:Book[];episodes:EpisodeSummary[]}>({books:[],episodes:[]});
 const [loading,setLoading]=useState(isConfigured),[error,setError]=useState(''),[generation,setGeneration]=useState(0);
 useEffect(()=>{
  if(!isConfigured){setData({books:demoBooks,episodes:[]});setLoading(false);return;}
  let active=true;setLoading(true);setError('');
  const load=async()=>{try{const result=await getPublicLibrary();if(active){setData(result);setError('');}}catch(e){if(active)setError(e instanceof Error?e.message:'Library belum dapat dimuat.');}finally{if(active)setLoading(false);}};
  void load();
  const online=()=>void load();window.addEventListener('online',online);
  const timer=window.setInterval(()=>{if(document.visibilityState==='visible'&&navigator.onLine)void load();},300000);
  return()=>{active=false;window.clearInterval(timer);window.removeEventListener('online',online);};
 },[generation]);
 return {...data,loading,error,demo:!isConfigured,retry:()=>setGeneration(n=>n+1)};
}

function LibraryShelf({books,episodes,demo}:{books:Book[];episodes:EpisodeSummary[];demo:boolean}){
 const [query,setQuery]=useState(()=>new URLSearchParams(location.search).get('q')||'');
 const eligible=useMemo(()=>books.filter(book=>demo||countFor(episodes,book)>0),[books,episodes,demo]);
 const shown=useMemo(()=>eligible.filter(book=>`${book.title} ${book.genre}`.toLocaleLowerCase('id-ID').includes(query.trim().toLocaleLowerCase('id-ID'))),[eligible,query]);
 return <main className="crystal-library" aria-label="Library KataKecil">
  <header className="crystal-library-intro"><span className="crystal-eyebrow">SEBUAH RUANG UNTUK CERITA</span><h1>Library<span>.</span></h1><p>Temukan tempatmu di antara halaman.</p></header>
  {demo&&<p className="crystal-preview-note">Pratinjau tampilan · cerita contoh</p>}
  {(eligible.length>6||query)&&<label className="crystal-search"><BrandIcon name="search" size={18}/><input type="search" aria-label="Cari cerita di Library" placeholder="Cari sebuah cerita…" value={query} onChange={e=>setQuery(e.target.value)}/></label>}
  {shown.length?<div className="crystal-shelf">{shown.map((book,i)=>{
   const rows=episodes.filter(ep=>ep.book_id===book.id).sort((a,b)=>a.episode_number-b.episode_number);
   const progress=readProgress(book);const position=progress?rows.findIndex(ep=>ep.episode_number===progress.ep):-1;
   return <article className="crystal-story" key={book.id} style={{'--story-index':Math.min(i,8)} as React.CSSProperties}>
    <button type="button" className="crystal-story-link" aria-label={`${position>=0?'Lanjutkan':'Buka'} ${book.title}`} onClick={()=>navigate(`${demo?'/cerita/':'/baca/'}${book.slug}`)}>
     <div className="crystal-cover"><Cover book={book} eager={i<3}/><span className="crystal-cover-shine" aria-hidden="true"/></div>
     <span className="crystal-story-copy"><span className="crystal-story-genre">{book.genre||'Fiksi'}</span><strong>{book.title}</strong><span className="crystal-synopsis">{book.synopsis}</span><span className="crystal-story-meta">{position>=0?`Terakhir di ${progress!.ep===0?'prolog':`bab ${progress!.ep}`}`:demo?'Pratinjau':`${rows.length} bab`}<span aria-hidden="true"> · </span>{book.status==='completed'?'Tamat':book.status==='hiatus'?'Jeda':'Bersambung'}</span>
     {position>=0&&<span className="crystal-progress" aria-label={`Posisi bab ${position+1} dari ${rows.length}`}><span style={{width:`${(position+1)/rows.length*100}%`}}/></span>}</span>
    </button>
   </article>;
  })}</div>:query?<div className="crystal-empty"><h2>Cerita belum ditemukan.</h2><button type="button" onClick={()=>setQuery('')}>Tampilkan semua cerita</button></div>:<EmptyLibrary/>}
  <footer className="crystal-library-footer"><span>Satu cerita. Satu waktu.</span><span>KataKecil</span></footer>
 </main>;
}

function Detail({ book, episodes, schedules, demo }: {
    book: Book;
    episodes: EpisodeSummary[];
    schedules: UpcomingChapter[];
    demo: boolean;
}) {
    const rows = episodes
        .filter(episode => episode.book_id === book.id)
        .sort((a, b) => a.episode_number - b.episode_number);
    const [showAll, setShowAll] = useState(false);
    const nextChapter = schedules.find(item => item.book_id === book.id);
    const progress = readProgress(book);
    const resumeChapter = progress && rows.some(ep => ep.episode_number === progress.ep) ? progress.ep : null;
    const bookStatus = book.status === 'completed' ? 'Tamat'
        : book.status === 'hiatus' ? 'Jeda' : 'Berlangsung';

    return <main className="v6-detail-page">
        <div className="v6-detail-content">
            <Action to="/" className="v6-detail-back" label="Kembali ke Library">
                <BrandIcon name="arrow-left" size={17}/><span>Library</span>
            </Action>
            <section className="v6-detail-hero">
                <div className="v6-detail-cover">
                    <CoverDetail book={book}/>
                </div>
                <div className="v6-detail-info">
                    <h1>{book.title}</h1>
                    <div className="v6-detail-tags">
                        <span>{book.genre || 'Fiksi'}</span><span>{bookStatus}</span>
                    </div>
                    <div className="v6-detail-numbers">
                        <span><BrandIcon name="book-open" size={16}/>{demo ? 'Contoh' : `${rows.length} Bab`}</span>
                        <span><BrandIcon name="clock" size={16}/>{book.status === 'completed' ? 'Selesai' : book.status === 'hiatus' ? 'Sedang jeda' : 'Bersambung'}</span>
                    </div>
                    <p>{book.synopsis || 'Sinopsis belum ditambahkan oleh penulis.'}</p>
                    <div className="v6-detail-actions">
                        {rows.length > 0 && !demo
                            ? <Action className="v6-button v6-button-gold" to={`/baca/${book.slug}`}>
                                {resumeChapter !== null ? 'Lanjutkan Membaca' : 'Mulai Membaca'} <BrandIcon name="arrow-right" size={17}/>
                            </Action>
                            : <span className="v62-unavailable-chapters">Belum ada bab terbit</span>}
                      {!demo && <BookmarkButton book={book}/>}
                    </div>
                    {resumeChapter !== null && <p className="kk-v71-detail-progress">Posisi terakhir: {resumeChapter === 0 ? 'Prolog' : `Bab ${resumeChapter}`}. Tombol Lanjutkan Membaca memulihkan posisi bacaanmu.</p>}
                </div>
            </section>
            <div className="v6-detail-bottom">
                <section className="v6-chapters">
                    <div className="v6-chapters-title">
                        <h2>Daftar Bab</h2><span>Urut: Bab pertama ke terbaru</span>
                    </div>
                    {rows.length > 0
                        ? rows.slice(0, showAll ? undefined : 18).map(ep =>
                            <button
                                className="v6-chapter"
                                key={ep.episode_number}
                                onClick={() => navigate(`/baca/${book.slug}?episode=${ep.episode_number}`)}
                            >
                                <span>{ep.episode_number === 0 ? 'P' : `${ep.episode_number}.`}</span>
                                <div>
                                    <strong>{readerHeading(ep.title, ep.episode_number).title || `Bab ${ep.episode_number}`}</strong>
                                    <small>{readerHeading(ep.title, ep.episode_number).eyebrow}</small>
                                </div>
                                <span className="v6-chapter-date">
                                    {ep.release_at ? new Date(ep.release_at).toLocaleDateString('id-ID', {
                                        timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric',
                                    }) : ''}
                                </span>
                                <BrandIcon name="chevron-right" size={16}/>
                            </button>)
                        : <div className="v6-no-chapters">
                            {demo
                                ? 'Ini hanya pratinjau visual. Hubungkan Supabase untuk membaca cerita asli.'
                                : 'Bab pertama belum diterbitkan.'}
                        </div>}
                    {rows.length > 18 && !showAll && <button
                        className="v6-show-chapters"
                        onClick={() => setShowAll(true)}
                    >Lihat semua bab <BrandIcon name="arrow-right" size={16}/></button>}
                </section>
                <aside className="v6-detail-extra">
                    <h2>Informasi</h2>
                    <dl>
                        <dt>Genre</dt><dd>{book.genre || 'Fiksi'}</dd>
                        <dt>Status</dt><dd>{bookStatus}</dd>
                        <dt>Diperbarui</dt>
                        <dd>{new Date(book.updated_at).toLocaleDateString('id-ID', {
                            timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric',
                        })}</dd>
                        <dt>Total bab</dt><dd>{demo ? 'Demo' : rows.length}</dd>
                        {nextChapter && <>
                            <dt>Bab berikutnya</dt>
                            <dd className="v68-detail-schedule">
                                <BrandIcon name="calendar-clock" size={15} aria-hidden="true"/>
                                {formatUpcomingChapter(nextChapter)}
                            </dd>
                        </>}
                    </dl>
                    <p>Setiap cerita punya tempat untuk kembali.</p>
                </aside>
            </div>
        </div>
    </main>;
}

export default function PublicLibrary({path}:{path:string}){
 const {books,episodes,loading,error,retry,demo}=useLibrary();
 const {theme}=useUiTheme();
 const slug=path.startsWith('/cerita/')?decodeURIComponent(path.split('/')[2]||''):null;
 const book=slug?books.find(b=>b.slug===slug):undefined;
 const [schedules,setSchedules]=useState<UpcomingChapter[]>([]);
 useEffect(()=>{let active=true;if(slug&&isConfigured)void getPublicUpcomingChapters().then(rows=>{if(active)setSchedules(rows);}).catch(()=>{});return()=>{active=false;};},[slug]);
 useEffect(()=>{document.title=`${book?book.title:'Library'} · KataKecil`;},[book]);
 return <div className={`site-shell v6-public crystal-public ${slug?'v63-public-detail':''}`} data-kk-theme={theme}>
  <PublicHeader path={path}/>
  {loading?<main className="crystal-library" aria-busy="true" aria-label="Memuat Library"><div className="crystal-library-intro"><span className="crystal-eyebrow">KATAKECIL</span><h1>Library<span>.</span></h1></div><div className="crystal-skeletons" role="status"><span>Menyiapkan rak ceritamu…</span>{[0,1,2].map(n=><div className="crystal-skeleton" key={n}/>)}</div></main>:error?<main className="crystal-empty" role="alert"><BrandIcon name="book-open" size={30}/><h1>Library belum dapat dibuka.</h1><p>Periksa koneksi internet, lalu coba kembali.</p><button type="button" onClick={retry}>Coba lagi</button></main>:slug?(book?<Detail book={book} episodes={episodes} schedules={schedules} demo={demo}/>:<main className="crystal-empty"><h1>Cerita tidak ditemukan.</h1><Action to="/">Kembali ke Library</Action></main>):<LibraryShelf books={books} episodes={episodes} demo={demo}/>}
 </div>;
}
