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

export default function App(){
  const [path,setPath]=useState(window.location.pathname);
  const [readerBook,setReaderBook]=useState<Book|null>(null);
  const [loading,setLoading]=useState(false);
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
  const isReader = path.startsWith('/baca/');
  const slug=isReader?decodeURIComponent(path.split('/')[2]||''):'';
  useEffect(()=>{let active=true; if(!isReader){setReaderBook(null);return;} if(!supabase){setReaderBook(null);return;}
    setLoading(true);
    // Public reader can open only a published book. V1 legacy fallback only when V2 tables aren't migrated.
    supabase.from('qr_books').select('*').eq('slug',slug).eq('is_published',true).maybeSingle().then(({data,error})=>{
      if(!active)return;
      if(!error&&data)setReaderBook(data as Book);
      else if(error&&slug===legacyBookId)setReaderBook({id:legacyBookId,slug:legacyBookId,title:legacyBookTitle,genre:'Fiksi',synopsis:'',cover_url:null,status:'ongoing',is_published:true,is_featured:true,created_at:'',updated_at:''});
      else setReaderBook(null);
    }).finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[slug,isReader]);
  if(isReader) return loading?<div className="reader-route-loading">Menyiapkan halaman cerita…</div>:readerBook?<ReaderErrorBoundary onBack={()=>navigate(`/cerita/${readerBook.slug}`)}><SecureReaderApp key={readerBook.id} bookId={readerBook.id} bookTitle={readerBook.title} onExit={()=>navigate(`/cerita/${readerBook.slug}`)} episodeNumber={(() => {const raw=new URLSearchParams(window.location.search).get('episode');return raw!==null&&/^\d+$/.test(raw)?Number(raw):undefined;})()}/></ReaderErrorBoundary>:<div className="reader-route-loading"><h2>Cerita tidak tersedia.</h2><button onClick={()=>navigate('/cerita')}>Kembali ke perpustakaan</button>{!isConfigured&&<p>Supabase belum dikonfigurasi.</p>}</div>;
  if(path.startsWith('/studio')) return <StudioErrorBoundary><Studio path={path}/></StudioErrorBoundary>;
  return <PublicLibrary path={path}/>;
}
