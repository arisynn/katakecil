import {useEffect,useMemo,useState} from 'react';
import BrandIcon from '../../../components/BrandIcon';
import {Cover} from '../../../components/Cover';
import type {Book,EpisodeSummary} from '../../../data/library';
import {formatUpcomingChapter,getPublicUpcomingChapters,type UpcomingChapter} from '../../../data/publicSchedule';
import {useReaderDialogFocus} from '../../../hooks/useReaderDialogFocus';
import {navigate} from '../../../utils/nav';
import {readerHeading} from '../../../utils/readerHeading';

export default function BookDialog({book,episodes,progress,onClose,demo=false}:{book:Book;episodes:EpisodeSummary[];progress:number|null;onClose:()=>void;demo?:boolean}){
 const ref=useReaderDialogFocus<HTMLElement>(onClose);
 const [expanded,setExpanded]=useState(false),[query,setQuery]=useState(''),[limit,setLimit]=useState(50);
 const [next,setNext]=useState<UpcomingChapter|null>(null),[loading,setLoading]=useState(!demo);
 const rows=useMemo(()=>episodes.filter(ep=>ep.book_id===book.id).sort((a,b)=>a.episode_number-b.episode_number),[book.id,episodes]);
 const filtered=useMemo(()=>rows.filter(ep=>`${ep.episode_number} ${ep.title}`.toLocaleLowerCase('id').includes(query.toLocaleLowerCase('id').trim())),[rows,query]);
 useEffect(()=>{
  const old=document.body.style.overflow;document.body.style.overflow='hidden';
  return()=>{document.body.style.overflow=old;};
 },[]);
 useEffect(()=>{
  if(demo)return;let active=true;
  const load=()=>void getPublicUpcomingChapters().then(result=>{if(active)setNext(result.find(row=>row.book_id===book.id)??null);}).catch(()=>{if(active)setNext(null);}).finally(()=>{if(active)setLoading(false);});
  load();window.addEventListener('online',load);
  return()=>{active=false;window.removeEventListener('online',load);};
 },[book.id,demo]);
 const status=book.status==='completed'?'Tamat':book.status==='hiatus'?'Jeda':'Bersambung';
 return <div className="book-dialog-scrim" onClick={onClose}><section ref={ref} role="dialog" aria-modal="true" aria-labelledby="book-dialog-title" className="book-dialog" onClick={event=>event.stopPropagation()}>
  <header className="book-dialog-heading"><div className="book-dialog-cover"><Cover book={book} eager/></div><div className="book-dialog-title"><span>{book.genre||'Fiksi'} · {status}</span><h2 id="book-dialog-title">{book.title}</h2><small>{rows.length} episode terbit</small></div><button type="button" className="book-dialog-close" onClick={onClose} aria-label="Tutup informasi buku"><BrandIcon name="close" size={19}/></button></header>
  <div className="book-dialog-info"><p className={expanded?'':'is-clamped'}>{book.synopsis||'Sinopsis belum tersedia.'}</p>{book.synopsis.length>160&&<button type="button" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{expanded?'Ringkas':'Selengkapnya'}</button>}</div>
  <div className="book-dialog-schedule" role="status"><BrandIcon name="calendar-clock" size={17}/><div><strong>Update berikutnya</strong><span>{loading?'Memuat jadwal…':next?formatUpcomingChapter(next):book.status==='completed'?'Cerita sudah tamat.':'Jadwal berikutnya belum tersedia.'}</span></div></div>
  <div className="book-dialog-list-heading"><h3>Daftar episode</h3><span>{rows.length}</span></div>
  {rows.length>12&&<label className="book-dialog-search"><BrandIcon name="search" size={16}/><input type="search" aria-label="Cari episode buku" placeholder="Nomor atau judul episode" value={query} onChange={event=>{setQuery(event.target.value);setLimit(50);}}/></label>}
  <div className="book-dialog-episodes" aria-label="Episode terbit">
   {filtered.slice(0,limit).map(ep=><button type="button" className="book-dialog-episode" key={ep.episode_number} aria-label={`Buka ${ep.episode_number===0?'prolog':`episode ${ep.episode_number}`}: ${ep.title}`} onClick={()=>{onClose();navigate(`/baca/${book.slug}?episode=${ep.episode_number}`);}}><span className="book-dialog-number">{ep.episode_number===0?'P':String(ep.episode_number).padStart(2,'0')}</span><span className="book-dialog-episode-title"><strong>{readerHeading(ep.title,ep.episode_number).title||`Bab ${ep.episode_number}`}</strong>{progress===ep.episode_number&&<small>Terakhir dibaca</small>}</span><BrandIcon name="chevron-right" size={16}/></button>)}
   {!filtered.length&&<p className="book-dialog-empty">{query?'Episode tidak ditemukan.':demo?'Ini sampul contoh. Cerita asli memerlukan koneksi ke Library.':'Belum ada episode terbit.'}</p>}
   {filtered.length>limit&&<button type="button" className="book-dialog-more" onClick={()=>setLimit(value=>value+50)}>Tampilkan episode berikutnya</button>}
  </div>
 </section></div>;
}
