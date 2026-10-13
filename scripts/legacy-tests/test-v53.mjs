// No browser/network needed. V5.4 rebaselines only intentional palette + branding edits.
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = file => readFileSync(file, 'utf8');
const readerBaseline = {
  'src/SecureReaderApp.tsx': '3bed290d82e2d26d294951fc784ff81244b4c3ba1c50ea7b6d43b54738c29901',
  'src/ReaderApp.tsx': '3b00e0a0a0b15f9eb54fb7552c2b3d53e557c2d3372a48c74b685ea2f598ad9e',
  'src/components/ReaderPage.tsx': '7c452bf2771afb7036b910d9e166584573ad73f43123b6f24163f60085947aa8',
  'src/components/ReaderControls.tsx': '29a0541b04ddfc10dc8a2323c912dcab47727710c1df330f6a3c0796308bde27',
  'src/components/ReaderPanels.tsx': '94fa66988e8b77e7a177c9185459a0a2f8c4b95a7640b2dea733ed2c37e29108',
  'src/components/ReadingSettingsModal.tsx': 'ffdc6b1f2fa56d565841e65b2834468f70a4af8fd40a0b21c3372ddaf688a350',
  'src/components/PageMeasurer.tsx': '1f858e48cbfb23ba2353572f0f31ae7e58bf0cf50a2b484a70f4a308271dee7c',
  'src/utils/pagination.ts': '965a272af1ad77804a0b8468ef581dfc653338e9e0b9af588265f86e60a0c81c',
  'src/secure-reader.css': 'ff8e351cda000f690c61e1395fadcc3d09a2343068b203e7c43fdf17cbf75ced',
  'src/index.css': 'c0bb84adae9161fe15800f98baf3b570820bf6c8594c40dfd71d01b008c4e968',
};
for (const [file, expected] of Object.entries(readerBaseline)) {
  const actual = createHash('sha256').update(readFileSync(file)).digest('hex');
  assert.equal(actual, expected, `Reader baseline changed unexpectedly: ${file}`);
}
const publicUi=read('src/pages/PublicLibrary.tsx');
const header=read('src/components/public/PublicHeader.tsx');
const studio=read('src/pages/Studio.tsx');
const app=read('src/App.tsx');
const css=read('src/design/v53-mobile.css');
const theme=read('src/hooks/useUiTheme.ts');
assert.ok(!publicUi.includes('to="/studio"') && !header.includes("to:'/studio'"), 'No private Studio CTA in public reader navigation.');
assert.match(header,/Beranda/);
assert.match(header,/Perpustakaan/);
assert.match(header,/Tentang Penulis/);
assert.match(studio,/tabs\.slice\(0,4\)/);
assert.match(studio,/Lainnya/);
assert.match(studio,/\/studio\/sampah/);
assert.match(studio,/\/studio\/impor/);
assert.match(app,/if\(isReader\)/);
assert.match(app,/secure-reader\.css/);
assert.match(app,/v53-mobile\.css/);
assert.match(theme,/katakecil_ui_theme_v53/);
assert.ok(!theme.includes('quiet_reader_settings'), 'UI theme must not override reader preferences.');
assert.ok(css.includes('@media(max-width:767px)'), 'New layout must stay mobile-scoped.');
const code=css.replace(/\/\*[\s\S]*?\*\//g, '');
assert.ok(!/(?:^|})\s*(?:\.quiet-app|\.reader-|\.chapter-)/m.test(code), 'Do not style Reader from V5.3 CSS');
assert.ok(!/review|125K|4\.9/.test(header+publicUi), 'No fictional statistics on public UI.');
for(const mode of ['light','dark']){
 for(const scene of ['reading-window','studio-desk','library-corner']){
   const file=`public/assets/v53/${scene}-${mode}.webp`;
   assert.ok(statSync(file).size>3000 && statSync(file).size<60000, `Missing/compressed asset: ${file}`);
 }
}
console.log('PASS V5.3 base: reader core preserved, palette/branding allowlisted; mobile-only CSS; public/writer navigation separated; light/dark assets present.');
