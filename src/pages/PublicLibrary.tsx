import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, Clock3, Feather, Library, Menu, Search, ShieldCheck, Sparkles, X } from 'lucide-react';
import { Cover } from '../components/Cover';
import { getPublicLibrary, type Book, type EpisodeSummary } from '../data/library';
import { isConfigured } from '../data/supabase';
import { navigate } from '../utils/nav';

const date = new Date('2026-10-01').toISOString();
// Visually labeled examples ONLY, never treated as real published manuscripts.
const examples: Book[] = [
  {id:'contoh-senja',slug:'contoh-senja',title:'Di Ujung Senja',synopsis:'Sebuah kisah tentang hal-hal yang tertinggal, perjalanan panjang, dan keberanian untuk pulang.',genre:'Drama',status:'ongoing',cover_url:null,is_published:true,is_featured:true,created_at:date,updated_at:date},
  {id:'contoh-bulan',slug:'contoh-bulan',title:'Surat untuk Bulan',synopsis:'Beberapa rahasia lebih mudah diceritakan kepada langit daripada kepada manusia.',genre:'Romansa',status:'completed',cover_url:null,is_published:true,is_featured:false,created_at:date,updated_at:date},
  {id:'contoh-hujan',slug:'contoh-hujan',title:'Setelah Hujan',synopsis:'Di sebuah kota kecil, seseorang menemukan permulaan baru di tempat yang paling tak terduga.',genre:'Fantasi',status:'ongoing',cover_url:null,is_published:true,is_featured:false,created_at:date,updated_at:date},
];
function useLibrary() {
  const [data, setData] = useState<{books:Book[];episodes:EpisodeSummary[]}>({books:[],episodes:[]});
  const [loading, setLoading] = useState(isConfigured);
  const [error, setError] = useState('');
  useEffect(() => { let active=true; if (!isConfigured) { setData({books:examples,episodes:[]});return; }
    getPublicLibrary().then(r=> {if(active) setData(r);}).catch(e=> {if(active) setError(e.message);}).finally(()=>{if(active) setLoading(false);});
    return ()=>{active=false;};
  }, []);
  return {...data, loading, error, demo:!isConfigured};
}
function LinkButton({to,children,className = ''}:{to:string;children:React.ReactNode;className?:string}) {
  return <button className={className} onClick={()=>navigate(to)}>{children}</button>;
}
function Header() {
  const [menu,setMenu]=useState(false);
  return <header className="site-header"><div className="site-header-inner">
    <LinkButton to="/" className="site-brand"><span className="brand-mark"><Feather size={20}/></span><span>KataKecil<span className="brand-dot">.</span></span></LinkButton>
    <nav className={menu?'site-nav site-nav-open':'site-nav'} aria-label="Navigasi utama">
      <LinkButton to="/" className="nav-item" >Beranda</LinkButton><LinkButton to="/cerita" className="nav-item">Perpustakaan</LinkButton><LinkButton to="/tentang" className="nav-item">Tentang Penulis</LinkButton>
    </nav>
    <div className="site-nav-right"><LinkButton to="/studio" className="site-studio-link">Studio Penulis <ArrowRight size={15}/></LinkButton><button aria-label={menu?'Tutup menu':'Buka menu'} className="mobile-menu-toggle" onClick={()=>setMenu(!menu)}>{menu?<X size={22}/>:<Menu size={22}/>}</button></div>
  </div></header>;
}
function SectionHeading({eyebrow,title,link}:{eyebrow:string;title:string;link?:string}) {
  return <div className="section-heading"><div><div className="eyebrow">{eyebrow}</div><h2>{title}</h2></div>{link&&<LinkButton to={link} className="text-link">Lihat semua <ArrowRight size={17}/></LinkButton>}</div>;
}
function BookCard({book,count,demo}:{book:Book;count:number;demo?:boolean}) {
  return <button className="library-card" onClick={()=>navigate(`/cerita/${book.slug}`)}>
    <Cover book={book}/><div className="card-copy"><span className="card-genre">{book.genre}</span><h3>{book.title}</h3><p>{book.synopsis}</p><div className="card-bottom"><span>{demo?'Contoh tampilan':count?`${count} episode`:'Segera hadir'}</span><span><ArrowRight size={17}/></span></div></div>
  </button>;
}
function EmptyLibrary() {return <div className="library-empty"><Library size={27}/><h3>Rak buku ini menanti cerita pertamanya.</h3><p>Setelah kamu memublikasikan sebuah novel di Studio Penulis, karyanya akan muncul di sini secara otomatis.</p><LinkButton className="btn-primary" to="/studio">Buka Studio <ArrowRight size={17}/></LinkButton></div>;}
function Hero({book,demo,count}:{book?:Book;demo:boolean;count:number}) {
  return <section className="hero"><div className="hero-grain"/><div className="hero-inner"><div className="hero-copy">
    <span className="hero-eyebrow"><span className="hero-line"/> PERPUSTAKAAN CERITA PRIBADI</span>
    <h1>Setiap cerita,<br/><i>punya tempat</i><br/>untuk pulang.</h1>
    <p>Ruang kecil untuk dunia-dunia yang lahir dari kata. Jelajahi cerita, temukan yang dekat dengan hatimu, dan bacalah tanpa terburu-buru.</p>
    <div className="hero-actions"><LinkButton to="/cerita" className="btn-primary">Jelajahi cerita <ArrowRight size={18}/></LinkButton><LinkButton to="/tentang" className="btn-quiet">Kenali penulis <ChevronRight size={17}/></LinkButton></div>
    <div className="hero-note"><span>✦</span> Dibuat untuk menikmati cerita, satu halaman demi satu halaman.</div>
  </div><div className="hero-art"><div className="hero-halo"/><div className="hero-doodles">✧<br/>⋆</div>{book?<div className="hero-cover" onClick={()=>navigate(`/cerita/${book.slug}`)}><Cover book={book} size="large"/><div className="hero-cover-label">{demo?'TAMPILAN CONTOH':`${count} EPISODE TERSEDIA`}</div></div>:<div className="hero-placeholder"><BookOpen size={84} strokeWidth={1}/><span>Cerita berikutnya bermula di sini</span></div>}<div className="hero-quote">“Kadang satu halaman cukup<br/>untuk membuat kita tinggal.”</div></div></div></section>;
}
function Home({books,episodes,demo}:{books:Book[];episodes:EpisodeSummary[];demo:boolean}) {
 const selected = books.find(b=>b.is_featured) || books[0];
 const episodeCounts = (id:string)=>episodes.filter(e=>e.book_id===id).length;
 return <><Hero book={selected} demo={demo} count={selected?episodeCounts(selected.id):0}/>
 <main className="public-main"><section className="content-section"><SectionHeading eyebrow="DARI RAK CERITA" title="Temukan bacaanmu" link="/cerita"/>
  {books.length?<div className="book-grid">{books.slice(0,4).map(book=><BookCard key={book.id} book={book} count={episodeCounts(book.id)} demo={demo}/>)}</div>:<EmptyLibrary/>}
 </section><section className="about-strip"><div className="about-seal"><Feather size={34} strokeWidth={1.2}/></div><div><span className="eyebrow">SEDIKIT TENTANG RUANG INI</span><h2>Satu penulis. Banyak dunia.</h2><p>Di sini, setiap karya mendapat ruang untuk tumbuh—dari episode pertama sampai halaman terakhir.</p></div><LinkButton to="/tentang" className="btn-outline">Cerita di baliknya <ArrowRight size={16}/></LinkButton></section>
 <div className="site-footer"><span>KataKecil © {new Date().getFullYear()}</span><span>Dibuat untuk cerita yang layak ditemani.</span></div></main></>;
}
function Listing({books,episodes,demo}:{books:Book[];episodes:EpisodeSummary[];demo:boolean}) {
 const [q,setQ]=useState(''); const [filter,setFilter]=useState('Semua');
 const genres=useMemo(()=>['Semua',...new Set(books.map(b=>b.genre).filter(Boolean))],[books]);
 const list=books.filter(b=>(filter==='Semua'||b.genre===filter)&&(`${b.title} ${b.synopsis}`.toLowerCase().includes(q.toLowerCase())));
 return <main className="public-main inner-page"><div className="eyebrow">JELAJAHI DUNIA-DUNIA KECIL</div><h1 className="page-heading">Perpustakaan <i>cerita.</i></h1><p className="page-intro">Setiap kisah punya pintunya sendiri. Mungkin salah satunya sedang menunggumu.</p>
  <div className="listing-toolbar"><div className="search-field"><Search size={19}/><input aria-label="Cari judul atau sinopsis" value={q} onChange={e=>setQ(e.target.value)} placeholder="Cari judul atau kata kunci..."/></div><div className="chip-group">{genres.map(g=><button key={g} onClick={()=>setFilter(g)} className={filter===g?'chip chip-active':'chip'}>{g}</button>)}</div></div>
  {list.length?<div className="book-grid book-grid-list">{list.map(b=><BookCard key={b.id} book={b} count={episodes.filter(e=>e.book_id===b.id).length} demo={demo}/>)}</div>:books.length?<div className="filter-empty">Tidak ada cerita dengan pencarian tersebut.</div>:<EmptyLibrary/>}
 </main>;
}
function Detail({book,episodes,demo}:{book:Book;episodes:EpisodeSummary[];demo:boolean}) {
  const rows=episodes.filter(e=>e.book_id===book.id).sort((a,b)=>a.episode_number-b.episode_number);
  const [showAll,setShowAll]=useState(false);
  return <main className="public-main inner-page detail-page"><LinkButton className="breadcrumb" to="/cerita"><ArrowLeft size={16}/> Kembali ke perpustakaan</LinkButton>
  <section className="detail-top"><div className="detail-art"><Cover book={book} size="large"/></div><div className="detail-info"><span className="eyebrow">KARYA PILIHAN · {book.genre.toUpperCase()}</span><h1>{book.title}</h1><div className="detail-tags"><span>{book.genre}</span><span>{book.status==='completed'?'Tamat':book.status==='hiatus'?'Jeda':'Berlangsung'}</span><span>{demo?'Contoh tampilan':`${rows.length} episode`}</span></div><h3>Tentang cerita ini</h3><p>{book.synopsis||'Sinopsis belum ditambahkan oleh penulis.'}</p>
   <div className="detail-actions">{rows.length&&!demo?<button className="btn-primary" onClick={()=>navigate(`/baca/${book.slug}`)}>Mulai membaca <BookOpen size={18}/></button>:<button className="btn-primary" disabled>Belum ada episode <Clock3 size={17}/></button>}<button className="btn-outline" onClick={()=>navigate('/cerita')}>Cerita lainnya <ArrowRight size={16}/></button></div>
  </div></section>
  <section className="episode-section"><SectionHeading eyebrow="PERJALANAN CERITA" title="Daftar episode"/><div className="episode-list">
    {rows.length?rows.slice(0,showAll?undefined:16).map(ep=><button key={ep.episode_number} className="episode-row" onClick={()=>navigate(`/baca/${book.slug}?episode=${ep.episode_number}`)}><div className="episode-num">{String(ep.episode_number).padStart(2,'0')}</div><div className="episode-row-body"><strong>{ep.title}</strong><small>{ep.arc_title||'Episode'}</small></div><span className="episode-chevron"><ChevronRight size={19}/></span></button>):<div className="episode-none">{demo?'Ini hanya contoh tata letak. Karya sungguhan akan muncul setelah Supabase dikonfigurasi.':'Episode pertama belum diterbitkan.'}</div>}
    {rows.length>16&&!showAll&&<button className="show-more" onClick={()=>setShowAll(true)}>Tampilkan semua episode <ArrowRight size={16}/></button>}
  </div></section></main>;
}
function About() { return <main className="public-main inner-page about-page"><div className="about-flower"><Feather size={48} strokeWidth={1.1}/></div><div className="eyebrow">DARI PENULIS, UNTUK PEMBACA</div><h1 className="page-heading">Halo, selamat <i>datang.</i></h1><p>Ini adalah ruang untuk cerita-cerita yang kutulis. Beberapa mungkin akan terasa akrab, beberapa lainnya membawa kita ke dunia yang sama sekali berbeda.</p><p>Aku ingin setiap pembaca bisa menemukan cerita dengan mudah dan menikmatinya senyaman mungkin—tanpa kebisingan di sekelilingnya.</p><p className="about-signature">Sampai jumpa di halaman berikutnya. ✦</p><LinkButton to="/cerita" className="btn-primary">Jelajahi perpustakaan <ArrowRight size={17}/></LinkButton></main>; }
export default function PublicLibrary({path}:{path:string}) {
 const {books,episodes,loading,error,demo}=useLibrary();
 const slug=path.startsWith('/cerita/')?decodeURIComponent(path.split('/')[2]||''):null;
 const book=slug?books.find(b=>b.slug===slug):undefined;
 useEffect(()=>{document.title = `${book?.title ? book.title + ' · ' : path==='/cerita'?'Perpustakaan · ':path==='/tentang'?'Tentang Penulis · ':''}KataKecil`;},[book?.title,path]);
 return <div className="site-shell"><Header/>{demo&&<div className="demo-banner"><Sparkles size={15}/> Mode contoh desain · Sambungkan Supabase untuk menampilkan novel aslimu.</div>}
 {error&&<div className="error-banner">{error}</div>}
 {loading?<main className="public-main page-loading"><div className="loading-orb"/><p>Sedang membuka rak cerita…</p></main>:path==='/tentang'?<About/>:slug?(book?<Detail book={book} episodes={episodes} demo={demo}/>:<main className="public-main inner-page"><h1 className="page-heading">Cerita tidak ditemukan.</h1><LinkButton to="/cerita" className="btn-primary">Kembali ke perpustakaan</LinkButton></main>):path==='/cerita'?<Listing books={books} episodes={episodes} demo={demo}/>:<Home books={books} episodes={episodes} demo={demo}/>}
 </div>;
}
