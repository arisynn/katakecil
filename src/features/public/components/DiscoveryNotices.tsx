import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Bell, CalendarClock } from 'lucide-react';
import type { Book, EpisodeSummary } from '../../../data/library';
import type { UpcomingChapter } from '../../../data/publicSchedule';
import { navigate } from '../../../utils/nav';

type Notice = { id: string; kicker: string; title: string; detail: string; date: number; slug: string; kind: 'release' | 'schedule' };
export function buildDiscoveryNotices(books: Book[], episodes: EpisodeSummary[], schedules: UpcomingChapter[], now = Date.now()): Notice[] {
  const available = new Map(books.filter(book => book.is_published && !book.deleted_at).map(book => [book.id, book]));
  const upcoming: Notice[] = schedules.flatMap(item => {
    const book = available.get(item.book_id);
    const date = Date.parse(item.release_at);
    if (!book || !Number.isFinite(date) || date <= now) return [];
    return [{ id: `schedule:${book.id}:${date}`, kicker: 'JADWAL BAB BERIKUTNYA', title: book.title, detail: `Bab berikutnya dijadwalkan ${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(date)} WIB`, date, slug: book.slug, kind: 'schedule' as const }];
  });
  const recent: Notice[] = episodes.flatMap(episode => {
    const book = available.get(episode.book_id);
    const date = Date.parse(episode.release_at ?? '');
    if (!book || !Number.isFinite(date) || date > now || now - date > 30 * 86400000) return [];
    return [{ id: `release:${book.id}:${episode.episode_number}`, kicker: 'BAB BARU TELAH TERBIT', title: book.title, detail: `${episode.title} · Bab ${episode.episode_number}`, date, slug: book.slug, kind: 'release' as const }];
  });
  const seen = new Set<string>();
  return [...upcoming.sort((a,b)=>a.date-b.date), ...recent.sort((a,b)=>b.date-a.date)]
    .filter(item => { const key = `${item.kind}:${item.slug}`; if(seen.has(key)) return false; seen.add(key); return true; })
    .slice(0, 4);
}
export default function DiscoveryNotices({ books, episodes, schedules }: { books: Book[]; episodes: EpisodeSummary[]; schedules: UpcomingChapter[] }) {
  const notices = useMemo(() => buildDiscoveryNotices(books, episodes, schedules), [books, episodes, schedules]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<{x:number;y:number}|null>(null);
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => { const media=window.matchMedia('(prefers-reduced-motion: reduce)'); const change=()=>setReduced(media.matches);media.addEventListener('change',change);return()=>media.removeEventListener('change',change); }, []);
  useEffect(() => { setIndex(i => notices.length ? Math.min(i, notices.length-1) : 0); }, [notices.length]);
  useEffect(() => { if (notices.length < 2 || paused || reduced) return; const timer=window.setInterval(()=>{ if(!document.hidden) setIndex(i=>(i+1)%notices.length); }, 7500);return()=>window.clearInterval(timer); }, [notices.length,paused,reduced]);
  if (!notices.length) return null;
  const notice=notices[index];
  return <section className="kk-v7-notices" aria-label="Kabar terbaru KataKecil" onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocusCapture={()=>setPaused(true)}
    onTouchStart={event=>{const t=event.touches[0];touch.current={x:t.clientX,y:t.clientY};setPaused(true);}}
    onTouchEnd={event=>{if(!touch.current)return;const t=event.changedTouches[0];const dx=t.clientX-touch.current.x;const dy=t.clientY-touch.current.y;touch.current=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.3&&notices.length>1)setIndex(i=>(i+(dx<0?1:-1)+notices.length)%notices.length);}}>
    <div className="kk-v7-notice-card" aria-live="off">
      <div className="kk-v7-notice-icon">{notice.kind==='schedule'?<CalendarClock size={22}/>:<Bell size={22}/>}</div>
      <div className="kk-v7-notice-body"><span className="kk-v7-kicker">{notice.kicker}</span><h2>{notice.title}</h2><p>{notice.detail}</p>
        <button type="button" className="kk-v7-notice-action" onClick={()=>navigate(`/cerita/${notice.slug}`)}>Lihat cerita <ArrowRight size={17}/></button>
      </div>
    </div>
    {notices.length>1&&<nav className="kk-v7-notice-dots" aria-label="Pilih kabar terbaru">{notices.map((item,i)=><button type="button" key={item.id} aria-label={`Kabar ${i+1}: ${item.title}`} aria-current={i===index?'true':undefined} className={i===index?'active':''} onClick={()=>{setIndex(i);setPaused(true);}}/>)}</nav>}
  </section>;
}
