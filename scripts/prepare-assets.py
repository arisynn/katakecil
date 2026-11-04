"""Refresh the self-hosted demo books, fonts, and licenses (network required)."""
import urllib.request,concurrent.futures,pathlib,re,urllib.parse
root=pathlib.Path(__file__).resolve().parents[1]/'dist'
book_root=root.parent/'tests'/'fixtures'/'epubs'
book_root.mkdir(parents=True,exist_ok=True)
books=[('alice',11),('pride',1342),('frankenstein',84),('sherlock',1661),('treasure',120),('time',35)]
(root/'fonts').mkdir(exist_ok=True)
def fetch(item):
 name,id=item
 urllib.request.urlretrieve(f'https://www.gutenberg.org/ebooks/{id}.epub.noimages',book_root/f'{name}.epub')
 return name
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
 for name in pool.map(fetch,books):print('Downloaded',name)
font_groups=[
 ('font', [('DM Sans','400;500;600;700'),('Fraunces','400;500;600'),('Lora','400;500;600')]),
 ('reading',[('Plus Jakarta Sans','400'),('Merriweather','400'),('JetBrains Mono','400')])
]
styles=[]
for prefix,families in font_groups:
 query='&'.join('family='+urllib.parse.quote_plus(name)+':wght@'+weights for name,weights in families)
 css=urllib.request.urlopen('https://fonts.googleapis.com/css2?'+query+'&display=swap').read().decode()
 for i,url in enumerate(dict.fromkeys(re.findall(r'https://[^)]+',css))):
  filename=f'{prefix}-{i}.ttf'
  urllib.request.urlretrieve(url,root/'fonts'/filename)
  css=css.replace(url,'./fonts/'+filename)
 styles.append(css)
(root/'fonts.css').write_text('\n'.join(styles))
for slug,name in [('dmsans','DM-Sans'),('fraunces','Fraunces'),('lora','Lora'),('plusjakartasans','Plus-Jakarta-Sans'),('merriweather','Merriweather'),('jetbrainsmono','JetBrains-Mono')]:
 urllib.request.urlretrieve(f'https://raw.githubusercontent.com/google/fonts/main/ofl/{slug}/OFL.txt',root/'fonts'/f'{name}-OFL.txt')
