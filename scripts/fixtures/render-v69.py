from playwright.sync_api import sync_playwright
from pathlib import Path
import re
fixture=Path(__file__).with_name('v69-studio-visual.html')
html=fixture.read_text()
def inline(match):
 return '<style>'+ (fixture.parent/match.group(1)).resolve().read_text() +'</style>'
html=re.sub(r'<link rel=\"stylesheet\" href=\"([^\"]+)\">',inline,html)
import os
out=Path(os.environ.get('KK_VISUAL_OUT', '/mnt/data'))
out.mkdir(parents=True, exist_ok=True)
with sync_playwright() as p:
 browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox','--disable-web-security'])
 for theme in ['light','dark']:
  for view in ['dashboard','editor']:
   for width in [390,1440]:
    page=browser.new_page(viewport={'width':width,'height':844 if width==390 else 900}, device_scale_factor=1)
    page.set_content(html)
    page.evaluate('(args)=>{document.documentElement.dataset.appTheme=args.theme;document.querySelector(".studio-app").dataset.kkTheme=args.theme;document.body.dataset.view=args.view}', {'theme':theme,'view':view})
    page.screenshot(path=str(out/f'KataKecil_V6_9_{view}_{theme}_{width}.png'),full_page=True)
    vals=page.evaluate('''()=>{let s=getComputedStyle(document.querySelector('.studio-app'));let e=document.querySelector('.studio-panel');return {bg:s.backgroundColor,text:s.color,panel:e?getComputedStyle(e).backgroundColor:'',overflow:document.documentElement.scrollWidth>innerWidth}}''')
    assert not vals['overflow'], f'Horizontal overflow at {theme} {view} {width}'
    assert vals['bg'] == ('rgb(244, 248, 253)' if theme=='light' else 'rgb(8, 20, 37)'), vals
    assert vals['panel'] == ('rgb(255, 255, 255)' if theme=='light' else 'rgb(16, 36, 61)'), vals
    print(theme,view,width,vals)
    page.close()
 browser.close()
