import React, {useState} from 'react';
import { BookOpen, House, Info, Search, Feather, Bookmark, ArrowRight } from 'lucide-react';
import { navigate } from '../../utils/nav';
import { useUiTheme } from '../../hooks/useUiTheme';
import ThemeToggle from '../ThemeToggle';

const links = [
  {to:'/',label:'Beranda',icon:House},
  {to:'/cerita',label:'Perpustakaan',icon:BookOpen},
  {to:'/koleksi',label:'Koleksi',icon:Bookmark},
  {to:'/tentang',label:'Tentang',icon:Info},
];
export default function PublicHeader({path}:{path:string}) {
  const [search,setSearch] = useState('');
  const {theme,preference,setPreference}=useUiTheme();
  const active = (to:string) => path===to || (to==='/cerita'&&path.startsWith('/cerita/'));
  const hasPageSearch = path==='/cerita'||path==='/koleksi';
  const submit=(event:React.FormEvent)=>{event.preventDefault();navigate(`/cerita${search.trim()?`?q=${encodeURIComponent(search.trim())}`:''}`);};
  return <>
    <header className="v6-public-header">
      <div className="v6-header-inner">
        <span className="v6-brand"><span className="v6-brand-symbol"><Feather size={19}/></span>KataKecil</span>
        <nav className="v6-desktop-links" aria-label="Navigasi publik desktop">{links.filter(l=>l.to!=='/koleksi').map(l=><button key={l.to} aria-current={active(l.to)?'page':undefined} className={active(l.to)?'is-active':''} onClick={()=>navigate(l.to)}>{l.label}</button>)}</nav>
        <div className="v6-header-actions">
          {!hasPageSearch&&<form className="v6-header-search" role="search" onSubmit={submit}><Search size={15}/><input aria-label="Cari cerita" placeholder="Cari cerita..." value={search} onChange={e=>setSearch(e.target.value)}/><button aria-label="Jalankan pencarian" type="submit"><ArrowRight size={15}/></button></form>}
          {!hasPageSearch&&<button className="v6-mobile-search" aria-label="Cari cerita" onClick={()=>navigate('/cerita?focus=1')}><Search size={19}/></button>}
          <ThemeToggle theme={theme} preference={preference} onPreferenceChange={setPreference}/>
          <button className="v6-studio-entry" onClick={()=>navigate('/studio')}>Studio</button>
        </div>
      </div>
    </header>
    <nav className="v6-public-bottom" aria-label="Navigasi publik mobile">{links.map(l=><button key={l.to} className={active(l.to)?'active':''} aria-current={active(l.to)?'page':undefined} onClick={()=>navigate(l.to)}><l.icon size={20}/><span>{l.label}</span></button>)}</nav>
  </>;
}
