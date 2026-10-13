import React from 'react';
import { X, Check, AlignLeft, AlignJustify, Columns, Square, Minus, Plus, BookOpen, Type } from 'lucide-react';
import type { FontFamily, LineHeight, MarginWidth, ReadingSettings, ThemeColors, ThemeMode } from '../types/reader';
import { THEMES } from '../utils/theme';

interface Props { isOpen:boolean;onClose:()=>void;settings:ReadingSettings;theme:ThemeColors;onUpdateSettings:(next:Partial<ReadingSettings>)=>void }
const themeChoices: Array<{id:ThemeMode;label:string;image:string}> = [
  {id:'white',label:'Paper',image:'/assets/v6/reader-paper-texture.webp'},
  {id:'night',label:'Malam',image:'/assets/v6/studio-ambience.webp'},
  {id:'sepia',label:'Sepia',image:'/assets/v6/hero-library-sunset-mobile.webp'},
  {id:'calm',label:'Calm',image:'/assets/v6/covers/02-langit.webp'},
];
const fonts: Array<{id:FontFamily;label:string}> = [{id:'literata',label:'Serif'},{id:'sans',label:'Sans'},{id:'merriweather',label:'Classic'},{id:'mono',label:'Mono'}];
const lines: Array<{id:LineHeight;label:string}> = [{id:'compact',label:'Rapat'},{id:'normal',label:'Normal'},{id:'loose',label:'Lega'}];
const widths: Array<{id:MarginWidth;label:string}> = [{id:'narrow',label:'Lebar'},{id:'normal',label:'Sedang'},{id:'wide',label:'Sempit'}];
export function ReadingSettingsModal({isOpen,onClose,settings,onUpdateSettings}:Props){
 if(!isOpen)return null;
 const choices=settings.theme==='black'?[...themeChoices,{id:'black' as ThemeMode,label:'OLED Lama',image:'/assets/v6/studio-ambience.webp'}]:themeChoices;
 return <div className="v6-reader-settings-scrim" onClick={onClose} role="presentation"><section className="v6-reader-settings" role="dialog" aria-modal="true" aria-label="Pengaturan Membaca" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')onClose();}}>
  <div className="v6-reader-settings-header"><button aria-label="Tutup pengaturan" onClick={onClose}><X size={19}/></button><h2>Pengaturan Membaca</h2><button onClick={onClose} aria-label="Selesai"><Check size={19}/></button></div>
  <div className="v6-reader-settings-scroll">
   <div className="v6-reader-settings-group"><h3>Tema Tampilan</h3><div className="v6-theme-tiles">{choices.map(choice=><button key={choice.id} aria-pressed={settings.theme===choice.id} className={settings.theme===choice.id?'selected':''} onClick={()=>onUpdateSettings({theme:choice.id})}><span className="v6-theme-preview" style={{backgroundColor:THEMES[choice.id].pageBg,backgroundImage:`linear-gradient(0deg,${THEMES[choice.id].pageBg}33,transparent),url(${choice.image})`}}><BookOpen size={21}/>{settings.theme===choice.id&&<Check className="v6-theme-check" size={17}/>}</span><span>{choice.label}</span></button>)}</div></div>
   <div className="v6-reader-settings-group"><h3>Ukuran Teks <span>{settings.fontSize}%</span></h3><div className="v6-slider-row"><button onClick={()=>onUpdateSettings({fontSize:Math.max(70,settings.fontSize-10)})} disabled={settings.fontSize<=70} aria-label="Perkecil teks"><Minus size={17}/></button><span>A</span><input aria-label="Ukuran teks" type="range" min="70" max="160" step="10" value={settings.fontSize} onChange={e=>onUpdateSettings({fontSize:Number(e.target.value)})}/><span className="large">A</span><button onClick={()=>onUpdateSettings({fontSize:Math.min(160,settings.fontSize+10)})} disabled={settings.fontSize>=160} aria-label="Perbesar teks"><Plus size={17}/></button></div></div>
   <div className="v6-reader-settings-group"><h3>Jenis Font</h3><div className="v6-settings-segments">{fonts.map(f=><button key={f.id} aria-pressed={settings.fontFamily===f.id} className={settings.fontFamily===f.id?'selected':''} onClick={()=>onUpdateSettings({fontFamily:f.id})}>{f.label}</button>)}</div></div>
   <div className="v6-reader-settings-group"><h3>Jarak Baris</h3><div className="v6-settings-segments">{lines.map(line=><button key={line.id} aria-pressed={settings.lineHeight===line.id} className={settings.lineHeight===line.id?'selected':''} onClick={()=>onUpdateSettings({lineHeight:line.id})}>{line.label}</button>)}</div></div>
   <div className="v6-reader-settings-group"><h3>Lebar Halaman</h3><div className="v6-settings-segments">{widths.map(width=><button key={width.id} aria-pressed={settings.marginWidth===width.id} className={settings.marginWidth===width.id?'selected':''} onClick={()=>onUpdateSettings({marginWidth:width.id})}>{width.label}</button>)}</div></div>
   <div className="v6-reader-settings-group"><h3>Perataan Teks</h3><div className="v6-settings-segments"><button aria-pressed={settings.textAlign==='left'} className={settings.textAlign==='left'?'selected':''} onClick={()=>onUpdateSettings({textAlign:'left'})}><AlignLeft size={16}/> Kiri</button><button aria-pressed={settings.textAlign==='justify'} className={settings.textAlign==='justify'?'selected':''} onClick={()=>onUpdateSettings({textAlign:'justify'})}><AlignJustify size={16}/> Rata kiri-kanan</button></div></div>
   <div className="v6-reader-settings-group"><h3>Mode Halaman <small>(layar lebar)</small></h3><div className="v6-settings-segments"><button aria-pressed={settings.spreadMode==='single'} className={settings.spreadMode==='single'?'selected':''} onClick={()=>onUpdateSettings({spreadMode:'single'})}><Square size={17}/> Satu halaman</button><button aria-pressed={settings.spreadMode==='spread'} className={settings.spreadMode==='spread'?'selected':''} onClick={()=>onUpdateSettings({spreadMode:'spread'})}><Columns size={17}/> Dua halaman</button></div></div>
  </div><div className="v6-reader-settings-footer"><Type size={16}/> Pengaturan tersimpan otomatis di perangkat ini.</div>
 </section></div>;
}
