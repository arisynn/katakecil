from pathlib import Path
root=Path('/mnt/data/katakecil-v63-work')
p=root/'src/components/public/PublicHeader.tsx'
s=p.read_text()
s=s.replace("import React, {useState} from 'react';", "import React, {useEffect, useRef, useState} from 'react';")
s=s.replace("import { BookOpen, House, Info, Search, Feather, Bookmark, ArrowRight } from 'lucide-react';", "import { BookOpen, House, Info, Search, Feather, Bookmark, ArrowRight, Menu, X, PenLine, Moon, Sun } from 'lucide-react';")
s=s.replace("  const [search,setSearch] = useState('');", "  const [search,setSearch] = useState('');\n  const [menuOpen,setMenuOpen] = useState(false);\n  const menuRef = useRef<HTMLDivElement>(null);\n  useEffect(()=>{if(!menuOpen)return;const outside=(e:PointerEvent)=>{if(!menuRef.current?.contains(e.target as Node))setMenuOpen(false)};const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setMenuOpen(false)};document.addEventListener('pointerdown',outside);document.addEventListener('keydown',esc);return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',esc)};},[menuOpen]);\n  useEffect(()=>{setMenuOpen(false);},[path]);")
s=s.replace('<span className="v6-brand"><span className="v6-brand-symbol"><Feather size={19}/></span>KataKecil</span>', '<button type="button" className="v6-brand" onClick={()=>navigate(\'/\')} aria-label="KataKecil — Beranda"><span className="v6-brand-symbol"><Feather size={19}/></span>KataKecil</button>')
s=s.replace('          <ThemeToggle theme={theme} preference={preference} onPreferenceChange={setPreference}/>\n          <button className="v6-studio-entry" onClick={()=>navigate(\'/studio\')}>Studio</button>', '''          <div className="v63-desktop-theme"><ThemeToggle theme={theme} preference={preference} onPreferenceChange={setPreference}/></div>
          <button className="v6-studio-entry" onClick={()=>navigate('/studio')}>Studio</button>
          <div className="v63-mobile-menu-wrap" ref={menuRef}>
            <button type="button" className="v63-menu-trigger" aria-label={menuOpen?'Tutup menu':'Buka menu'} aria-expanded={menuOpen} aria-controls="v63-mobile-menu" onClick={()=>setMenuOpen(x=>!x)}>{menuOpen?<X size={20}/>:<Menu size={20}/>}</button>
            {menuOpen&&<div id="v63-mobile-menu" className="v63-mobile-menu" role="group" aria-label="Menu tambahan">
              <div className="v63-menu-heading"><span>Ruang KataKecil</span><small>Pengaturan dan akses penulis</small></div>
              <button type="button" className="v63-menu-studio" onClick={()=>{setMenuOpen(false);navigate('/studio')}}><PenLine size={18}/><span>Buka Studio <small>Khusus pemilik</small></span><ArrowRight size={16}/></button>
              <div className="v63-menu-theme-label">Tampilan aplikasi</div>
              <div className="v63-menu-theme-choices">
                {([{value:'system',label:'Otomatis'},{value:'light',label:'Terang'},{value:'dark',label:'Gelap'}] as const).map(item=><button type="button" key={item.value} aria-pressed={preference===item.value} onClick={()=>{setPreference(item.value);setMenuOpen(false)}}>{item.value==='dark'?<Moon size={15}/>:item.value==='light'?<Sun size={15}/>:<span aria-hidden="true">◐</span>}{item.label}</button>)}
              </div>
            </div>}
          </div>''')
p.write_text(s)
p=root/'src/pages/PublicLibrary.tsx'
s=p.read_text()
s=s.replace("const episode=continuation?readProgress(continuation):null;", "const episode=continuation?readProgress(continuation):null;")
s=s.replace('<span className="v6-hero-kicker">✦ &nbsp; KATAKECIL · RUANG BACA</span>', '<span className="v6-hero-kicker">✦ &nbsp; TEMPAT CERITA BERMULA</span>')
s=s.replace('<span className="v6-hero-dots">✦ &nbsp; · &nbsp; · &nbsp; · &nbsp; ✦</span>', '')
s=s.replace('<p className="v6-hero-quote">“Di antara halaman dan senja, selalu ada cerita yang ingin tinggal.”</p>', '')
s=s.replace('<div className="v6-home-row">', '<div className="v6-home-row">')
s=s.replace('<div className="v6-library-intro"><h1>', '<div className="v6-library-intro"><span className="v63-eyebrow">✦ &nbsp; JELAJAHI CERITA</span><h1>')
s=s.replace('    <div className="v6-detail-content"><Action to="/cerita" className="v6-detail-back"><ArrowLeft size={17}/> Perpustakaan</Action>', '    <div className="v6-detail-content"><Action to="/cerita" className="v6-detail-back"><ArrowLeft size={17}/><span>Perpustakaan</span></Action>')
s=s.replace('<section className="v6-detail-hero"><div className="v6-detail-cover">', '<section className="v6-detail-hero"><div className="v6-detail-cover">')
s=s.replace('  return <div className="site-shell v6-public" data-kk-theme={theme}><PublicHeader path={path}/>', '  return <div className={`site-shell v6-public ${slug?\'v63-public-detail\':\'\'}`} data-kk-theme={theme}><PublicHeader path={path}/>')
p.write_text(s)
p=root/'src/components/ReaderControls.tsx'
s=p.read_text()
s=s.replace('<button className="control-icon" onClick={onClose} aria-label="Tutup menu pembaca">', '<button className="control-icon reader-close-menu" onClick={onClose} aria-label="Tutup menu pembaca">')
s=s.replace('<button className="control-icon reader-exit" title="Kembali ke detail cerita" aria-label="Keluar dari pembaca" onClick={onExit}>', '<button className="control-icon reader-exit" title="Kembali ke detail cerita" aria-label="Keluar dari pembaca" onClick={onExit}>')
p.write_text(s)
p=root/'src/components/ReadingSettingsModal.tsx'
s=p.read_text().replace("{id:'white',label:'Paper',image:","{id:'white',label:'Paper',image:")
s=s.replace('<div className="v6-reader-settings-header"><h2>Pengaturan Membaca</h2>', '<div className="v6-reader-settings-header"><h2>Pengaturan Membaca</h2>')
s=s.replace('<span className="v6-theme-preview" style={{backgroundColor:THEMES[choice.id].pageBg}}>', '<span className={`v6-theme-preview v63-theme-${choice.id}`} style={{backgroundColor:THEMES[choice.id].pageBg}}>')
p.write_text(s)
p=root/'src/App.tsx'
s=p.read_text().replace("import './design/v62-theme.css';", "import './design/v62-theme.css';\nimport './design/v63-ios.css';")
p.write_text(s)
p=root/'package.json'
s=p.read_text().replace('"version": "6.2.0"','"version": "6.3.0"').replace('"test:v62": "node scripts/test-v62.mjs"','"test:v62": "node scripts/test-v62.mjs",\n    "test:v63": "node scripts/test-v63.mjs"')
p.write_text(s)
