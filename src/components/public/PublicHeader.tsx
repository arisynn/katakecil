import React, {useState} from 'react';
import { BookOpen, House, Info, LibraryBig, Search, Menu, X, Feather, Bookmark, ArrowRight } from 'lucide-react';
import { navigate } from '../../utils/nav';

const links = [
  {to:'/',label:'Beranda',icon:House},
  {to:'/cerita',label:'Perpustakaan',icon:BookOpen},
  {to:'/koleksi',label:'Koleksi',icon:Bookmark},
  {to:'/tentang',label:'Tentang',icon:Info},
];
export default function PublicHeader({path}: {
  path:string;
}) {
  const [search,setSearch] = useState('');
  const [menu,setMenu] = useState(false);
  const active = (to:string) => path===to || (to==='/cerita'&&path.startsWith('/cerita/'));
  const submit=(event:React.FormEvent)=>{event.preventDefault();setMenu(false);navigate(`/cerita${search.trim()?`?q=${encodeURIComponent(search.trim())}`:''}`);};
  return <>
    <header className="v6-public-header">
      <div className="v6-header-inner">
        <button className="v6-brand" type="button" onClick={()=>navigate('/')} aria-label="KataKecil, beranda"><span className="v6-brand-symbol"><Feather size={19}/></span>KataKecil</button>
        <nav className="v6-desktop-links" aria-label="Navigasi publik">{links.filter(l=>l.to!=='/koleksi').map(l=><button key={l.to} aria-current={active(l.to)?'page':undefined} className={active(l.to)?'is-active':''} onClick={()=>navigate(l.to)}>{l.label}</button>)}</nav>
        <div className="v6-header-actions">
          <form className="v6-header-search" role="search" onSubmit={submit}><Search size={15}/><input aria-label="Cari cerita" placeholder="Cari cerita..." value={search} onChange={e=>setSearch(e.target.value)}/><button aria-label="Jalankan pencarian" type="submit"><ArrowRight size={15}/></button></form>
          <button className="v6-mobile-search" aria-label="Cari cerita" onClick={()=>navigate('/cerita?focus=1')}><Search size={19}/></button>
          <button className="v6-studio-entry" onClick={()=>navigate('/studio')}>Masuk</button>
          <button className="v6-mobile-menu-button" aria-label="Buka menu" aria-expanded={menu} onClick={()=>setMenu(v=>!v)}>{menu?<X size={21}/>:<Menu size={21}/>}</button>
        </div>
      </div>
      {menu&&<nav className="v6-mobile-menu" aria-label="Menu lainnya">{links.map(l=><button key={l.to} onClick={()=>{navigate(l.to);setMenu(false)}}><l.icon size={18}/>{l.label}</button>)}<button onClick={()=>{navigate('/studio');setMenu(false)}}><LibraryBig size={18}/>Studio privat</button></nav>}
    </header>
    <nav className="v6-public-bottom" aria-label="Navigasi publik mobile">{links.map(l=><button key={l.to} className={active(l.to)?'active':''} aria-current={active(l.to)?'page':undefined} onClick={()=>navigate(l.to)}><l.icon size={20}/><span>{l.label}</span></button>)}</nav>
  </>;
}
