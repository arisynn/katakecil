"""Static CSS-cascade QA fixture; NOT a full React/browser app integration test."""
from pathlib import Path
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'screenshots'
OUT.mkdir(exist_ok=True)
THEMES = {
    'light': {'background':'rgb(244, 248, 253)', 'surface':'rgb(255, 255, 255)', 'muted':'#506781', 'border':'#D5E3F2'},
    'dark': {'background':'rgb(8, 20, 37)', 'surface':'rgb(16, 36, 61)', 'muted':'#B2C5DA', 'border':'#294665'},
}
fixture = (ROOT / 'theme-fixture.html').read_text()
def inline_css(match):
    href = match.group(1)
    stylesheet = (ROOT / href).resolve()
    return '<style>' + stylesheet.read_text() + '</style>'
fixture = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_css, fixture)
with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    for theme, expected in THEMES.items():
        for width, height in [(320, 720),(390, 844),(768, 1024),(1440, 900)]:
            page = browser.new_page(viewport={'width':width,'height':height},device_scale_factor=1)
            page.set_content(fixture,wait_until="load")
            page.evaluate("theme => {document.documentElement.dataset.appTheme=theme; document.querySelector('.v6-public').dataset.kkTheme=theme; document.querySelector('.v6-studio-app').dataset.kkTheme=theme}",theme)
            values = page.evaluate("""() => {
              const site=document.querySelector('.v6-public');const studio=document.querySelector('.v6-studio-app');
              const empty=document.querySelector('.kk-v7-empty');const s=getComputedStyle(site);
              return {background:getComputedStyle(document.body).backgroundColor,
                surface:getComputedStyle(empty).backgroundColor,muted:s.getPropertyValue('--kk-muted').trim(),
                border:s.getPropertyValue('--kk-border').trim(),studioMuted:getComputedStyle(studio).getPropertyValue('--kk-muted').trim(),
                studioBorder:getComputedStyle(studio).getPropertyValue('--kk-border').trim(),
                pageScrollWidth:document.documentElement.scrollWidth,windowWidth:innerWidth,
                dotHeight:document.querySelector('.kk-v7-notice-dots button').getBoundingClientRect().height}
            }""")
            for key in ['surface','muted','border']:
                assert values[key] == expected[key], (theme,width,key,values[key],expected[key])
            assert values['studioMuted'] == expected['muted'], (theme,width,'studioMuted',values)
            assert values['studioBorder'] == expected['border'], (theme,width,'studioBorder',values)
            assert values['pageScrollWidth'] <= values['windowWidth'], (theme,width,'horizontal overflow',values)
            assert values['dotHeight'] >= 44, (theme,width,'carousel tap target',values)
            if width in [390,1440]:page.screenshot(path=str(OUT/f'collection-{theme}-{width}.png'),full_page=False)
            print(f'PASS static CSS {theme} {width}px: Sapphire aliases, empty state, Studio, no overflow, carousel target')
            page.close()
    browser.close()
