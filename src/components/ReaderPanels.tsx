import BrandIcon from './BrandIcon';
import React, { useMemo, useState } from 'react';
import type { Bookmark, Chapter, TextAnchor, ThemeColors } from '../types/reader';
import { useReaderDialogFocus } from '../hooks/useReaderDialogFocus';
import { readerHeading } from '../utils/readerHeading';

interface ContentsProps {
  onClose: () => void;
  chapters: Chapter[];
  currentChapterId: string;
  bookmarks: Bookmark[];
  completedEpisodeNumbers?: number[];
  onChapter: (chapter: Chapter) => void;
  onBookmark: (anchor: TextAnchor) => void;
  onDeleteBookmark: (id: string) => void;
  theme: ThemeColors;
}

/** Secure index contains metadata only. Never attempt to fetch unpublished text here. */
export function ContentsPanel({
  onClose, chapters, currentChapterId, bookmarks, completedEpisodeNumbers = [], onChapter,
  onBookmark, onDeleteBookmark, theme,
}: ContentsProps) {
  const dialogRef = useReaderDialogFocus<HTMLElement>(onClose);
  const [tab, setTab] = useState<'contents' | 'bookmarks'>('contents');
  const [filter, setFilter] = useState('');
  const visibleChapters = useMemo(() => {
    const query = filter.trim().toLocaleLowerCase('id');
    if (!query) return chapters;
    return chapters.filter((chapter, index) => {
      const number = String(chapter.displayNumber ?? /^secure-episode-(\d+)-part-0$/.exec(chapter.id)?.[1] ?? index + 1);
      return chapter.title.toLocaleLowerCase('id').includes(query)
        || number.includes(query)
        || (chapter.arc ?? '').toLocaleLowerCase('id').includes(query);
    });
  }, [chapters, filter]);

  return <div className="panel-scrim v610-panel-scrim" onClick={onClose} role="presentation">
    <aside ref={dialogRef} className="drawer-panel v610-drawer" role="dialog" aria-modal="true" aria-label="Daftar isi dan penanda" style={{ background: theme.bg, color: theme.text }} onClick={event => event.stopPropagation()}>
      <div className="panel-heading" style={{ borderColor: theme.border }}>
        <div><div className="panel-eyebrow">KATAKECIL READER</div><h2>Daftar Isi</h2></div>
        <button type="button" className="control-icon" aria-label="Tutup daftar isi" data-reader-autofocus onClick={onClose}><BrandIcon name="close" size={20} /></button>
      </div>
      <div className="panel-tabs" style={{ borderColor: theme.border }} role="tablist" aria-label="Konten panel" onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'contents':event.key==='End'?'bookmarks':tab==='contents'?'bookmarks':'contents';setTab(next);document.getElementById(`kk-tab-${next}`)?.focus();}}>
        <button type="button" role="tab" id="kk-tab-contents" aria-controls="kk-contents-panel" tabIndex={tab==='contents'?0:-1} aria-selected={tab === 'contents'} className={tab === 'contents' ? 'selected' : ''} onClick={() => setTab('contents')}><BrandIcon name="book-open" size={17} /> Bab</button>
        <button type="button" role="tab" id="kk-tab-bookmarks" aria-controls="kk-contents-panel" tabIndex={tab==='bookmarks'?0:-1} aria-selected={tab === 'bookmarks'} className={tab === 'bookmarks' ? 'selected' : ''} onClick={() => setTab('bookmarks')}><BrandIcon name="bookmark" size={17} /> Penanda ({bookmarks.length})</button>
      </div>
      {tab === 'contents' && <div className="v610-chapter-filter">
        <BrandIcon name="search" size={17} aria-hidden="true" />
        <input type="search" value={filter} onChange={event => setFilter(event.target.value)} placeholder="Cari judul atau nomor bab" aria-label="Cari judul atau nomor bab" />
      </div>}
      <div className="panel-list" id="kk-contents-panel" aria-labelledby={`kk-tab-${tab}`} role="tabpanel">
        {tab === 'contents' && (visibleChapters.length ? visibleChapters.map(chapter => {
          const originalIndex = chapters.findIndex(item => item.id === chapter.id);
          const number = String(chapter.displayNumber ?? /^secure-episode-(\d+)-part-0$/.exec(chapter.id)?.[1] ?? originalIndex + 1);
          const active = currentChapterId === chapter.id;
          const heading = readerHeading(chapter.title, chapter.displayNumber ?? Number(number));
          const metadata = [
            chapter.wordCount > 0 ? `${chapter.wordCount.toLocaleString('id-ID')} kata` : null,
            chapter.estimatedMinutes > 0 ? `${chapter.estimatedMinutes} menit` : null,
          ].filter(Boolean).join(' · ');
          return <button type="button" key={chapter.id} className={`panel-row v610-chapter-row${active ? ' is-active' : ''}`} aria-current={active ? 'location' : undefined} onClick={() => { onChapter(chapter); onClose(); }}>
            <span className="episode-count">{String(number).padStart(2, '0')}</span>
            <span className="panel-row-main">
              <strong>{heading.title || heading.eyebrow}</strong>
              {chapter.arc && <small>{chapter.arc}</small>}
              {metadata && <small>{metadata}</small>}
            </span>
            {completedEpisodeNumbers.includes(Number(number)) ? <span className="v74-completed-label" aria-label="Bab selesai"><BrandIcon name="check-circle" size={15} aria-hidden="true" /> Selesai</span> : active && <span className="v610-current-label">Dibaca</span>}
          </button>;
        }) : <p className="panel-empty">Tidak ada bab yang cocok.</p>)}
        {tab === 'bookmarks' && (bookmarks.length ? bookmarks.map(bookmark => <div className="panel-row v610-bookmark-row" key={bookmark.id}>
          <button type="button" className="panel-row-main text-left" onClick={() => { onBookmark(bookmark.anchor); onClose(); }}>
            <strong>{bookmark.chapterTitle}</strong>
            <small className="bookmark-snippet">{bookmark.snippet}</small>
            <small>{bookmark.createdAt}</small>
          </button>
          <button type="button" className="control-icon" title="Hapus penanda" aria-label={`Hapus penanda ${bookmark.chapterTitle}`} onClick={() => onDeleteBookmark(bookmark.id)}><BrandIcon name="delete" size={17} /></button>
        </div>) : <p className="panel-empty">Belum ada penanda. Ketuk ikon penanda saat membaca untuk menyimpan posisi.</p>)}
      </div>
    </aside>
  </div>;
}

interface SearchProps {
  onClose: () => void;
  chapters: Chapter[];
  onResult: (anchor: TextAnchor) => void;
  theme: ThemeColors;
}

export function SearchPanel({ onClose, chapters, onResult, theme }: SearchProps) {
  const dialogRef = useReaderDialogFocus<HTMLElement>(onClose);
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase('id');
    if (normalized.length < 2) return [];
    const matches: { chapter: Chapter; offset: number; snippet: string }[] = [];
    for (const chapter of chapters) {
      const text = chapter.plainText.toLocaleLowerCase('id');
      let from = 0;
      while (from < text.length) {
        const index = text.indexOf(normalized, from);
        if (index < 0) break;
        matches.push({
          chapter,
          offset: index,
          snippet: chapter.plainText.slice(Math.max(0, index - 50), Math.min(chapter.plainText.length, index + normalized.length + 72)).replace(/\s+/g, ' '),
        });
        if (matches.length >= 150) return matches;
        from = index + Math.max(1, normalized.length);
      }
    }
    return matches;
  }, [query, chapters]);
  const onlyCurrentChapter = chapters.length <= 1;

  return <div className="panel-scrim v610-panel-scrim" onClick={onClose} role="presentation">
    <section ref={dialogRef} className="search-panel v610-search-panel" role="dialog" aria-modal="true" aria-label={onlyCurrentChapter ? 'Cari dalam bab ini' : 'Cari dalam naskah pratinjau'} style={{ background: theme.bg, color: theme.text }} onClick={event => event.stopPropagation()}>
      <div className="search-line" style={{ borderColor: theme.border }}>
        <BrandIcon name="search" size={20} aria-hidden="true" />
        <input data-reader-autofocus type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder={onlyCurrentChapter ? 'Cari dalam bab ini…' : 'Cari dalam naskah pratinjau…'} aria-label="Kata yang dicari" />
        <button type="button" className="control-icon" onClick={onClose} aria-label="Tutup pencarian"><BrandIcon name="close" size={20} /></button>
      </div>
      <div className="panel-list search-results">
        {query.trim().length < 2 ? <p className="panel-empty">Ketik minimal dua huruf untuk mencari dialog atau kata dalam {onlyCurrentChapter ? 'bab ini' : 'naskah pratinjau'}.</p>
          : results.length ? <>
            <div className="search-count">{results.length === 150 ? '150+ hasil' : `${results.length} hasil`}</div>
            {results.map((result, index) => <button type="button" className="search-hit" key={`${result.chapter.id}-${result.offset}-${index}`} onClick={() => { onResult({ chapterId: result.chapter.id, offset: result.offset }); onClose(); }}>
              <span>{result.chapter.title}</span><small>{result.snippet}</small>
            </button>)}
          </> : <p className="panel-empty">Tidak ada hasil yang cocok.</p>}
      </div>
    </section>
  </div>;
}
