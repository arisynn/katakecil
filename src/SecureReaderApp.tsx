import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {loadReaderEpisode,loadReleasedIndex,type ReleasedEpisode,type ReaderEpisode} from './data/secureReader';
import {ReaderPage,type ReaderGeometry} from './components/ReaderPage';
import {PageMeasurer} from './components/PageMeasurer';
import {ReaderControls} from './components/ReaderControls';
import {ContentsPanel,SearchPanel} from './components/ReaderPanels';
import {ReadingSettingsModal} from './components/ReadingSettingsModal';
import {anchorColumn,columnAnchor} from './utils/pagination';
import {chapterFromEpisode} from './utils/episodeChapter';
import {DEFAULT_SETTINGS,THEMES} from './utils/theme';
import type {Bookmark,Chapter,ReadingSettings,TextAnchor} from './types/reader';
import './index.css';

function readLocal<T>(key:string,fallback:T):T {try{return JSON.parse(localStorage.getItem(key)||'null')??fallback;}catch{return fallback;}}
function viewport(){
 const el=document.createElement('div');el.style.cssText='position:fixed;visibility:hidden;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';document.body.appendChild(el);
 const st=getComputedStyle(el);const top=parseFloat(st.paddingTop)||0,bottom=parseFloat(st.paddingBottom)||0;el.remove();return {width:innerWidth,height:innerHeight,safeTop:top,safeBottom:bottom};
}
function marker(ep:number){return `secure-episode-${ep}-part-0`;}
function readMarker(id:string){const m=/^secure-episode-(\d+)-part-(\d+)$/.exec(id);return m?{ep:Number(m[1]),part:Number(m[2])}:null;}

type Props={bookId:string;bookTitle:string;onExit:()=>void;episodeNumber?:number};
export default function SecureReaderApp({bookId,bookTitle,onExit,episodeNumber}:Props){
 const progressKey=`kk-secure-progress-${bookId}`;
 const bookmarkKey=`kk-secure-bookmarks-${bookId}`;
 const [index,setIndex]=useState<ReleasedEpisode[]>([]);
 const indexRef=useRef<ReleasedEpisode[]>([]);
 // Only one released episode is kept in memory. No story text is persisted.
 const [segment,setSegment]=useState<ReaderEpisode|null>(null);
 const segmentRef=useRef<ReaderEpisode|null>(null);
 const [error,setError]=useState('');
 const [loading,setLoading]=useState(true);
 const [settings,setSettings]=useState<ReadingSettings>(()=>({...DEFAULT_SETTINGS,...readLocal('quiet_reader_settings',{})}));
 const [dimensions,setDimensions]=useState(viewport);
 const [pages,setPages]=useState<number[]>([]);
 const [pageIndex,setPageIndex]=useState(0);
 const [controls,setControls]=useState(false);
 const [modal,setModal]=useState<'none'|'contents'|'settings'|'search'>('none');
 const [fullscreen,setFullscreen]=useState(!!document.fullscreenElement);
 const [bookmarks,setBookmarks]=useState<Bookmark[]>(()=>readLocal<Bookmark[]>(bookmarkKey,[]).map(b=>({...b,snippet:'Penanda bacaan'})));
 const [status,setStatus]=useState('');
 const [returnAt,setReturnAt]=useState<{ep:number;offset:number}|null>(null);
 const measuringNode=useRef<HTMLElement|null>(null);
 const offsetRef=useRef(0);
 const pendingEdge=useRef<'start'|'end'|'offset'>('start');
 const pendingOffset=useRef(0);
 const requestRef=useRef(0);
 const touch=useRef<{x:number;y:number;moved:boolean;pinch:boolean}|null>(null);
 const ignoreClick=useRef(false);
 const focusTried=useRef(false);
 const theme=THEMES[settings.theme]||THEMES.white;
 const spread=settings.spreadMode==='spread'&&dimensions.width>=1024;
 const geometry=useMemo<ReaderGeometry>(()=>{
  const maxWidth=Math.min(dimensions.width,spread?1230:820),leafWidth=Math.max(1,spread?(maxWidth-16)/2:maxWidth),mobile=dimensions.width<600;
  const paddingX=Math.min(72,Math.round((mobile?16:35)*({narrow:.8,normal:1,wide:1.4}[settings.marginWidth])));
  const paddingTop=Math.max(mobile?12:18,dimensions.safeTop),paddingBottom=Math.max(4,dimensions.safeBottom),footerHeight=16,footerGap=3;
  return {leafWidth,bodyWidth:Math.max(1,leafWidth-2*paddingX),bodyHeight:Math.max(96,dimensions.height-paddingTop-paddingBottom-footerHeight-footerGap),pageHeight:dimensions.height,paddingX,paddingTop,paddingBottom,footerHeight,footerGap};
 },[dimensions,settings.marginWidth,spread]);
 const chapter=useMemo(()=>segment?chapterFromEpisode(segment.episodeNumber,segment.title,segment.arc,segment.content):undefined,[segment]);
 // Stable array identity: an inline [chapter] causes PageMeasurer's layout effect
 // to run on every render, triggering an endless measure/setPages loop.
 const measuredChapters=useMemo(()=>chapter?[chapter]:[],[chapter]);
 const storedPos=()=>readLocal<{ep:number;part?:number;offset:number}|null>(progressKey,null);
 const persistProgress=(ep:number,offset:number)=>{try{localStorage.setItem(progressKey,JSON.stringify({ep,part:0,offset}));}catch{}};

 // Episode boundaries, not arbitrary network chunks, determine reading progression.
 const loadEpisode=useCallback(async(ep:number,edge:'start'|'end'|'offset'='start',offset=0)=>{
  if(!indexRef.current.some(x=>x.episode_number===ep))return;
  const token=++requestRef.current;
  setLoading(true);setError('');pendingEdge.current=edge;pendingOffset.current=offset;
  try{
   const incoming=await loadReaderEpisode(bookId,ep);
   if(token!==requestRef.current)return;
   segmentRef.current=incoming;
   setSegment(incoming);setPages([]);setPageIndex(0);
   persistProgress(ep,edge==='offset'?offset:0);
  }catch(e){if(token===requestRef.current)setError(e instanceof Error?e.message:'Tidak bisa memuat episode.');}
  finally{if(token===requestRef.current)setLoading(false);}
 },[bookId,progressKey]);
 useEffect(()=>{
  let active=true;
  void (async()=>{
   try{
    const episodes=await loadReleasedIndex(bookId);
    if(!active)return;
    setIndex(episodes);indexRef.current=episodes;
    if(!episodes.length){setError('Belum ada episode yang diterbitkan.');setLoading(false);return;}
    const saved=storedPos();
    const wanted=episodeNumber!==undefined&&episodes.some(e=>e.episode_number===episodeNumber)?episodeNumber:
      saved&&episodes.some(e=>e.episode_number===saved.ep)?saved.ep:episodes[0].episode_number;
    const useSaved=episodeNumber===undefined&&saved?.ep===wanted&&(saved?.part===0||saved?.part===undefined);
    await loadEpisode(wanted,useSaved?'offset':'start',useSaved?saved!.offset:0);
   }catch(e){if(active){setError(e instanceof Error?e.message:'Daftar episode tidak tersedia.');setLoading(false);}}
  })();
  return()=>{active=false;requestRef.current++;};
 },[bookId,episodeNumber,loadEpisode]);
 useEffect(()=>{
  const resize=()=>setDimensions(viewport());const full=()=>{setFullscreen(!!document.fullscreenElement);resize();};
  window.addEventListener('resize',resize);document.addEventListener('fullscreenchange',full);
  return()=>{window.removeEventListener('resize',resize);document.removeEventListener('fullscreenchange',full);};
 },[]);
 useEffect(()=>{try{localStorage.setItem('quiet_reader_settings',JSON.stringify(settings));}catch{}},[settings]);
 useEffect(()=>{try{localStorage.setItem(bookmarkKey,JSON.stringify(bookmarks));}catch{}},[bookmarks,bookmarkKey]);
 useEffect(()=>{if(!status)return;const timer=setTimeout(()=>setStatus(''),2500);return()=>clearTimeout(timer);},[status]);
 const onMeasured=useCallback((counts:number[],nodes:HTMLElement[])=>{
  measuringNode.current=nodes[0]||null;
  const count=counts[0]||1;
  const active=segmentRef.current;
  setPages(previous => previous.length === count && previous.every((value,i)=>value===i)
   ? previous : Array.from({length:count},(_,i)=>i));
  if(pendingEdge.current==='end')setPageIndex(count-1);
  else if(pendingEdge.current==='offset'&&active&&nodes[0]){
   if(chapter)setPageIndex(Math.min(count-1,anchorColumn(nodes[0],chapter,pendingOffset.current,geometry.bodyWidth)));
  }else setPageIndex(0);
  pendingEdge.current='offset';
 },[chapter,geometry.bodyWidth]);
 const saveAt=useCallback((n:number)=>{
  if(!segment||!chapter)return;
  const offset=columnAnchor(measuringNode.current,chapter,n,geometry.bodyWidth).offset;
  offsetRef.current=offset;pendingOffset.current=offset;
  persistProgress(segment.episodeNumber,offset);
 },[segment,chapter,geometry.bodyWidth,progressKey]);
 const nextEpisode=useCallback((direction:1|-1)=>{
  const current=segmentRef.current;
  if(!current)return;
  const ix=indexRef.current.findIndex(e=>e.episode_number===current.episodeNumber);
  const other=indexRef.current[ix+direction];
  if(other)void loadEpisode(other.episode_number,direction===1?'start':'end');
  else setStatus(direction===1?'Sudah sampai akhir cerita yang tersedia.':'Ini episode pertama.');
 },[loadEpisode]);
 const goTo=useCallback((n:number)=>{
  if(loading)return;
  if(n<0){nextEpisode(-1);return;}
  if(n>=pages.length){nextEpisode(1);return;}
  if(n>pageIndex&&!focusTried.current&&!document.fullscreenElement&&!controls){
   focusTried.current=true;try{void document.documentElement.requestFullscreen?.({navigationUI:'hide'}).catch(()=>{});}catch{}
  }
  setPageIndex(n);saveAt(n);
 },[pages,pageIndex,loading,nextEpisode,controls,saveAt]);
 const jumpTo=useCallback((anchor:TextAnchor)=>{
  const decoded=readMarker(anchor.chapterId);
  if(!decoded)return;
  const current=segmentRef.current;
  if(current){setReturnAt({ep:current.episodeNumber,offset:offsetRef.current});}
  if(current?.episodeNumber===decoded.ep&&chapter){
   pendingOffset.current=anchor.offset;
   const col=anchorColumn(measuringNode.current,chapter,anchor.offset,geometry.bodyWidth);
   setPageIndex(Math.min(pages.length-1,col));saveAt(col);
  }else void loadEpisode(decoded.ep,'offset',anchor.offset);
 },[loadEpisode,chapter,geometry.bodyWidth,pages.length,saveAt]);
 const jumpEpisode=(num:number)=>{const s=segmentRef.current;if(s)setReturnAt({ep:s.episodeNumber,offset:offsetRef.current});void loadEpisode(num);};
 const currentIndex=index.findIndex(e=>e.episode_number===segment?.episodeNumber);
 const bookmarkAnchor=segment?{chapterId:marker(segment.episodeNumber),offset:offsetRef.current}:null;
 const activeBookmarks=bookmarks.filter(b=>b.anchor.chapterId===bookmarkAnchor?.chapterId && Math.abs(b.anchor.offset-(bookmarkAnchor?.offset||0))<100);
 const toggleBookmark=()=>{
  if(!segment||!chapter||!bookmarkAnchor)return;
  if(activeBookmarks.length){const ids=new Set(activeBookmarks.map(b=>b.id));setBookmarks(old=>old.filter(b=>!ids.has(b.id)));setStatus('Penanda dihapus');}
  else{const at={...bookmarkAnchor};setBookmarks(old=>[{id:`bk-${Date.now()}`,anchor:at,chapterTitle:segment.title,snippet:'Penanda bacaan',createdAt:new Date().toLocaleDateString('id-ID')},...old]);setStatus('Penanda tersimpan');}
 };
 const allChapters:Chapter[]=index.map((ep)=>({id:marker(ep.episode_number),title:ep.title,arc:ep.arc_title,paragraphs:[],plainParagraphs:[],plainText:'',level:2,wordCount:0,estimatedMinutes:0,startPageIndex:0}));
 const onTap=(e:React.MouseEvent)=>{
  if((e.target as HTMLElement).closest('button,input,textarea,a'))return;
  if(ignoreClick.current){ignoreClick.current=false;return;}
  if(controls){setControls(false);return;}
  if(modal!=='none')return;
  const r=e.currentTarget.getBoundingClientRect(),ratio=(e.clientX-r.left)/r.width;
  if(ratio<.26)goTo(pageIndex-1);else if(ratio>.74)goTo(pageIndex+(spread?2:1));else setControls(true);
 };
 const onTouchStart=(e:React.TouchEvent)=>{if(modal!=='none')return;if(e.touches.length===2){touch.current={x:0,y:0,moved:true,pinch:true};return;}if(e.touches.length===1)touch.current={x:e.touches[0].clientX,y:e.touches[0].clientY,moved:false,pinch:false};};
 const onTouchEnd=(e:React.TouchEvent)=>{
  const t=touch.current;touch.current=null;
  if(!t||modal!=='none')return;
  if(t.pinch){setControls(true);ignoreClick.current=true;return;}
  if(!e.changedTouches.length)return;
  const dx=e.changedTouches[0].clientX-t.x,dy=e.changedTouches[0].clientY-t.y;
  if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)*1.2){ignoreClick.current=true;goTo(pageIndex+(dx<0?(spread?2:1):-(spread?2:1)));}
 };
 useEffect(()=>{
  const key=(e:KeyboardEvent)=>{if((e.target as HTMLElement).closest('input,textarea,button,[contenteditable]'))return;if(e.key==='Escape'){setModal('none');setControls(false);}else if(modal==='none'&&(e.key==='ArrowRight'||e.key==='PageDown'))goTo(pageIndex+1);else if(modal==='none'&&(e.key==='ArrowLeft'||e.key==='PageUp'))goTo(pageIndex-1);};
  window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
 },[pageIndex,goTo,modal]);
 const setSettingsSafe=(next:Partial<ReadingSettings>)=>{pendingOffset.current=offsetRef.current;pendingEdge.current='offset';setSettings(prev=>({...prev,...next}));};
 const first=pages[pageIndex],second=spread?pages[pageIndex+1]:undefined;
 return <div className="quiet-app reader-protected" style={{backgroundColor:theme.bg,color:theme.text}} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
  {chapter&&<PageMeasurer chapters={measuredChapters} settings={settings} geometry={geometry} onMeasured={onMeasured} hideIntro={false}/>}
  <main className={`reader-stage ${controls?'showing-controls':''}`} onCopy={e=>e.preventDefault()} onCut={e=>e.preventDefault()} onDragStart={e=>e.preventDefault()} onContextMenu={e=>e.preventDefault()} onClick={onTap} aria-label="Halaman pembaca, ketuk tengah untuk menu">
   <div className={`reader-book ${spread?'reader-book-spread':''}`} style={{background:theme.pageBg,gap:spread?16:0}}>
    {first!==undefined&&chapter?<ReaderPage chapter={chapter} columnIndex={first} pageNumber={pageIndex+1} totalPages={pages.length} settings={settings} theme={theme} geometry={geometry} hideIntro={false}/>:<div className="loading-text" style={{color:theme.secondaryText}}>{loading?'Memuat episode…':error||'Menata halaman…'}</div>}
    {spread&&second!==undefined&&chapter&&<ReaderPage chapter={chapter} columnIndex={second} pageNumber={pageIndex+2} totalPages={pages.length} settings={settings} theme={theme} geometry={geometry} hideIntro={false}/>}
   </div>
  </main>
  <div className={`controls-shell ${controls?'controls-open':''}`} aria-hidden={!controls}>
   <ReaderControls onExit={onExit} theme={theme} title={bookTitle} chapterTitle={segment?.title||''} page={pageIndex+1} total={pages.length||1} isBookmarked={activeBookmarks.length>0} fullscreen={fullscreen} canReturn={!!returnAt} onContents={()=>setModal('contents')} onSettings={()=>setModal('settings')} onSearch={()=>{setStatus('Pencarian dalam episode yang sedang dibaca.');setModal('search');}} onBookmark={toggleBookmark} onFullscreen={()=>{if(document.fullscreenElement)void document.exitFullscreen().catch(()=>{});else void document.documentElement.requestFullscreen?.().catch(()=>{});}} onClose={()=>setControls(false)} onReturn={()=>{if(returnAt){void loadEpisode(returnAt.ep,'offset',returnAt.offset);setReturnAt(null);}}} onPage={n=>goTo(n-1)} onPrevChapter={()=>{if(index[currentIndex-1])jumpEpisode(index[currentIndex-1].episode_number);}} onNextChapter={()=>{if(index[currentIndex+1])jumpEpisode(index[currentIndex+1].episode_number);}} prevChapter={currentIndex>0} nextChapter={currentIndex<index.length-1}/>
  </div>
  {loading&&segment&&<div className="quiet-status" role="status" style={{background:theme.barBg,color:theme.secondaryText}}>Membuka episode berikutnya…</div>}
  {!loading&&error&&<div className="secure-reader-error" role="alert" style={{background:theme.barBg,color:theme.text}}>{error} <button onClick={()=>{if(segment)void loadEpisode(segment.episodeNumber);else window.location.reload();}}>Coba lagi</button></div>}
  {status&&<div className="quiet-status" role="status" style={{background:theme.barBg,color:theme.secondaryText}}>{status}</div>}
  {modal==='contents'&&<ContentsPanel onClose={()=>setModal('none')} chapters={allChapters} currentChapterId={segment?marker(segment.episodeNumber):''} bookmarks={bookmarks} onChapter={ch=>{const p=readMarker(ch.id);if(p)jumpEpisode(p.ep);}} onBookmark={at=>jumpTo(at)} onDeleteBookmark={id=>setBookmarks(old=>old.filter(b=>b.id!==id))} theme={theme}/>}
  {modal==='search'&&<SearchPanel onClose={()=>setModal('none')} chapters={chapter?[chapter]:[]} onResult={at=>{if(chapter){const col=anchorColumn(measuringNode.current,chapter,at.offset,geometry.bodyWidth);setPageIndex(col);saveAt(col);}}} theme={theme}/>}
  <ReadingSettingsModal isOpen={modal==='settings'} onClose={()=>setModal('none')} settings={settings} theme={theme} onUpdateSettings={setSettingsSafe}/>
  <span aria-live="polite" className="sr-only">{segment?`Episode ${segment.episodeNumber}`:''}</span>
 </div>;
}
