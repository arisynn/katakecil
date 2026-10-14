"""Chromium CSS fixture QA using bundled stylesheet and SVG bytes, no React runtime."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import re, base64
root=Path(__file__).resolve().parent.parent
screenshots=root/'qa/screenshots';screenshots.mkdir(parents=True,exist_ok=True)
fixture=(root/'qa/studio-beta2-fixture.html').read_text()
def inline_css(m):
  file=(root/'qa'/m.group(1)).resolve()
  return '<style>'+file.read_text()+'</style>'
fixture=re.sub(r'<link rel="stylesheet" href="([^"]+)">',inline_css,fixture)
for variant in ('light','dark'):
  brand=base64.b64encode((root/f'public/brand/katakecil-wordmark-{variant}.svg').read_bytes()).decode()
  fixture=fixture.replace(f'/brand/katakecil-wordmark-{variant}.svg',f'data:image/svg+xml;base64,{brand}')
# Test the same asset mask bytes in Chromium without a network-dependent localhost server.
icon_map={p.stem:f'data:image/svg+xml;base64,{base64.b64encode(p.read_bytes()).decode()}' for p in (root/'public/assets/v7/icons').glob('*.svg')}
fixture=re.sub(r'<script>for\(const icon[\s\S]*?</script>', '',fixture)
fixture=fixture.replace('</body>',f'<script>const ICONS={__import__("json").dumps(icon_map)};for(const icon of document.querySelectorAll("[data-icon]")){{const url=`url("${{ICONS[icon.dataset.icon]}}")`;icon.style.maskImage=url;icon.style.webkitMaskImage=url;}}</script></body>')
with sync_playwright() as p:
  browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for theme in ('light','dark'):
    for width,height in ((320,720),(390,844),(768,1024),(1440,900)):
      page=browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
      page.set_content(fixture,wait_until='load')
      page.evaluate('theme=>{document.documentElement.dataset.appTheme=theme;document.querySelector(".v6-studio-app").dataset.kkTheme=theme}',theme)
      page.wait_for_timeout(550)
      data=page.evaluate('''() => {
        const root=document.querySelector('.v6-studio-app');
        const panel=document.querySelector('.v72-writing-guide');
        const icon=document.querySelector(innerWidth<=820 ? '.studio-mobile-top .qa-icon' : '.studio-sidebar .qa-icon');
        const s=getComputedStyle(root);
        return {scrollWidth:document.documentElement.scrollWidth,viewport:innerWidth,
          iconMask:getComputedStyle(icon).maskImage,iconWidth:icon.getBoundingClientRect().width,
          primary:s.getPropertyValue('--kk-primary').trim(),bg:s.getPropertyValue('--kk-bg').trim(),
          panelBg:getComputedStyle(panel).backgroundColor};
      }''')
      assert data['scrollWidth']<=data['viewport'],(theme,width,'overflow',data)
      assert 'data:image/svg+xml' in data['iconMask'],(theme,width,'SVG icon mask missing',data)
      assert data['iconWidth']>=18,(theme,width,'icon size',data)
      assert data['primary']==('#235DB4' if theme=='light' else '#9BC9FF'),(theme,width,'accent',data)
      if width in (390,1440):page.screenshot(path=str(screenshots/f'studio-{theme}-{width}.png'),full_page=True)
      print('PASS Beta2 CSS fixture',theme,width,'px')
      page.close()
  browser.close()
