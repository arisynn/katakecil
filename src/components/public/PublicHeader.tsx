import React, {useEffect, useRef, useState} from 'react';
import { BookOpen, House, Info, Search, Feather, Bookmark, ArrowRight, Menu, X, PenLine, Moon, Sun } from 'lucide-react';
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
  const [menuOpen,setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(()=>{if(!menuOpen)return;const outside=(e:PointerEvent)=>{if(!menuRef.current?.contains(e.target as Node))setMenuOpen(false)};const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setMenuOpen(false)};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',esc);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',esc)};},[menuOpen]);
  useEffect(()=>{setMenuOpen(false);},[path]);
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
          <div className="v63-desktop-theme"><ThemeToggle theme={theme} preference={preference} onPreferenceChange={setPreference}/></div>
          <button className="v6-studio-entry" onClick={()=>navigate('/studio')}>Studio</button>
          <div className="v63-mobile-menu-wrap" ref={menuRef}>
            <button type="button" className="v63-menu-trigger" aria-label={menuOpen?'Tutup menu':'Buka menu'} aria-expanded={menuOpen} aria-controls="v63-mobile-menu" onClick={()=>setMenuOpen(x=>!x)}>{menuOpen?<X size={20}/>:<Menu size={20}/>}</button>
            {menuOpen&&<div id="v63-mobile-menu" className="v63-mobile-menu" role="group" aria-label="Menu tambahan">
              <div className="v63-menu-heading"><span>Ruang KataKecil</span><small>Pengaturan dan akses penulis</small></div>
              <button type="button" className="v63-menu-studio" onClick={()=>{setMenuOpen(false);navigate('/studio')}}><PenLine size={18}/><span>Buka Studio <small>Khusus pemilik</small></span><ArrowRight size={16}/></button>
              <div className="v63-menu-theme-label">Tampilan aplikasi</div>
              <div className="v63-menu-theme-choices">
                {([{value:'light',label:'Terang'},{value:'dark',label:'Gelap'}] as const).map(item=><button type="button" key={item.value} aria-pressed={preference===item.value} onClick={()=>{setPreference(item.value);setMenuOpen(false)}}>{item.value==='dark'?<Moon size={15}/>:<Sun size={15}/>}{item.label}</button>)}
              </div>
            </div>}
          </div>
        </div>
      </div>
    </header>
    <nav className="v6-public-bottom" aria-label="Navigasi publik mobile">{links.map(l=><button key={l.to} className={active(l.to)?'active':''} aria-current={active(l.to)?'page':undefined} onClick={()=>navigate(l.to)}><l.icon size={20}/><span>{l.label}</span></button>)}</nav>
  </>;
}
