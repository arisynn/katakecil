import BrandIcon from '../../../components/BrandIcon';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { Book, EpisodeSummary } from '../../../data/library';
import type { UpcomingChapter } from '../../../data/publicSchedule';
import { isActiveAnnouncement, type PublicAnnouncement } from '../../../data/announcements';
import { navigate } from '../../../utils/nav';

type Notice = {
  id: string; kicker: string; title: string; detail: string;
  date: number; slug?: string; kind: 'announcement' | 'release' | 'schedule';
};
/** Public-safe selector. Never infer future manuscript titles from schedules. */
export function buildDiscoveryNotices(
  books: Book[], episodes: EpisodeSummary[], schedules: UpcomingChapter[],
  now = Date.now(), announcements: PublicAnnouncement[] = [],
): Notice[] {
  const available = new Map(books.filter(book => book.is_published && !book.deleted_at).map(book => [book.id, book]));
  const editorial: Notice[] = announcements.flatMap(item => {
    if (!isActiveAnnouncement(item, now)) return [];
    const book = item.book_id ? available.get(item.book_id) : undefined;
    if (item.book_id && !book) return []; // Do not link to hidden books.
    return [{ id: `announcement:${item.id}`, kicker: 'PENGUMUMAN KATAKECIL',
      title: item.title, detail: item.body, date: Date.parse(item.starts_at),
      slug: book?.slug, kind: 'announcement' as const }];
  }).sort((a,b)=>b.date-a.date);
  const upcoming: Notice[] = schedules.flatMap(item => {
    const book = available.get(item.book_id);
    const date = Date.parse(item.release_at);
    if (!book || !Number.isFinite(date) || date <= now) return [];
    return [{ id: `schedule:${book.id}:${date}`, kicker: 'JADWAL BAB BERIKUTNYA',
      title: book.title,
      detail: `Bab berikutnya dijadwalkan ${new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(date)} WIB`,
      date, slug: book.slug, kind: 'schedule' as const }];
  });
  const recent: Notice[] = episodes.flatMap(episode => {
    const book = available.get(episode.book_id);
    const date = Date.parse(episode.release_at ?? '');
    if (!book || !Number.isFinite(date) || date > now || now - date > 30 * 86400000) return [];
    return [{ id: `release:${book.id}:${episode.episode_number}`, kicker: 'BAB BARU TELAH TERBIT',
      title: book.title, detail: `${episode.title} · Bab ${episode.episode_number}`,
      date, slug: book.slug, kind: 'release' as const }];
  });
  const seen = new Set<string>();
  return [...editorial, ...upcoming.sort((a,b)=>a.date-b.date), ...recent.sort((a,b)=>b.date-a.date)]
    .filter(item => {
      const key = item.kind === 'announcement' ? item.id : `${item.kind}:${item.slug}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 5);
}
export default function DiscoveryNotices({ books, episodes, schedules, announcements = [] }: {
  books: Book[]; episodes: EpisodeSummary[]; schedules: UpcomingChapter[]; announcements?: PublicAnnouncement[];
}) {
  const notices = useMemo(() => buildDiscoveryNotices(books, episodes, schedules, Date.now(), announcements), [books, episodes, schedules, announcements]);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touch = useRef<{x:number;y:number}|null>(null);
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const change = () => setReduced(media.matches);
    media.addEventListener('change', change);
    return () => media.removeEventListener('change', change);
  }, []);
  useEffect(() => { setIndex(i => notices.length ? Math.min(i, notices.length - 1) : 0); }, [notices.length]);
  useEffect(() => {
    if (notices.length < 2 || paused || reduced) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setIndex(i => (i + 1) % notices.length);
    }, 7500);
    return () => window.clearInterval(timer);
  }, [notices.length, paused, reduced]);
  if (!notices.length) return null;
  const notice = notices[index];
  const move = (direction: number) => {
    if (notices.length < 2) return;
    setIndex(i => (i + direction + notices.length) % notices.length);
    setPaused(true);
  };
  return <section className="kk-v7-notices" aria-label="Kabar terbaru KataKecil"
    onKeyDown={event => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        move(event.key === 'ArrowRight' ? 1 : -1);
      }
    }}
    onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
    onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
    onTouchStart={event => { const t = event.touches[0]; touch.current = { x: t.clientX, y: t.clientY }; setPaused(true); }}
    onTouchEnd={event => {
      if (!touch.current) return;
      const t = event.changedTouches[0];
      const dx = t.clientX - touch.current.x;
      const dy = t.clientY - touch.current.y;
      touch.current = null;
      if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.3 && notices.length > 1)
        move(dx < 0 ? 1 : -1);
      if (Math.abs(dx) <= 45 || Math.abs(dx) <= Math.abs(dy) * 1.3) setPaused(false);
    }}
    onTouchCancel={() => { touch.current = null; setPaused(false); }}>
    <div className="kk-v7-notice-card" aria-live="off">
      <div className="kk-v7-notice-icon">{notice.kind === 'announcement' ? <BrandIcon name="megaphone" size={22}/> : notice.kind === 'schedule' ? <BrandIcon name="calendar-clock" size={22}/> : <BrandIcon name="bell" size={22}/>}</div>
      <div className="kk-v7-notice-body"><span className="kk-v7-kicker">{notice.kicker}</span>
        <h2>{notice.title}</h2>{notice.detail && <p>{notice.detail}</p>}
        {notice.slug && <button type="button" className="kk-v7-notice-action" onClick={() => navigate(`/cerita/${notice.slug}`)}>
          Lihat cerita <BrandIcon name="arrow-right" size={17}/>
        </button>}
      </div>
    </div>
    {notices.length > 1 && <nav className="kk-v7-notice-dots" aria-label="Pilih kabar terbaru">
      {notices.map((item, i) => <button type="button" key={item.id} aria-label={`Kabar ${i+1}: ${item.title}`}
        aria-current={i === index ? 'true' : undefined} className={i === index ? 'active' : ''}
        onClick={() => { setIndex(i); setPaused(true); }}/>)}</nav>}
  </section>;
}
