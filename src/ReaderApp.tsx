import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { emptyStory } from './data/storyLoader';
import type { StoryFile } from './types/reader';
import { ReaderPage, type ReaderGeometry } from './components/ReaderPage';
import { PageMeasurer } from './components/PageMeasurer';
import { ReaderControls } from './components/ReaderControls';
import { ContentsPanel, SearchPanel } from './components/ReaderPanels';
import { ReadingSettingsModal } from './components/ReadingSettingsModal';
import { anchorColumn, columnAnchor, createPageMap, getSnippet, parseMarkdown } from './utils/pagination';
import { DEFAULT_SETTINGS, THEMES } from './utils/theme';
import type { Bookmark, PageLocation, ReadingSettings, TextAnchor } from './types/reader';
import './index.css';
import { useUiTheme } from './hooks/useUiTheme';
import { readerModeFor } from './utils/globalTheme';
import { pinchAction } from './utils/readerGesture';
import { readerHeading } from './utils/readerHeading';

const readJson = <T,>(key: string, fallback: T): T => { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; } catch { return fallback; } };
const anchorKey = (id: string) => `quiet_reader_anchor_${id}`;
const bookmarkKey = (id: string) => `quiet_reader_bookmarks_${id}`;


/** Measure device cutout insets so the reader never clips text in fullscreen. */
const readViewport = () => {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const safeTop = Number.parseFloat(style.paddingTop) || 0;
  const safeBottom = Number.parseFloat(style.paddingBottom) || 0;
  probe.remove();
  return { width: window.innerWidth, height: window.innerHeight, safeTop, safeBottom };
};

export default function ReaderApp({ bookId, bookTitle, onExit, previewStory, episodeNumber }: { bookId: string; bookTitle: string; onExit: () => void; previewStory?: StoryFile; episodeNumber?: number }) {
  const [story, setStory] = useState(() => previewStory ?? emptyStory(bookId, bookTitle));
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>(previewStory ? 'ready' : 'loading');
  const [loadError, setLoadError] = useState('');
  const parsed = useMemo(() => parseMarkdown(story.content), [story.content]);
  const chapters = useMemo(() => parsed.chapters.map((ch, i) => ({...ch, displayNumber: story.episodeNumbers?.[i] ?? i + 1})), [parsed, story.episodeNumbers]);
  const [settings, setSettings] = useState<ReadingSettings>(() => {
    const saved = readJson<Partial<ReadingSettings>>('quiet_reader_settings', {});
    return { ...DEFAULT_SETTINGS, ...saved, fontSize: Math.max(90, Math.min(160, Number(saved.fontSize) || 100)) };
  });
  const {theme:appTheme,setPreference:setAppTheme}=useUiTheme();
  const effectiveTheme=readerModeFor(appTheme);
  const effectiveSettings=useMemo<ReadingSettings>(()=>({...settings,theme:effectiveTheme}),[settings,effectiveTheme]);
  const theme = THEMES[effectiveTheme] ?? THEMES.white;
  const changeReaderSettings=(next:Partial<ReadingSettings>)=>{
    const {theme:unusedTheme,...readingOnly}=next;
    setSettings(prev=>({...prev,...readingOnly}));
  };
  const [viewSize, setViewSize] = useState(() => ({ width: window.innerWidth, height: window.innerHeight, safeTop: 0, safeBottom: 0 }));
  const [pages, setPages] = useState<PageLocation[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [controls, setControls] = useState(false);
  const [modal, setModal] = useState<'none' | 'contents' | 'settings' | 'search'>('none');
  const [isFullscreen, setIsFullscreen] = useState(!!document.fullscreenElement);
  const [returnAnchor, setReturnAnchor] = useState<TextAnchor | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>(() => readJson<Bookmark[]>(bookmarkKey(story.id), []).filter(b => b.anchor?.chapterId));
  const [status, setStatus] = useState('');
  const nodesRef = useRef<HTMLElement[]>([]);
  const anchorRef = useRef<TextAnchor>(readJson(anchorKey(story.id), { chapterId: chapters[0]?.id ?? 'chapter-1', offset: 0 }));
  const deepLinkAppliedRef = useRef(false);
  const ignoreClickRef = useRef(false);
  const touchRef = useRef<{ x: number; y: number; distance?: number; pinch: boolean; moved: boolean } | null>(null);

  const spread = settings.spreadMode === 'spread' && viewSize.width >= 1024;
  const geometry = useMemo<ReaderGeometry>(() => {
    const maxWidth = Math.min(viewSize.width, spread ? 1230 : 820);
    const leafWidth = Math.max(1, spread ? (maxWidth - 16) / 2 : maxWidth);
    const mobile = viewSize.width < 600;
    const paddingX = Math.min(72, Math.round((mobile ? 16 : 35) * ({ narrow: .8, normal: 1, wide: 1.4 }[settings.marginWidth])));
    const paddingTop = Math.max(mobile ? 12 : 18, viewSize.safeTop);
    const paddingBottom = Math.max(4, viewSize.safeBottom);
    const footerHeight = 16;
    const footerGap = 3;
    const bodyHeight = Math.max(96, viewSize.height - paddingTop - paddingBottom - footerHeight - footerGap);
    return { leafWidth, bodyWidth: Math.max(1, leafWidth - 2 * paddingX), bodyHeight, pageHeight: viewSize.height, paddingX, paddingTop, paddingBottom, footerHeight, footerGap };
  }, [viewSize, settings.marginWidth, spread]);

  useEffect(() => {
    const onResize = () => setViewSize(readViewport());
    const onFullscreen = () => { setIsFullscreen(!!document.fullscreenElement); onResize(); };
    onResize();
    window.addEventListener('resize', onResize);
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => { window.removeEventListener('resize', onResize); document.removeEventListener('fullscreenchange', onFullscreen); };
  }, []);
  useEffect(() => { try { localStorage.setItem('quiet_reader_settings', JSON.stringify(effectiveSettings)); } catch { /* browser storage unavailable */ } }, [effectiveSettings]);
  useEffect(() => { try { localStorage.setItem(bookmarkKey(story.id), JSON.stringify(bookmarks)); } catch { /* browser storage unavailable */ } }, [bookmarks, story.id]);
  useEffect(() => { if (!status) return; const timer = window.setTimeout(() => setStatus(''), 2000); return () => window.clearTimeout(timer); }, [status]);

  // This component is reserved for author previews in V4.2. Public access
  // uses SecureReaderApp and never requests whole released episodes.
  useEffect(()=>{
    if(!previewStory){setLoadState('error');setLoadError('Gunakan Secure Reader untuk membaca cerita publik.');}
  },[previewStory]);

  const onMeasured = useCallback((counts: number[], nodes: HTMLElement[]) => {
    nodesRef.current = nodes;
    const map = createPageMap(counts);
    setPages(map);
    const stored = anchorRef.current;
    const chapterIndex = Math.max(0, chapters.findIndex(ch => ch.id === stored.chapterId));
    const col = anchorColumn(nodes[chapterIndex], chapters[chapterIndex], stored.offset, geometry.bodyWidth);
    let newIndex = map.findIndex(loc => loc.chapterIndex === chapterIndex && loc.columnIndex === col);
    if (newIndex < 0) newIndex = map.findIndex(loc => loc.chapterIndex === chapterIndex);
    setPageIndex(Math.max(0, newIndex));
  }, [chapters, geometry.bodyWidth]);

  // Optional deep link to an episode from the public episode listing.
  // Uses the actual released episode sequence so gaps in numbering remain safe.
  useEffect(() => {
    if (episodeNumber === undefined || deepLinkAppliedRef.current || !pages.length || !story.episodeNumbers?.length) return;
    const chapterIdx = story.episodeNumbers.indexOf(episodeNumber);
    if (chapterIdx < 0 || !chapters[chapterIdx]) return;
    deepLinkAppliedRef.current = true;
    const loc = pages.findIndex(p => p.chapterIndex === chapterIdx);
    if (loc < 0) return;
    const nextAnchor = { chapterId: chapters[chapterIdx].id, offset: 0 };
    anchorRef.current = nextAnchor;
    try { localStorage.setItem(anchorKey(story.id), JSON.stringify(nextAnchor)); } catch { /* privacy mode */ }
    setPageIndex(loc);
  }, [episodeNumber, pages, chapters, story.episodeNumbers, story.id]);

  const safeIndex = Math.max(0, Math.min(pageIndex, pages.length - 1));
  const currentLocation = pages[safeIndex] ?? { chapterIndex: 0, columnIndex: 0 };
  const chapter = chapters[currentLocation.chapterIndex];
  const currentNumber = safeIndex + 1;
  const pageAnchor = useCallback((location: PageLocation): TextAnchor => {
    const ch = chapters[location.chapterIndex];
    return ch ? columnAnchor(nodesRef.current[location.chapterIndex], ch, location.columnIndex, geometry.bodyWidth) : { chapterId: 'chapter-1', offset: 0 };
  }, [chapters, geometry.bodyWidth]);
  const globalFromAnchor = useCallback((anchor: TextAnchor): number => {
    const idx = Math.max(0, chapters.findIndex(ch => ch.id === anchor.chapterId));
    const col = anchorColumn(nodesRef.current[idx], chapters[idx], anchor.offset, geometry.bodyWidth);
    const found = pages.findIndex(loc => loc.chapterIndex === idx && loc.columnIndex === col);
    return found >= 0 ? found : Math.max(0, pages.findIndex(loc => loc.chapterIndex === idx));
  }, [chapters, geometry.bodyWidth, pages]);
  const goTo = useCallback((index: number, jump = false) => {
    if (!pages.length) return;
    const target = Math.max(0, Math.min(pages.length - 1, index));
    if (jump && target !== safeIndex) setReturnAnchor(pageAnchor(pages[safeIndex]));
    setPageIndex(target);
    anchorRef.current = pageAnchor(pages[target]);
    try { localStorage.setItem(anchorKey(story.id), JSON.stringify(anchorRef.current)); } catch { /* privacy mode */ }
  }, [pages, safeIndex, pageAnchor, story.id]);
  const goToAnchor = useCallback((anchor: TextAnchor, jump = true) => {
    if (jump && pages.length) setReturnAnchor(pageAnchor(pages[safeIndex]));
    anchorRef.current = anchor;
    try { localStorage.setItem(anchorKey(story.id), JSON.stringify(anchor)); } catch { /* privacy mode */ }
    setPageIndex(globalFromAnchor(anchor));
  }, [pages, pageAnchor, safeIndex, globalFromAnchor, story.id]);
  const next = useCallback(() => goTo(safeIndex + (spread ? 2 : 1)), [goTo, safeIndex, spread]);
  const prev = useCallback(() => goTo(safeIndex - (spread ? 2 : 1)), [goTo, safeIndex, spread]);
  const activeBookmarks = useMemo(() => bookmarks.filter(b => chapters.some(ch => ch.id === b.anchor?.chapterId) && globalFromAnchor(b.anchor) === safeIndex), [bookmarks, chapters, safeIndex, globalFromAnchor]);
  const toggleBookmark = () => {
    if (!chapter) return;
    if (activeBookmarks.length) {
      const ids = new Set(activeBookmarks.map(b => b.id));
      setBookmarks(prev => prev.filter(b => !ids.has(b.id)));
      setStatus('Penanda dihapus');
    } else {
      const at = pageAnchor(currentLocation);
      const bm: Bookmark = { id: `bookmark-${Date.now()}`, anchor: at, chapterTitle: chapter.title, snippet: getSnippet(chapter, at.offset), createdAt: new Date().toLocaleDateString('id-ID', { dateStyle: 'medium' }) };
      setBookmarks(prev => [bm, ...prev]);
      setStatus('Penanda tersimpan');
    }
  };
  const toggleFullscreen = () => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); else void document.documentElement.requestFullscreen?.().catch(() => setStatus('Fullscreen tidak tersedia')); };
  const goChapter = (chapterIndex: number) => { const target = chapters[chapterIndex]; if (target) goToAnchor({ chapterId: target.id, offset: 0 }); };
  const chapterIndex = currentLocation.chapterIndex;

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('input,textarea,button,[contenteditable]')) return;
      if (e.key === 'Escape') { setModal('none'); setControls(false); return; }
      if (modal !== 'none') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); next(); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); prev(); }
      if (e.key.toLowerCase() === 'm') setControls(v => !v);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [next, prev, modal]);
  useEffect(() => {
    const wheel = (e: WheelEvent) => {
      if (modal !== 'none' || !e.ctrlKey) return;
      e.preventDefault();
      if (e.deltaY > 2) setControls(true);
      if (e.deltaY < -2) setControls(false);
    };
    window.addEventListener('wheel', wheel, { passive: false });
    return () => window.removeEventListener('wheel', wheel);
  }, [modal]);

  const touchDistance = (a: React.Touch, b: React.Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const touchStart = (e: React.TouchEvent) => {
    if (modal !== 'none') return;
    if (e.touches.length === 2) touchRef.current = { x: 0, y: 0, distance: touchDistance(e.touches[0], e.touches[1]), pinch: false, moved: true };
    else if (e.touches.length === 1) touchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, pinch: false, moved: false };
  };
  const touchMove = (e: React.TouchEvent) => {
    const t = touchRef.current;
    if (!t || modal !== 'none') return;
    if (e.touches.length === 2 && t.distance !== undefined) {
      if (!t.pinch) {
        const action = pinchAction(t.distance, touchDistance(e.touches[0], e.touches[1]), controls);
        if (action) { setControls(action === 'open'); t.pinch = true; ignoreClickRef.current = true; }
      }
    } else if (e.touches.length === 1 && (Math.abs(e.touches[0].clientX - t.x) > 12 || Math.abs(e.touches[0].clientY - t.y) > 12)) t.moved = true;
  };
  const touchEnd = (e: React.TouchEvent) => {
    const t = touchRef.current;
    if (!t) return;
    if (e.touches.length > 0) return;
    if (!t.pinch && t.distance === undefined && modal === 'none' && !controls) {
      const dx = e.changedTouches[0]?.clientX - t.x;
      const dy = e.changedTouches[0]?.clientY - t.y;
      if (dx !== undefined && Math.abs(dx) > 52 && Math.abs(dx) > Math.abs(dy ?? 0) * 1.35) { if (dx < 0) next(); else prev(); ignoreClickRef.current = true; }
    }
    touchRef.current = null;
    if (ignoreClickRef.current) window.setTimeout(() => { ignoreClickRef.current = false; }, 350);
  };
  const onCanvasClick = (e: React.MouseEvent) => {
    if (ignoreClickRef.current || modal !== 'none') return;
    if (controls) { setControls(false); return; }
    if (!(e.target as Element).closest('.reader-book')) return;
    if ((e.target as Element).closest('button,input,a,[role="button"]')) return;
    if (window.getSelection()?.toString().trim()) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    if (ratio < .26) prev(); else if (ratio > .74) next(); else setControls(true);
  };

  const displayedHeading=readerHeading(chapter?.title||'',chapter?.displayNumber);
  const displayedTitle=displayedHeading.title?`${displayedHeading.eyebrow} · ${displayedHeading.title}`:displayedHeading.eyebrow;
  const first = pages[safeIndex];
  const second = spread ? pages[safeIndex + 1] : undefined;
  return <div className={`quiet-app ${previewStory ? 'reader-author-preview' : 'reader-protected'}`} data-reader-view={modal !== 'none' ? 'panel' : controls ? 'menu' : 'reading'} data-reader-theme={effectiveTheme} style={{ backgroundColor: theme.bg, color: theme.text }} onTouchStart={touchStart} onTouchMove={touchMove} onTouchEnd={touchEnd}>
    {chapters.length > 0 && <PageMeasurer chapters={chapters} settings={effectiveSettings} geometry={geometry} onMeasured={onMeasured}/>}
    <main className={`reader-stage ${controls ? 'showing-controls' : ''}`} onCopy={e=>{if(!previewStory)e.preventDefault();}} onCut={e=>{if(!previewStory)e.preventDefault();}} onContextMenu={e=>{if(!previewStory)e.preventDefault();}} onDragStart={e=>{if(!previewStory)e.preventDefault();}} onClick={onCanvasClick} aria-label="Halaman pembaca, ketuk tengah untuk menu">
      <div className={`reader-book ${spread ? 'reader-book-spread' : ''}`} style={{ background: theme.pageBg, gap: spread ? 16 : 0 }}>
        {first && chapters[first.chapterIndex] ? <ReaderPage key={`left-${first.chapterIndex}`} chapter={chapters[first.chapterIndex]} columnIndex={first.columnIndex} pageNumber={safeIndex + 1} totalPages={pages.length} settings={effectiveSettings} theme={theme} geometry={geometry}/> : <div className="loading-text" style={{ color: theme.secondaryText }}>{chapters.length ? 'Menata halaman…' : loadState === 'loading' ? 'Memuat episode…' : loadState === 'error' ? loadError : 'Belum ada episode terbit.'}</div>}
        {spread && second && chapters[second.chapterIndex] && <ReaderPage key={`right-${second.chapterIndex}`} chapter={chapters[second.chapterIndex]} columnIndex={second.columnIndex} pageNumber={safeIndex + 2} totalPages={pages.length} settings={effectiveSettings} theme={theme} geometry={geometry}/>}
      </div>
    </main>
    <div className={`controls-shell ${controls ? 'controls-open' : ''}`} aria-hidden={!controls}>
      {controls && <ReaderControls onExit={onExit} theme={theme} title={parsed.title} chapterTitle={displayedTitle} page={currentNumber} total={pages.length || 1} isBookmarked={activeBookmarks.length > 0} fullscreen={isFullscreen} canReturn={!!returnAnchor} onContents={() => setModal('contents')} onSettings={() => setModal('settings')} onSearch={() => setModal('search')} onBookmark={toggleBookmark} onFullscreen={toggleFullscreen} onClose={() => setControls(false)} onReturn={() => { if (returnAnchor) goToAnchor(returnAnchor, false); setReturnAnchor(null); }} onPage={n => goTo(n - 1)} onPrevChapter={() => goChapter(chapterIndex - 1)} onNextChapter={() => goChapter(chapterIndex + 1)} prevChapter={chapterIndex > 0} nextChapter={chapterIndex < chapters.length - 1} progressScope="story"/>}
    </div>
    {status && <div className="quiet-status" role="status" style={{ background: theme.barBg, color: theme.secondaryText }}>{status}</div>}
    {modal === 'contents' && <ContentsPanel onClose={() => setModal('none')} chapters={chapters.map((ch, i) => ({...ch, startPageIndex: Math.max(0, pages.findIndex(p => p.chapterIndex === i))}))} currentChapterId={chapter?.id ?? ''} bookmarks={bookmarks} onChapter={ch => goChapter(chapters.findIndex(c => c.id === ch.id))} onBookmark={at => goToAnchor(at)} onDeleteBookmark={id => setBookmarks(prev => prev.filter(b => b.id !== id))} theme={theme}/>}
    {modal === 'search' && <SearchPanel onClose={() => setModal('none')} chapters={chapters} onResult={at => goToAnchor(at)} theme={theme}/>}
    <ReadingSettingsModal isOpen={modal === 'settings'} onClose={() => setModal('none')} settings={effectiveSettings} onUpdateSettings={changeReaderSettings} appTheme={appTheme} onAppThemeChange={setAppTheme}/>
  </div>;
}
