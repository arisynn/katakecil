from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFont
import base64,re
from playwright.sync_api import sync_playwright
root=Path('/mnt/data/katakecil-v63-work')
preview=root/'_visual_check';preview.mkdir(exist_ok=True)
assets='/assets/v6/'
def data_uri(path):
 b=(root/path).read_bytes();return 'data:image/webp;base64,'+base64.b64encode(b).decode()
css_text='\n'.join((root/'src/design'/x).read_text() for x in ['v6.css','v61-loading-mobile.css','v62-theme.css','v63-ios.css'])
css_text=re.sub(r"url\(['\"]?(/assets/v6/[^)'\"]+)['\"]?\)",lambda m:'url("'+data_uri('public'+m.group(1))+'")',css_text)
css='<style>'+css_text+'</style>' 
cover=lambda i: f'<div class="v6-cover v6-fallback-cover"><img class="v6-cover-image" src="{data_uri(f"public/assets/v6/covers/{i}.webp")}"></div>'
books=[('01-senja','Senja di Ujung Kota','Romansa'),('02-langit','Langit yang Sama','Romansa'),('03-jejak','Jejak di Kertas','Slice of Life'),('04-ruang','Ruang di Antara','Drama'),('05-hujan','Sebelum Hujan','Romansa'),('06-rumah','Rumah Kedua','Keluarga')]
header='''<header class="v6-public-header"><div class="v6-header-inner"><button class="v6-brand"><span class="v6-brand-symbol">✦</span>KataKecil</button><div class="v6-header-actions"><button class="v6-mobile-search">⌕</button><div class="v63-mobile-menu-wrap"><button class="v63-menu-trigger">☰</button></div></div></div></header>'''
nav=lambda current: '<nav class="v6-public-bottom">'+''.join(f'<button class="{"active" if current==name else ""}"><span style="font-size:19px">{icon}</span><span>{name}</span></button>' for name,icon in [('Beranda','⌂'),('Perpustakaan','▣'),('Koleksi','♧'),('Tentang','ⓘ')])+'</nav>'
card=lambda b: f'<article class="v6-story-card"><button class="v6-story-open">{cover(b[0])}<span class="v6-story-meta"><strong>{b[1]}</strong><small>{b[2]}</small></span></button><button class="v6-bookmark">♧</button></article>'
continuation=f'<section class="v6-continue"><div class="v6-section-heading"><h2>Lanjut Membaca</h2><button class="v6-see-all">Lihat Semua ›</button></div><div class="v6-continue-card"><div class="v6-continue-cover">{cover("01-senja")}</div><div class="v6-continue-info"><strong>Senja di Ujung Kota</strong><span>Bab 12 · 68% selesai</span><button class="v6-continue-action">Lanjutkan →</button></div></div></section>'
featured='<section class="v6-featured"><div class="v6-section-heading"><h2>Cerita Pilihan</h2><button class="v6-see-all">Lihat Semua ›</button></div><div class="v6-featured-grid">'+''.join(card(b) for b in books[:2])+'</div></section>'
newest='<section class="v6-newest"><div class="v6-section-heading"><h2>Terbaru Ditambahkan</h2></div><div class="v6-newest-grid">'+''.join(card(b) for b in books[2:6])+'</div></section>'
home=f'''{header}<main class="v6-home"><section class="v6-hero"><div class="v6-hero-shade"></div><div class="v6-hero-copy"><span class="v6-hero-kicker">✦ &nbsp; TEMPAT CERITA BERMULA</span><h1>Cerita<br>yang Tinggal<br>Lebih Lama</h1><p>Temukan kisah yang menemani harimu, dalam kata-kata yang selalu punya tempat untuk kembali.</p><button class="v6-button v6-button-gold">Mulai Membaca &nbsp; →</button></div></section><div class="v6-home-sections"><div class="v6-home-row">{continuation}{featured}</div>{newest}</div></main>{nav('Beranda')}'''
library=f'''{header}<main class="v6-library-page"><div class="v6-library-intro"><span class="v63-eyebrow">✦ &nbsp; JELAJAHI CERITA</span><h1>Perpustakaan</h1><p>Ribuan kata, satu tempat untuk kembali.</p></div><div class="v6-library-tools"><div class="v6-library-search"><span>⌕</span><input placeholder="Cari cerita, penulis, atau genre..."></div><div class="v6-genre-pills">{''.join(f'<button class="{"selected" if g=="Semua" else ""}">{g}</button>' for g in ['Semua','Romansa','Drama','Fantasi','Slice of Life'])}</div></div><div class="v6-library-grid">{''.join(card(b) for b in books)}</div></main>{nav('Perpustakaan')}'''
detail=f'''<main class="v6-detail-page"><div class="v6-detail-backdrop"><picture><img src="{data_uri("public/assets/v6/covers/01-senja.webp")}"></picture></div><div class="v6-detail-content"><button class="v6-detail-back">←<span>Perpustakaan</span></button><section class="v6-detail-hero"><div class="v6-detail-cover">{cover("01-senja")}</div><div class="v6-detail-info"><h1>Senja di Ujung Kota</h1><div class="v6-detail-tags"><span>Romansa</span><span>Slice of Life</span></div><div class="v6-detail-numbers"><span>◉ &nbsp; 12 Bab</span><span>✦ &nbsp; Bersambung</span></div><p>Tentang dua hati yang selalu bertemu di waktu yang salah, namun tetap memilih untuk tinggal, meski dunia tak pernah benar-benar mendukung.</p><div class="v6-detail-actions"><button class="v6-button v6-button-gold">Mulai Membaca →</button></div></div></section><div class="v6-detail-bottom"><section class="v6-chapters"><div class="v6-chapters-title"><h2>Daftar Bab</h2><span>Urut: Terbaru</span></div>{''.join(f'<button class="v6-chapter"><span>{i}.</span><div><strong>{t}</strong><small>12 Apr 2026</small></div><span>›</span></button>' for i,t in enumerate(['Awal yang Tak Disengaja','Kota yang Sama','Percakapan di Senja Hari','Hal yang Tak Pernah Diucapkan'],1))}</section></div></div></main>'''
settings='''<div class="v6-reader-settings-scrim"><section class="v6-reader-settings" data-reader-settings-theme="THEME"><div class="v6-reader-settings-header"><h2>Pengaturan Membaca</h2><button>×</button></div><div class="v6-reader-settings-scroll"><div class="v6-reader-settings-group"><h3>Tema Tampilan</h3><button class="v62-follow-theme selected">◐ &nbsp; Ikuti tema aplikasi &nbsp; ✓</button><div class="v6-theme-tiles">'''+''.join(f'<button><span class="v6-theme-preview v63-theme-{t}" style="background-color:{c}">♧</span><span>{name}</span></button>' for t,name,c in [('white','Paper','#fff4e6'),('night','Malam','#0e1d30'),('sepia','Sepia','#E9D5B5'),('calm','Calm','#AFCFC8')])+'''</div></div><div class="v6-reader-settings-group"><h3>Ukuran Teks <span>100%</span></h3><div class="v6-slider-row"><span>A</span><input type="range" value="50"><span class="large">A</span></div></div><div class="v6-reader-settings-group"><h3>Jenis Font</h3><div class="v6-settings-segments"><button>Default</button><button class="selected">Serif</button><button>Sans</button></div></div><div class="v6-reader-settings-group"><h3>Jarak Baris</h3><div class="v6-settings-segments"><button>Rapat</button><button class="selected">Normal</button><button>Lega</button></div></div><div class="v6-reader-settings-group"><h3>Lebar Halaman</h3><div class="v6-settings-segments"><button>Lebar</button><button class="selected">Sedang</button><button>Sempit</button></div></div></div></section></div>'''
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--allow-file-access-from-files'])
 for theme in ['dark','light']:
  for name,body in [('home',home),('library',library),('detail',detail),('settings',settings.replace('THEME',theme))]:
   html=f'''<!doctype html><html data-app-theme="{theme}"><head><meta name="viewport" content="width=device-width,initial-scale=1">{css}<style>body{{margin:0}}.v6-public{{min-height:100vh}}</style></head><body><div class="site-shell v6-public {'v63-public-detail' if name=='detail' else ''}" data-kk-theme="{theme}">{body}</div></body></html>'''
   f=preview/f'{theme}-{name}.html';f.write_text(html)
   page=browser.new_page(viewport={'width':390,'height':844},device_scale_factor=1)
   page.set_content(html,wait_until='domcontentloaded');page.wait_for_timeout(350)
   page.screenshot(path=str(preview/f'{theme}-{name}.png'))
   if name=='home':
    page.evaluate('window.scrollTo(0,550)');page.wait_for_timeout(200)
    page.screenshot(path=str(preview/f'{theme}-header-scroll.png'))
   page.close()
 browser.close()
# Contact sheet 4 screens across x2 rows, caption strips for clarity.
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
W,H=390,844
sheet=Image.new('RGB',(W*4+5*18,H*2+3*55),(28,33,45))
d=ImageDraw.Draw(sheet)
for ri,theme in enumerate(['dark','light']):
 for ci,name in enumerate(['home','library','detail','settings']):
  im=Image.open(preview/f'{theme}-{name}.png').convert('RGB')
  x=ci*(W+18)+18;y=ri*(H+55)+45
  sheet.paste(im,(x,y))
  d.text((x,y-30),f'{theme.upper()} · {name.upper()}',font=font,fill=(245,233,215))
sheet.save('/mnt/data/KataKecil_V6_3_iOS_Mobile_Preview.jpg',quality=86,optimize=True)
print('Preview created',sheet.size)
