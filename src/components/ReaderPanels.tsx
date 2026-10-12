import React, { useMemo, useState } from 'react';
import { Bookmark as BookmarkIcon, BookOpen, Search, Trash2, X } from 'lucide-react';
import type { Bookmark, Chapter, TextAnchor, ThemeColors } from '../types/reader';

export function ContentsPanel({ onClose, chapters, currentChapterId, bookmarks, onChapter, onBookmark, onDeleteBookmark, theme }: {
  onClose: () => void; chapters: Chapter[]; currentChapterId: string; bookmarks: Bookmark[];
  onChapter: (chapter: Chapter) => void; onBookmark: (anchor: TextAnchor) => void;
  onDeleteBookmark: (id: string) => void; theme: ThemeColors;
}) {
  const [tab, setTab] = useState<'contents' | 'bookmarks'>('contents');
  const tabs: { id: 'contents' | 'bookmarks'; name: string; icon: typeof BookOpen }[] = [{ id: 'contents', name: 'Isi', icon: BookOpen }, { id: 'bookmarks', name: 'Penanda', icon: BookmarkIcon }];
  return <div className="panel-scrim" onClick={onClose}>
    <aside className="drawer-panel" style={{ background: theme.bg, color: theme.text }} onClick={e => e.stopPropagation()} aria-label="Daftar isi">
      <div className="panel-heading" style={{ borderColor: theme.border }}><div><div className="panel-eyebrow">QUIET READER</div><h2>Daftar Isi</h2></div><button className="control-icon" aria-label="Tutup" onClick={onClose}><X size={19}/></button></div>
      <div className="panel-tabs" style={{ borderColor: theme.border }}>{tabs.map(t => <button key={t.id} onClick={() => setTab(t.id)} className={tab === t.id ? 'selected' : ''} style={{ borderColor: tab === t.id ? theme.accent : 'transparent', color: tab === t.id ? theme.accent : theme.secondaryText }}><t.icon size={14}/>{t.name}</button>)}</div>
      <div className="panel-list">
        {tab === 'contents' && chapters.map((chap, i) => <button key={chap.id} onClick={() => { onChapter(chap); onClose(); }} className="panel-row" style={{ background: currentChapterId === chap.id ? theme.cardBg : 'transparent' }}><span className="episode-count">{String(i + 1).padStart(2, '0')}</span><span className="panel-row-main">{chap.arc && <small style={{ color: theme.secondaryText }}>{chap.arc}</small>}<strong style={{ color: currentChapterId === chap.id ? theme.accent : theme.text }}>{chap.title}</strong><small style={{ color: theme.secondaryText }}>{chap.estimatedMinutes} menit · {chap.wordCount.toLocaleString('id-ID')} kata</small></span></button>)}
        {tab === 'bookmarks' && (bookmarks.length ? bookmarks.map(b => <div className="panel-row" key={b.id}><button className="panel-row-main text-left" onClick={() => { onBookmark(b.anchor); onClose(); }}><strong>{b.chapterTitle}</strong><small className="bookmark-snippet" style={{ color: theme.secondaryText }}>{b.snippet}</small><small style={{ color: theme.secondaryText }}>{b.createdAt}</small></button><button className="control-icon" title="Hapus penanda" aria-label="Hapus penanda" onClick={() => onDeleteBookmark(b.id)}><Trash2 size={16}/></button></div>) : <p className="panel-empty">Belum ada penanda. Simpan bagian menarik dari header pembaca.</p>)}
      </div>
    </aside>
  </div>;
}

export function SearchPanel({ onClose, chapters, onResult, theme }: { onClose: () => void; chapters: Chapter[]; onResult: (anchor: TextAnchor) => void; theme: ThemeColors }) {
  const [query, setQuery] = useState('');
  const results = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('id');
    if (q.length < 2) return [];
    const matches: { chapter: Chapter; offset: number; snippet: string }[] = [];
    for (const chap of chapters) {
      const haystack = chap.plainText.toLocaleLowerCase('id');
      let from = 0;
      while (from < haystack.length) {
        const index = haystack.indexOf(q, from);
        if (index < 0) break;
        matches.push({ chapter: chap, offset: index, snippet: chap.plainText.slice(Math.max(0, index - 50), Math.min(chap.plainText.length, index + q.length + 72)).replace(/\s+/g, ' ') });
        if (matches.length >= 150) return matches;
        from = index + Math.max(1, q.length);
      }
    }
    return matches;
  }, [query, chapters]);
  return <div className="panel-scrim" onClick={onClose}><section className="search-panel" style={{ background: theme.bg, color: theme.text }} onClick={e => e.stopPropagation()} aria-label="Pencarian teks">
    <div className="search-line" style={{ borderColor: theme.border }}><Search size={19} style={{ color: theme.secondaryText }}/><input autoFocus type="search" value={query} onChange={e => setQuery(e.target.value)} placeholder="Cari dalam cerita..." aria-label="Kata yang dicari"/><button className="control-icon" onClick={onClose} aria-label="Tutup"><X size={19}/></button></div>
    <div className="panel-list search-results">{query.trim().length < 2 ? <p className="panel-empty">Cari kata, nama tokoh, atau dialog.</p> : results.length ? <><div className="search-count" style={{ color: theme.secondaryText }}>{results.length === 150 ? '150+ hasil' : `${results.length} hasil`}</div>{results.map((r, i) => <button className="search-hit" key={`${r.chapter.id}-${r.offset}-${i}`} onClick={() => { onResult({ chapterId: r.chapter.id, offset: r.offset }); onClose(); }}><span style={{ color: theme.accent }}>{r.chapter.title}</span><small style={{ color: theme.secondaryText }}>{r.snippet}</small></button>)}</> : <p className="panel-empty">Tidak ada hasil yang cocok.</p>}</div>
  </section></div>;
}
