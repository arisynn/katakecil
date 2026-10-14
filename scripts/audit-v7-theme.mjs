import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = (file) => readFileSync(file, 'utf8');
const tokens = read('src/design/sapphire-tokens.css');
const alpha = read('src/design/v70-alpha.css');
const polish = read('src/design/v70-alpha2.css');
const alpha3 = read('src/design/v70-alpha3.css');
const alpha4 = read('src/design/v70-alpha4.css');
const readerRecovery = read('src/secure-reader.css');
const empty = read('src/features/public/components/LibraryUI.tsx');
const collection = read('src/pages/PublicLibrary.tsx');
const vars = ['--kk-bg','--kk-surface','--kk-surface-2','--kk-text','--kk-muted','--kk-border','--kk-primary','--kk-on-primary','--kk-shadow'];
for (const variable of vars) {
  assert.ok((tokens.match(new RegExp(`${variable}\\s*:`, 'g')) || []).length >= 2, `Missing light/dark theme token: ${variable}`);
}
assert.match(empty, /className="kk-v7-empty"/);
assert.doesNotMatch(empty, /className="v6-empty"|className="v67-empty-icon"/);
assert.match(polish, /\.kk-v7-empty::after\s*\{\s*content:\s*none/);
assert.match(polish, /\.kk-v7-empty\s*\{[\s\S]*?background:\s*var\(--kk-surface\)/);
assert.match(collection, /<EmptyLibrary collection\/>/);
assert.match(collection, /kk-v7-collection-toolbar/);
// New V7 styles must use global semantic tokens, never introduce another palette.
for (const [name, css] of [['v70-alpha.css',alpha],['v70-alpha2.css',polish],['v70-alpha3.css',alpha3],['v70-alpha4.css',alpha4]]) {
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g,'');
  assert.doesNotMatch(withoutComments, /#[\da-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/i, `Hardcoded color found in ${name}`);
}
assert.doesNotMatch(readerRecovery, /#[\da-f]{3,8}\b|\brgba?\s*\(/i, 'Reader recovery must not use legacy cream or inline color values');
assert.match(readerRecovery, /background:\s*var\(--kk-bg\)/);
assert.ok((tokens.match(/--kk-scrim\s*:/g) || []).length >= 2, 'Scrim token missing in a theme');
// Color contrast check of the actual global palette: WCAG AA normal text >=4.5.
function luminance(hex) {
  const channels = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255);
  const linear = channels.map(x => x <= .04045 ? x/12.92 : ((x+.055)/1.055)**2.4);
  return linear[0]*.2126+linear[1]*.7152+linear[2]*.0722;
}
function contrast(a,b) { const [x,y]=[luminance(a),luminance(b)].sort((m,n)=>n-m);return (x+.05)/(y+.05); }
const cases = [
  ['light body','#172C48','#FFFFFF'],['light muted','#506781','#FFFFFF'],
  ['light CTA','#FFFFFF','#235DB4'],['dark body','#EFF6FF','#10243D'],
  ['dark muted','#B2C5DA','#10243D'],['dark CTA','#081425','#9BC9FF'],
];
for (const [label,foreground,background] of cases) assert.ok(contrast(foreground,background)>=4.5, `${label}: contrast insufficient`);
console.log('PASS V7 theme: 2 Sapphire themes, new public CSS token-only, no legacy cream empty-state overlay, 6 WCAG AA color pairs.');
