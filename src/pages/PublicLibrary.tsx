import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, BookOpen, ChevronDown, ChevronRight, Clock3, Library, Search, Sparkles, X } from 'lucide-react';
import { Cover, fallbackCover } from '../components/Cover';
import { getPublicLibrary, type Book, type EpisodeSummary } from '../data/library';
import { isConfigured } from '../data/supabase';
import { navigate } from '../utils/nav';
import { useCollection } from '../utils/collection';
import PublicHeader from '../components/public/PublicHeader';
import { useUiTheme } from '../hooks/useUiTheme';
import ThemeLoading from '../components/ThemeLoading';

// Preview-only records. These are never inserted into Supabase or exposed as published works.
const demoDate = '2026-10-01T00:00:00.000Z';
const demoData: Array<[string,string,string]> = [
  ['Senja di Ujung Kota','Romansa','Tentang dua hati yang selalu bertemu di waktu yang salah, namun tetap memilih untuk tinggal.'],
  ['Langit yang Sama','Romansa','Satu langit, dua perjalanan, dan hal-hal kecil yang membuat kita kembali.'],
  ['Jejak di Kertas','Slice of Life','Di antara halaman dan ingatan, ada cerita yang belum selesai.'],
  ['Ruang di Antara','Drama','Sebuah perjalanan menemukan rumah di antara dua dunia.'],
  ['Sebelum Hujan','Romansa','Ketika langit berubah warna, ada janji yang masih menunggu.'],
  ['Rumah Kedua','Keluarga','Pulang tidak selalu berarti kembali ke tempat yang sama.'],
  ['Kisah yang Tertunda','Drama','Tidak semua perpisahan berarti sebuah akhir.'],
  ['Bunga Terakhir','Fantasi','Di taman yang terlupakan, satu bunga menyimpan harapan.'],
];
const demoBooks:Book[] = demoData.map(([title,genre,synopsis],i)=>({id:`v6-demo-${i}`,slug:`v6-demo-${i}`,title,genre,synopsis,cover_url:null,status:'ongoing',is_published:true,is_featured:i===0,created_at:demoDate,updated_at:demoDate}));

function useLibrary() {
  const [data,setData] = useState<{books:Book[];episodes:EpisodeSummary[]}>({books:[],episodes:[]});
  const [loading,setLoading] = useState(isConfigured);
  const [error,setError] = useState('');
  useEffect(()=>{let active=true;
    if(!isConfigured){setData({books:demoBooks,episodes:[]});setLoading(false);return;}
    getPublicLibrary().then(result=>{if(active)setData(result);}).catch(e=>{if(active)setError(e instanceof Error?e.message:'Gagal memuat perpustakaan.');}).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[]);
  return {...data,loading,error,demo:!isConfigured};
}
const countFor=(episodes:EpisodeSummary[],book:Book)=>episodes.filter(e=>e.book_id===book.id).length;
function Action({children,to,className=''}:{children:React.ReactNode;to:string;className?:string}){return <button className={className} onClick={()=>navigate(to)}>{children}</button>}
function BookmarkButton({book,compact=false}:{book:Book;compact?:boolean}){
  const {has,toggle}=useCollection();
  return <button className={`v6-bookmark ${compact?'compact':''} ${has(book.id)?'saved':''}`} title={has(book.id)?'Hapus dari koleksi':'Simpan ke koleksi'} aria-label={has(book.id)?`Hapus ${book.title} dari koleksi`:`Simpan ${book.title} ke koleksi`} aria-pressed={has(book.id)} onClick={e=>{e.stopPropagation();toggle(book.id);}}>{has(book.id)?<BookmarkCheck size={19}/>:<Bookmark size={19}/>}</button>;
}
function BookCard({book,count,demo,variant='default'}:{book:Book;count:number;demo:boolean;variant?:'default'|'featured'|'horizontal'}) {
  return <article className={`v6-story-card v6-story-${variant}`}>
    <button className="v6-story-open" onClick={()=>navigate(`/cerita/${book.slug}`)} aria-label={`Buka ${book.title}`}><Cover book={book}/></button>
    <BookmarkButton book={book}/>
    <button className="v6-story-meta" onClick={()=>navigate(`/cerita/${book.slug}`)}><strong>{book.title}</strong><small>{book.genre||'Fiksi'}</small>{variant==='default'&&<span>{demo?'Contoh tampilan':count?`${count} Bab`:'Belum ada bab'}</span>}</button>
  </article>;
}
function EmptyLibrary({collection=false}:{collection?:boolean}) {
  return <section className="v6-empty"><img src="/assets/v6/empty-library.webp" alt="Buku terbuka di meja dekat jendela" loading="lazy"/><div className="v6-empty-copy"><h2>{collection?'Koleksimu masih kosong':'Belum ada cerita di sini'}</h2><p>{collection?'Simpan cerita yang kamu sukai melalui ikon penanda pada sampul.':'Mulai dari halaman perpustakaan untuk menemukan cerita yang telah diterbitkan.'}</p><Action to="/cerita" className="v6-button v6-button-dark">Jelajahi cerita <ArrowRight size={17}/></Action></div></section>;
}
function Heading({title,to}:{title:string;to?:string}) {return <div className="v6-section-heading"><h2>{title}</h2>{to&&<Action to={to} className="v6-see-all">Lihat Semua <ChevronRight size={15}/></Action>}</div>}
function readProgress(book:Book) {
  try { const v=JSON.parse(localStorage.getItem(`kk-secure-progress-${book.id}`)||'null');return v&&typeof v.ep==='number'?v.ep:null; } catch {return null;}
}
function Home({books,episodes,demo}:{books:Book[];episodes:EpisodeSummary[];demo:boolean}) {
  const featured=books.filter(b=>b.is_featured);
  const selection=(featured.length?featured:books).slice(0,3);
  const [continueBook,setContinueBook]=useState<Book|undefined>();
  useEffect(()=>{setContinueBook(books.find(b=>!demo&&readProgress(b)!==null));},[books,demo]);
  const continuation=continueBook||books[0];
  const episode=continuation?readProgress(continuation):null;
  return <main className="v6-home">
    <section className="v6-hero"><div className="v6-hero-shade"/><div className="v6-hero-copy"><span className="v6-hero-kicker">✦ &nbsp; KATAKECIL · RUANG BACA</span><h1>Cerita<br/>yang Tinggal<br/>Lebih Lama</h1><p>Temukan kisah yang menemani harimu, dalam kata-kata yang selalu punya tempat untuk kembali.</p><Action to="/cerita" className="v6-button v6-button-gold">Mulai Membaca <ArrowRight size={17}/></Action><span className="v6-hero-dots">✦ &nbsp; · &nbsp; · &nbsp; · &nbsp; ✦</span></div><p className="v6-hero-quote">“Di antara halaman dan senja, selalu ada cerita yang ingin tinggal.”</p></section>
    <div className="v6-home-sections">
      <div className="v6-home-row">
        <section className="v6-continue"><Heading title="Lanjut Membaca" to="/koleksi"/>{continuation?<div className="v6-continue-card"><button className="v6-continue-cover" onClick={()=>navigate(`/cerita/${continuation.slug}`)}><Cover book={continuation} eager/></button><div className="v6-continue-info"><strong>{continuation.title}</strong><span>{episode!==null?`Terakhir di bab ${episode}`:demo?'Contoh cerita':`${countFor(episodes,continuation)} bab tersedia`}</span><div className="v6-continue-progress" aria-label={episode!==null?'Posisi terakhir tersimpan':'Belum ada progres membaca'}><span style={{width:'0%'}}/></div><Action className="v6-continue-action" to={episode!==null?`/baca/${continuation.slug}?episode=${episode}`:`/cerita/${continuation.slug}`}>{episode!==null?'Lanjutkan':'Lihat cerita'} <ArrowRight size={14}/></Action></div></div>:<div className="v6-home-mini-empty">Belum ada bacaan. Jelajahi perpustakaan untuk memulai.</div>}</section>
        <section className="v6-featured"><Heading title="Cerita Pilihan" to="/cerita"/>{selection.length?<div className="v6-featured-grid">{selection.map(b=><BookCard key={b.id} book={b} count={countFor(episodes,b)} demo={demo} variant="featured"/>)}</div>:<p>Belum ada cerita pilihan.</p>}</section>
      </div>
      <section className="v6-newest"><Heading title="Terbaru Ditambahkan" to="/cerita"/>{books.length?<div className="v6-newest-grid">{books.slice(0,4).map(b=><BookCard key={b.id} book={b} count={countFor(episodes,b)} demo={demo} variant="horizontal"/>)}</div>:<EmptyLibrary/>}</section>
      <footer className="v6-footer">KataKecil © {new Date().getFullYear()} <span>Setiap cerita punya tempat untuk kembali.</span></footer>
    </div>
  </main>;
}
function Listing({books,episodes,demo,collection=false}:{books:Book[];episodes:EpisodeSummary[];demo:boolean;collection?:boolean}) {
  const params=new URLSearchParams(window.location.search);
  const [q,setQ]=useState(params.get('q')||'');
  const [filter,setFilter]=useState('Semua');
  const [sort,setSort]=useState('terbaru');
  const input=useRef<HTMLInputElement>(null);
  const {ids}=useCollection();
  useEffect(()=>{
    const sync=()=>{const next=new URLSearchParams(window.location.search);setQ(next.get('q')||'');if(next.get('focus')==='1')requestAnimationFrame(()=>input.current?.focus());};
    sync();window.addEventListener('quiet:navigate',sync);
    return()=>window.removeEventListener('quiet:navigate',sync);
  },[]);
  const genres=useMemo(()=>['Semua',...new Set(books.map(b=>b.genre).filter(Boolean))],[books]);
  const shown=useMemo(()=>{
    const term=q.toLocaleLowerCase('id-ID');
    const results=books.filter(b=>(!collection||ids.includes(b.id))&&(filter==='Semua'||b.genre===filter)&&`${b.title} ${b.synopsis} ${b.genre}`.toLocaleLowerCase('id-ID').includes(term));
    return [...results].sort((a,b)=>sort==='judul'?a.title.localeCompare(b.title,'id'):new Date(b.updated_at).getTime()-new Date(a.updated_at).getTime());
  },[books,ids,collection,filter,q,sort]);
  return <main className="v6-library-page"><div className="v6-library-intro"><h1>{collection?'Koleksi':'Perpustakaan'}</h1><p>{collection?'Cerita yang kamu simpan untuk dibaca kembali.':'Ribuan kata, satu tempat untuk kembali.'}</p></div>
    <div className="v6-library-tools"><div className="v6-library-search"><Search size={19}/><input ref={input} type="search" aria-label="Cari cerita, penulis, atau genre" placeholder="Cari cerita, penulis, atau genre..." value={q} onChange={e=>setQ(e.target.value)}/>{q&&<button aria-label="Hapus pencarian" onClick={()=>setQ('')}><X size={16}/></button>}</div><div className="v6-genre-pills">{genres.map(g=><button key={g} className={filter===g?'selected':''} aria-pressed={filter===g} onClick={()=>setFilter(g)}>{g}</button>)}</div><label className="v6-sort">Urutkan <ChevronDown size={13}/><select aria-label="Urutkan cerita" value={sort} onChange={e=>setSort(e.target.value)}><option value="terbaru">Terbaru</option><option value="judul">Judul A–Z</option></select></label></div>
    {shown.length?<div className="v6-library-grid">{shown.map(b=><BookCard key={b.id} book={b} count={countFor(episodes,b)} demo={demo}/>)}</div>:!q&&filter==='Semua'&&(!books.length||collection)?<EmptyLibrary collection={collection}/>:<div className="v6-filter-empty"><Search size={24}/><h2>Tidak ada cerita yang cocok</h2><p>Coba kata kunci atau genre lain.</p><button onClick={()=>{setQ('');setFilter('Semua')}}>Hapus filter</button></div>}
  </main>;
}
function Detail({book,episodes,demo}:{book:Book;episodes:EpisodeSummary[];demo:boolean}) {
  const rows=episodes.filter(e=>e.book_id===book.id).sort((a,b)=>a.episode_number-b.episode_number);
  const [showAll,setShowAll]=useState(false);
  const image=book.cover_url||fallbackCover(book);
  return <main className="v6-detail-page"><div className="v6-detail-backdrop" style={{backgroundImage:`linear-gradient(90deg,rgba(11,21,38,.93),rgba(11,21,38,.54)),url("${image.replaceAll('"','%22')}")`}}/>
    <div className="v6-detail-content"><Action to="/cerita" className="v6-detail-back"><ArrowLeft size={17}/> Perpustakaan</Action>
      <section className="v6-detail-hero"><div className="v6-detail-cover"><Cover book={book} size="large" eager/><BookmarkButton book={book}/></div><div className="v6-detail-info"><h1>{book.title}</h1><div className="v6-detail-tags"><span>{book.genre||'Fiksi'}</span><span>{book.status==='completed'?'Tamat':book.status==='hiatus'?'Jeda':'Berlangsung'}</span></div><div className="v6-detail-numbers"><span><BookOpen size={16}/>{demo?'Contoh':`${rows.length} Bab`}</span><span><Clock3 size={16}/>{book.status==='completed'?'Selesai':'Bersambung'}</span></div><p>{book.synopsis||'Sinopsis belum ditambahkan oleh penulis.'}</p><div className="v6-detail-actions">{rows.length&&!demo?<Action className="v6-button v6-button-gold" to={`/baca/${book.slug}`}>Mulai Membaca <ArrowRight size={17}/></Action>:<button className="v6-button v6-button-gold" disabled>Belum ada bab terbit</button>}<Action to="/koleksi" className="v6-button v6-button-outline"><Bookmark size={16}/> Koleksi</Action></div></div></section>
      <div className="v6-detail-bottom"><section className="v6-chapters"><div className="v6-chapters-title"><h2>Daftar Bab</h2><span>Urut: Terbaru tersedia</span></div>{rows.length?rows.slice(0,showAll?undefined:18).map((ep,i)=><button className="v6-chapter" key={ep.episode_number} onClick={()=>navigate(`/baca/${book.slug}?episode=${ep.episode_number}`)}><span>{i+1}.</span><div><strong>{ep.title}</strong><small>{ep.arc_title||`Bab ${ep.episode_number}`}</small></div><span className="v6-chapter-date">{ep.release_at?new Date(ep.release_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):''}</span><ChevronRight size={16}/></button>):<div className="v6-no-chapters">{demo?'Ini hanya pratinjau visual. Hubungkan Supabase untuk membaca cerita asli.':'Bab pertama belum diterbitkan.'}</div>}{rows.length>18&&!showAll&&<button className="v6-show-chapters" onClick={()=>setShowAll(true)}>Lihat semua bab <ArrowRight size={16}/></button>}</section>
      <aside className="v6-detail-extra"><h2>Informasi</h2><dl><dt>Genre</dt><dd>{book.genre||'Fiksi'}</dd><dt>Status</dt><dd>{book.status==='completed'?'Tamat':'Berjalan'}</dd><dt>Diperbarui</dt><dd>{new Date(book.updated_at).toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})}</dd><dt>Total bab</dt><dd>{demo?'Demo':rows.length}</dd></dl><p>Setiap cerita punya tempat untuk kembali.</p></aside></div>
    </div>
  </main>;
}
function About(){return <main className="v6-about"><div><span>✦ TENTANG KATAKECIL</span><h1>Cerita yang terasa dekat, bahkan setelah halaman terakhir.</h1><p>KataKecil adalah ruang baca pribadi untuk cerita yang ditulis dengan sepenuh hati. Di sini, pembaca bisa menemukan kisah, menyimpan favorit, dan menikmati setiap bab tanpa gangguan.</p><Action to="/cerita" className="v6-button v6-button-gold">Masuk perpustakaan <ArrowRight size={16}/></Action></div></main>}
export default function PublicLibrary({path}:{path:string}) {
  const {books,episodes,loading,error,demo}=useLibrary();
  const {theme}=useUiTheme();
  const slug=path.startsWith('/cerita/')?decodeURIComponent(path.split('/')[2]||''):null;
  const book=slug?books.find(b=>b.slug===slug):undefined;
  useEffect(()=>{document.title=`${book?.title?`${book.title} · `:path==='/cerita'?'Perpustakaan · ':path==='/koleksi'?'Koleksi · ':''}KataKecil`;},[book?.title,path]);
  return <div className="site-shell v6-public" data-kk-theme={theme}><PublicHeader path={path}/>
    {demo&&<div className="v6-demo-notice"><Sparkles size={14}/> Mode pratinjau: delapan cerita di layar adalah contoh visual, bukan konten terbit.</div>}
    {error&&<div className="v6-error" role="alert">{error}</div>}
    {loading?<ThemeLoading context="public" text="Membuka perpustakaan…"/>:path==='/tentang'?<About/>:path==='/koleksi'?<Listing books={books} episodes={episodes} demo={demo} collection/>:slug?(book?<Detail book={book} episodes={episodes} demo={demo}/>:<div className="v6-missing"><h1>Cerita tidak ditemukan.</h1><Action to="/cerita" className="v6-button v6-button-gold">Kembali ke perpustakaan</Action></div>):path==='/cerita'?<Listing books={books} episodes={episodes} demo={demo}/>:<Home books={books} episodes={episodes} demo={demo}/>}
  </div>;
}
