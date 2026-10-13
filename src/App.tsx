import React, { useEffect, useState } from 'react';
import SecureReaderApp from './SecureReaderApp';
import PublicLibrary from './pages/PublicLibrary';
import Studio from './pages/Studio';
import StudioErrorBoundary from './components/StudioErrorBoundary';
import ReaderErrorBoundary from './components/ReaderErrorBoundary';
import { isConfigured, supabase } from './data/supabase';
import { legacyBookId, legacyBookTitle } from './data/storyLoader';
import { type Book } from './data/library';
import { navigate } from './utils/nav';
import './index.css';
import './site.css';
import './studio.css';
import './studio-v4.css';
import './studio-v41.css';
import './content-protection.css';
import './secure-reader.css';
import './mist-blue.css';
import './design/v53-mobile.css';
import './design/v54.css';
import './design/v6.css';
import './design/v61-loading-mobile.css';
import ThemeLoading from './components/ThemeLoading';
import { getThemePreference, resolveAppTheme, themeMetaColors } from './hooks/useUiTheme';
import { getReaderThemePreference, resolveReaderTheme } from './utils/readerThemePreference';
import { THEMES } from './utils/theme';
import './design/v62-theme.css';
import './design/v63-ios.css';

export default function App(){
  const [path,setPath]=useState(window.location.pathname);
  const [readerLookup,setReaderLookup]=useState<{slug:string;book:Book|null;resolved:boolean}>({slug:'',book:null,resolved:false});
  useEffect(()=>{const update=()=>setPath(window.location.pathname); window.addEventListener('popstate',update);window.addEventListener('quiet:navigate',update);return()=>{window.removeEventListener('popstate',update);window.removeEventListener('quiet:navigate',update);};},[]);
  useEffect(()=>{
    const updatePrivacy=()=>{
      const sensitiveRoute=window.location.pathname.startsWith('/baca/');
      document.documentElement.classList.toggle('kk-backgrounded', sensitiveRoute && document.visibilityState !== 'visible');
    };
    updatePrivacy();
    document.addEventListener('visibilitychange',updatePrivacy);
    window.addEventListener('pageshow',updatePrivacy);
    // Android file picker can bring this page back to focus without a
    // visibilitychange event. Never leave the privacy curtain stuck on.
    const onFocus=()=>{updatePrivacy();window.setTimeout(updatePrivacy,150);};
    window.addEventListener('focus',onFocus);
    window.addEventListener('quiet:navigate',updatePrivacy);
    return ()=>{document.documentElement.classList.remove('kk-backgrounded');document.removeEventListener('visibilitychange',updatePrivacy);window.removeEventListener('pageshow',updatePrivacy);window.removeEventListener('focus',onFocus);window.removeEventListener('quiet:navigate',updatePrivacy);};
  },[]);
  useEffect(()=>{
    const sync=()=>{
      const app=resolveAppTheme(getThemePreference());
      const color=path.startsWith('/baca/')?THEMES[resolveReaderTheme(getReaderThemePreference(),app)].pageBg:themeMetaColors[app];
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content',color);
    };
    sync();window.addEventListener('katakecil:theme-change',sync);window.addEventListener('katakecil:reader-theme-change',sync);
    return()=>{window.removeEventListener('katakecil:theme-change',sync);window.removeEventListener('katakecil:reader-theme-change',sync);};
  },[path]);
  const isReader = path.startsWith('/baca/');
  const slug=isReader?decodeURIComponent(path.split('/')[2]||''):'';
  useEffect(()=>{
    let active=true;
    if(!isReader){setReaderLookup({slug:'',book:null,resolved:false});return;}
    setReaderLookup({slug,book:null,resolved:false});
    if(!supabase){setReaderLookup({slug,book:null,resolved:true});return;}
    // Keep route resolution keyed to its slug; stale requests cannot display another story.
    supabase.from('qr_books').select('*').eq('slug',slug).eq('is_published',true).is('deleted_at',null).maybeSingle().then(({data,error})=>{
      if(!active)return;
      const book=(!error&&data)?data as Book:error&&slug===legacyBookId?
        {id:legacyBookId,slug:legacyBookId,title:legacyBookTitle,genre:'Fiksi',synopsis:'',cover_url:null,status:'ongoing',is_published:true,is_featured:true,created_at:'',updated_at:''} as Book:null;
      setReaderLookup({slug,book,resolved:true});
    }).catch(()=>{if(active)setReaderLookup({slug,book:null,resolved:true});});
    return()=>{active=false;};
  },[slug,isReader]);
  if(isReader) {
    if(readerLookup.slug!==slug||!readerLookup.resolved) return <ThemeLoading context="reader" text="Menyiapkan halaman cerita…"/>;
    const readerBook=readerLookup.book;
    return readerBook?<ReaderErrorBoundary onBack={()=>navigate(`/cerita/${readerBook.slug}`)}><SecureReaderApp key={readerBook.id} bookId={readerBook.id} bookTitle={readerBook.title} onExit={()=>navigate(`/cerita/${readerBook.slug}`)} episodeNumber={(() => {const raw=new URLSearchParams(window.location.search).get('episode');return raw!==null&&/^\d+$/.test(raw)?Number(raw):undefined;})()}/></ReaderErrorBoundary>:<div className="reader-route-loading"><h2>Cerita tidak tersedia.</h2><button onClick={()=>navigate('/cerita')}>Kembali ke perpustakaan</button>{!isConfigured&&<p>Supabase belum dikonfigurasi.</p>}</div>;
  }
  if(path.startsWith('/studio')) return <StudioErrorBoundary><Studio path={path}/></StudioErrorBoundary>;
  return <PublicLibrary path={path}/>;
}
