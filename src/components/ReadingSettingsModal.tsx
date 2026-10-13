import React from 'react';
import { X, Check, AlignLeft, AlignJustify, Columns, Square, Minus, Plus, BookOpen, Type, Sun, Moon } from 'lucide-react';
import type { FontFamily, LineHeight, MarginWidth, ReadingSettings } from '../types/reader';
import type { UiTheme } from '../hooks/useUiTheme';

interface Props { isOpen:boolean;onClose:()=>void;settings:ReadingSettings;onUpdateSettings:(next:Partial<ReadingSettings>)=>void;appTheme:UiTheme;onAppThemeChange:(next:UiTheme)=>void }
const fonts: Array<{id:FontFamily;label:string}> = [{id:'literata',label:'Serif'},{id:'sans',label:'Sans'},{id:'merriweather',label:'Classic'},{id:'mono',label:'Mono'}];
const lines: Array<{id:LineHeight;label:string}> = [{id:'compact',label:'Rapat'},{id:'normal',label:'Normal'},{id:'loose',label:'Lega'}];
const widths: Array<{id:MarginWidth;label:string}> = [{id:'narrow',label:'Lebar'},{id:'normal',label:'Sedang'},{id:'wide',label:'Sempit'}];
export function ReadingSettingsModal({isOpen,onClose,settings,onUpdateSettings,appTheme,onAppThemeChange}:Props){
 if(!isOpen)return null;
 return <div className="v6-reader-settings-scrim" onClick={onClose} role="presentation"><section className="v6-reader-settings" data-reader-settings-theme={appTheme} role="dialog" aria-modal="true" aria-label="Pengaturan Membaca" onClick={e=>e.stopPropagation()} onKeyDown={e=>{if(e.key==='Escape')onClose();}}>
  <div className="v6-reader-settings-header"><h2>Pengaturan Membaca</h2><button onClick={onClose} aria-label="Tutup pengaturan"><X size={19}/></button></div>
  <div className="v6-reader-settings-scroll">
   <div className="v6-reader-settings-group"><h3>Tema Tampilan <small>Berlaku untuk seluruh KataKecil</small></h3>
    <div className="v64-global-theme-choices" role="group" aria-label="Tema global KataKecil">
     <button type="button" className={appTheme==='light'?'selected':''} aria-pressed={appTheme==='light'} onClick={()=>onAppThemeChange('light')}><span className="v64-theme-swatch v64-theme-swatch-light"><Sun size={24}/><BookOpen size={29}/></span><span>Terang</span>{appTheme==='light'&&<Check size={17} aria-hidden="true"/>}</button>
     <button type="button" className={appTheme==='dark'?'selected':''} aria-pressed={appTheme==='dark'} onClick={()=>onAppThemeChange('dark')}><span className="v64-theme-swatch v64-theme-swatch-dark"><Moon size={24}/><BookOpen size={29}/></span><span>Gelap</span>{appTheme==='dark'&&<Check size={17} aria-hidden="true"/>}</button>
    </div><p className="v64-theme-note">Perubahan di sini juga berlaku untuk Beranda, Perpustakaan, Daftar Bab, dan Studio.</p>
   </div>
   <div className="v6-reader-settings-group"><h3>Ukuran Teks <span>{settings.fontSize}%</span></h3><div className="v6-slider-row"><button onClick={()=>onUpdateSettings({fontSize:Math.max(70,settings.fontSize-10)})} disabled={settings.fontSize<=70} aria-label="Perkecil teks"><Minus size={17}/></button><span>A</span><input aria-label="Ukuran teks" type="range" min="70" max="160" step="10" value={settings.fontSize} onChange={e=>onUpdateSettings({fontSize:Number(e.target.value)})}/><span className="large">A</span><button onClick={()=>onUpdateSettings({fontSize:Math.min(160,settings.fontSize+10)})} disabled={settings.fontSize>=160} aria-label="Perbesar teks"><Plus size={17}/></button></div></div>
   <div className="v6-reader-settings-group"><h3>Jenis Font</h3><div className="v6-settings-segments">{fonts.map(f=><button key={f.id} aria-pressed={settings.fontFamily===f.id} className={settings.fontFamily===f.id?'selected':''} onClick={()=>onUpdateSettings({fontFamily:f.id})}>{f.label}</button>)}</div></div>
   <div className="v6-reader-settings-group"><h3>Jarak Baris</h3><div className="v6-settings-segments">{lines.map(line=><button key={line.id} aria-pressed={settings.lineHeight===line.id} className={settings.lineHeight===line.id?'selected':''} onClick={()=>onUpdateSettings({lineHeight:line.id})}>{line.label}</button>)}</div></div>
   <div className="v6-reader-settings-group"><h3>Lebar Halaman</h3><div className="v6-settings-segments">{widths.map(width=><button key={width.id} aria-pressed={settings.marginWidth===width.id} className={settings.marginWidth===width.id?'selected':''} onClick={()=>onUpdateSettings({marginWidth:width.id})}>{width.label}</button>)}</div></div>
   <div className="v6-reader-settings-group"><h3>Perataan Teks</h3><div className="v6-settings-segments"><button aria-pressed={settings.textAlign==='left'} className={settings.textAlign==='left'?'selected':''} onClick={()=>onUpdateSettings({textAlign:'left'})}><AlignLeft size={16}/> Kiri</button><button aria-pressed={settings.textAlign==='justify'} className={settings.textAlign==='justify'?'selected':''} onClick={()=>onUpdateSettings({textAlign:'justify'})}><AlignJustify size={16}/> Rata kiri-kanan</button></div></div>
   <div className="v6-reader-settings-group"><h3>Mode Halaman <small>(layar lebar)</small></h3><div className="v6-settings-segments"><button aria-pressed={settings.spreadMode==='single'} className={settings.spreadMode==='single'?'selected':''} onClick={()=>onUpdateSettings({spreadMode:'single'})}><Square size={17}/> Satu halaman</button><button aria-pressed={settings.spreadMode==='spread'} className={settings.spreadMode==='spread'?'selected':''} onClick={()=>onUpdateSettings({spreadMode:'spread'})}><Columns size={17}/> Dua halaman</button></div></div>
  </div><div className="v6-reader-settings-footer"><Type size={16}/> Pengaturan tersimpan otomatis di perangkat ini.</div>
 </section></div>;
}
