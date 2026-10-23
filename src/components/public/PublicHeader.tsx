import {useEffect, useRef, useState} from 'react';
import BrandIcon from '../BrandIcon';
import BrandLogo from '../BrandLogo';
import ThemeToggle from '../ThemeToggle';
import {useUiTheme} from '../../hooks/useUiTheme';
import {navigate} from '../../utils/nav';
import {isNativeApp} from '../../native/platform';
import NotificationSettings from '../../features/notifications/NotificationSettings';

export default function PublicHeader({path}:{path:string}) {
 const {theme,preference,setPreference}=useUiTheme();
 const [open,setOpen]=useState(false),[notifications,setNotifications]=useState(false);
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null);
 useEffect(()=>setOpen(false),[path]);
 useEffect(()=>{
  if(!open)return;
  const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false);};
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape'){setOpen(false);trigger.current?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);
  root.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};
 },[open]);
 return <>
  <header className="crystal-header"><div className="crystal-header-inner">
   <button type="button" className="crystal-brand-link" onClick={()=>navigate('/')} aria-label="KataKecil · Library"><BrandLogo/></button>
   <nav className="crystal-main-nav" aria-label="Navigasi utama"><button type="button" aria-current={!path.startsWith('/cerita/')?'page':undefined} onClick={()=>navigate('/')}>Library</button></nav>
   <div className="crystal-header-actions"><ThemeToggle theme={theme} preference={preference} onPreferenceChange={setPreference}/>
    <div className="crystal-menu-root" ref={root}><button ref={trigger} type="button" className="crystal-icon-button" aria-label={open?'Tutup menu':'Buka menu'} aria-expanded={open} aria-haspopup="menu" onClick={()=>setOpen(x=>!x)}><BrandIcon name={open?'close':'menu'} size={21}/></button>
     {open&&<div className="crystal-menu" role="menu" aria-label="Pengaturan KataKecil"><span className="crystal-menu-caption">RUANG KATAKECIL</span>
      <button type="button" role="menuitem" onClick={()=>{setOpen(false);navigate('/studio');}}><BrandIcon name="pen" size={18}/><span>Studio penulis</span><BrandIcon name="chevron-right" size={15}/></button>
      {isNativeApp?<button type="button" role="menuitem" onClick={()=>{setOpen(false);setNotifications(true);}}><BrandIcon name="bell" size={18}/>Notifikasi</button>:<button type="button" role="menuitem" onClick={()=>{setOpen(false);window.dispatchEvent(new Event('kk:install'));}}><BrandIcon name="download" size={18}/>Pasang aplikasi</button>}
     </div>}
    </div>
   </div>
  </div></header>
  {notifications&&<NotificationSettings onClose={()=>setNotifications(false)}/>}
 </>;
}
