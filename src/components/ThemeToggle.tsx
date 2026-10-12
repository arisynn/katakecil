import React, {useEffect, useRef, useState} from 'react';
import {Check, LaptopMinimal, Moon, Sun} from 'lucide-react';
import type {UiTheme, AppThemePreference} from '../hooks/useUiTheme';

export default function ThemeToggle({theme, preference, onPreferenceChange}: {
  theme:UiTheme; preference:AppThemePreference; onPreferenceChange:(next:AppThemePreference)=>void;
}) {
  const [open,setOpen]=useState(false);
  const container=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!open)return;
    const close=(e:PointerEvent)=>{if(!container.current?.contains(e.target as Node))setOpen(false)};
    const escape=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false)};
    document.addEventListener('pointerdown',close);
    document.addEventListener('keydown',escape);
    return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape)};
  },[open]);
  return <div className="kk-theme-picker" ref={container}>
    <button type="button" className="v53-theme-toggle" onClick={()=>setOpen(x=>!x)}
      aria-expanded={open} aria-haspopup="true" aria-label="Pilih tema aplikasi"
      title={`Tema aplikasi: ${preference==='system'?'mengikuti perangkat':preference==='light'?'terang':'gelap'}`}>
      {preference==='system'?<LaptopMinimal size={19}/>:theme==='dark'?<Moon size={19}/>:<Sun size={19}/>}
    </button>
    {open&&<div className="kk-theme-menu" role="group" aria-label="Tema aplikasi">
      {([{value:'system',label:'Ikuti perangkat',icon:LaptopMinimal},{value:'light',label:'Terang',icon:Sun},{value:'dark',label:'Gelap',icon:Moon}] as const).map(item=><button
        key={item.value} type="button" aria-pressed={preference===item.value}
        onClick={()=>{onPreferenceChange(item.value);setOpen(false)}}><item.icon size={17}/><span>{item.label}</span>{preference===item.value&&<Check size={15}/>}</button>)}
    </div>}
  </div>;
}
