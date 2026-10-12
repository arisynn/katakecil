import React, { useEffect, useState } from 'react';
import ReaderApp from './ReaderApp';
import PublicLibrary from './pages/PublicLibrary';
import Studio from './pages/Studio';
import { isConfigured, supabase } from './data/supabase';
import { legacyBookId, legacyBookTitle } from './data/storyLoader';
import { type Book } from './data/library';
import { navigate } from './utils/nav';
import './index.css';
import './site.css';
import './studio.css';
import './studio-v4.css';

export default function App(){
  const [path,setPath]=useState(window.location.pathname);
  const [readerBook,setReaderBook]=useState<Book|null>(null);
  const [loading,setLoading]=useState(false);
  useEffect(()=>{const update=()=>setPath(window.location.pathname); window.addEventListener('popstate',update);window.addEventListener('quiet:navigate',update);return()=>{window.removeEventListener('popstate',update);window.removeEventListener('quiet:navigate',update);};},[]);
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
  if(isReader) return loading?<div className="reader-route-loading">Menyiapkan halaman cerita…</div>:readerBook?<ReaderApp key={readerBook.id} bookId={readerBook.id} bookTitle={readerBook.title} onExit={()=>navigate(`/cerita/${readerBook.slug}`)} episodeNumber={Number(new URLSearchParams(window.location.search).get('episode'))||undefined}/>:<div className="reader-route-loading"><h2>Cerita tidak tersedia.</h2><button onClick={()=>navigate('/cerita')}>Kembali ke perpustakaan</button>{!isConfigured&&<p>Supabase belum dikonfigurasi.</p>}</div>;
  if(path.startsWith('/studio')) return <Studio path={path}/>;
  return <PublicLibrary path={path}/>;
}
