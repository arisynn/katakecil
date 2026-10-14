import React, {useEffect, useRef, useState} from 'react';
import BrandIcon, { type BrandIconName } from '../BrandIcon';
import { navigate } from '../../utils/nav';
import { useUiTheme } from '../../hooks/useUiTheme';
import ThemeToggle from '../ThemeToggle';
import BrandLogo from '../BrandLogo';

const links: {to:string; label:string; icon:BrandIconName}[] = [
  {to:'/',label:'Beranda',icon:'home'},
  {to:'/temukan',label:'Temukan',icon:'compass'},
  {to:'/koleksi',label:'Koleksi',icon:'bookmark'},
  {to:'/tentang',label:'Tentang',icon:'info'},
];
export default function PublicHeader({path}:{path:string}) {
  const visibleLinks = links; // Stable four-item navigation, even for empty collections.
  const [search,setSearch] = useState('');
  const [menuOpen,setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  useEffect(()=>{if(!menuOpen)return;const outside=(e:PointerEvent)=>{if(!menuRef.current?.contains(e.target as Node))setMenuOpen(false)};const esc=(e:KeyboardEvent)=>{if(e.key==='Escape'){setMenuOpen(false);menuTrigger.current?.focus();}};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',esc);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',esc)};},[menuOpen]);
  useEffect(()=>{setMenuOpen(false);},[path]);
  const {theme,preference,setPreference}=useUiTheme();
  const active = (to:string) => path===to || (to==='/temukan'&&(path==='/cerita'||path.startsWith('/cerita/')));
  const hasPageSearch = path==='/temukan'||path==='/cerita'||path==='/koleksi';
  const submit=(event:React.FormEvent)=>{event.preventDefault();navigate(`/temukan${search.trim()?`?q=${encodeURIComponent(search.trim())}`:''}`);};
  return <>
    <header className="v6-public-header">
      <div className="v6-header-inner">
        <span className="v6-brand"><BrandLogo/></span>
        <nav className="v6-desktop-links" aria-label="Navigasi publik desktop">{visibleLinks.map(l=><button key={l.to} aria-current={active(l.to)?'page':undefined} className={active(l.to)?'is-active':''} onClick={()=>navigate(l.to)}>{l.label}</button>)}</nav>
        <div className="v6-header-actions">
          {!hasPageSearch&&<form className="v6-header-search" role="search" onSubmit={submit}><BrandIcon name="search" size={15}/><input aria-label="Cari cerita" placeholder="Cari cerita..." value={search} onChange={e=>setSearch(e.target.value)}/><button aria-label="Jalankan pencarian" type="submit"><BrandIcon name="arrow-right" size={15}/></button></form>}
          {!hasPageSearch&&<button className="v6-mobile-search" aria-label="Cari cerita" onClick={()=>navigate('/temukan?focus=1')}><BrandIcon name="search" size={19}/></button>}
          <div className="v63-desktop-theme"><ThemeToggle theme={theme} preference={preference} onPreferenceChange={setPreference}/></div>
          <button type="button" className="v6-studio-entry kk-v71-owner-entry" onClick={()=>navigate('/studio')} aria-label="Buka Studio khusus pemilik"><BrandIcon name="lock" size={14}/> Studio</button>
          <div className="v63-mobile-menu-wrap" ref={menuRef}>
            <button ref={menuTrigger} type="button" className="v63-menu-trigger" aria-label={menuOpen?'Tutup menu':'Buka menu'} aria-expanded={menuOpen} aria-controls="v63-mobile-menu" onClick={()=>setMenuOpen(x=>!x)}>{menuOpen?<BrandIcon name="close" size={20}/>:<BrandIcon name="menu" size={20}/>}</button>
            {menuOpen&&<div id="v63-mobile-menu" className="v63-mobile-menu" role="group" aria-label="Menu tambahan">
              <div className="v63-menu-heading"><span>Ruang KataKecil</span><small>Pengaturan dan akses penulis</small></div>
              <button type="button" className="v63-menu-studio" onClick={()=>{setMenuOpen(false);navigate('/studio')}}><BrandIcon name="pen" size={18}/><span>Buka Studio <small>Khusus pemilik</small></span><BrandIcon name="arrow-right" size={16}/></button>
              <div className="v63-menu-theme-label">Tampilan aplikasi</div>
              <div className="v63-menu-theme-choices">
                {([{value:'light',label:'Terang'},{value:'dark',label:'Gelap'}] as const).map(item=><button type="button" key={item.value} aria-pressed={preference===item.value} onClick={()=>{setPreference(item.value);setMenuOpen(false)}}>{item.value==='dark'?<BrandIcon name="moon" size={15}/>:<BrandIcon name="sun" size={15}/>}{item.label}</button>)}
              </div>
            </div>}
          </div>
        </div>
      </div>
    </header>
    <nav className="v6-public-bottom" data-items={visibleLinks.length} aria-label="Navigasi publik mobile">{visibleLinks.map(l=><button key={l.to} className={active(l.to)?'active':''} aria-current={active(l.to)?'page':undefined} onClick={()=>navigate(l.to)}><BrandIcon name={l.icon} size={20}/><span>{l.label}</span></button>)}</nav>
  </>;
}
