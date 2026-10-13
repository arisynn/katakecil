/** V6.2 theme/navigation regression checks. Offline; no Supabase credentials needed. */
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {runInNewContext} from 'node:vm';
const require=createRequire(import.meta.url);
const read=f=>readFileSync(f,'utf8');
const css=read('src/design/v62-theme.css');
const boot=read('index.html');
const header=read('src/components/public/PublicHeader.tsx');
const publicUi=read('src/pages/PublicLibrary.tsx');
const studio=read('src/pages/Studio.tsx');
const reader=read('src/SecureReaderApp.tsx');
const original=read('src/components/ReaderPage.tsx');
const modal=read('src/components/ReadingSettingsModal.tsx');
assert.match(css,/\.v6-public \.v6-public-header\{position:fixed/,'Header must be pinned on scroll');
assert.match(css,/--kk-bg:#F8F4EE/);
assert.match(css,/--kk-bg:#0D1729/);
assert.match(css,/\.v6-studio-app\[data-kk-theme='light'\] \.studio-sidebar/);
assert.match(css,/\.v6-public\[data-kk-theme='light'\] \.v6-library-page/);
assert.match(css,/prefers-reduced-motion/);
assert.match(css,/\.quiet-app\.reader-protected\[data-reader-theme='night'\] \.reader-stage/);
assert.match(boot,/katakecil_reader_theme_preference_v62/);
assert.match(boot,/data-reader-theme/);
assert.match(boot,/data-app-theme/);
assert.match(header,/ThemeToggle/);
assert.match(header,/v6-public-bottom/);
assert.doesNotMatch(header,/v6-mobile-menu-button|v6-mobile-menu/,'Mobile menu duplicated bottom navigation');
assert.equal((publicUi.match(/className="v6-story-open"/g)||[]).length,1);
assert.doesNotMatch(publicUi,/<button className="v6-story-meta"/);
assert.doesNotMatch(publicUi,/width:'0%'/,'No fake reading progress');
assert.match(studio,/qr_author_members/);
assert.match(studio,/getStudioLibrary/);
assert.match(studio,/setTimeout\(\(\)=>\{void save\(\);\},1700\)/);
assert.match(studio,/bulkPublishDrafts/);
assert.match(studio,/onPreferenceChange=\{setPreference\}/);
assert.match(modal,/Ikuti tema aplikasi/);
assert.match(modal,/readerPreference==='follow'/);
assert.match(reader,/setReaderThemePreference\('follow'\)/);
assert.match(reader,/READER_THEME_KEY/);
assert.match(reader,/settings=\{effectiveSettings\}/);
assert.match(original,/data-reader-theme=\{settings\.theme\}/);
for(const f of ['src/components/PageMeasurer.tsx','src/utils/pagination.ts','src/data/secureReader.ts']) assert.ok(existsSync(f));
// Verify gesture handler signatures and core reader functions remain available.
for(const handler of ['const onTap=','const onTouchStart=','const onTouchEnd=','const goTo=useCallback','const saveAt=useCallback','onCopy={e=>e.preventDefault()}']) {
  assert.ok(reader.includes(handler),`Missing reader mechanism: ${handler}`);
}
const ratio=(fg,bg)=>{
 const linear=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 const lum=hex=>linear(hex).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
 const a=lum(fg),b=lum(bg);return (Math.max(a,b)+.05)/(Math.min(a,b)+.05);
};
for(const [name,fg,bg] of [['light text','#26364B','#F8F4EE'],['dark text','#F6EFE5','#0D1729'],['light muted','#596779','#F8F4EE'],['dark muted','#B6C4D6','#0D1729'],['light button','#FFF9ED','#805321'],['dark button','#172238','#F0C98B']]) {
 const contrast=ratio(fg,bg);assert.ok(contrast>=4.5,`${name} contrast ${contrast.toFixed(2)} below 4.5:1`);
 console.log(`  ${name}: ${contrast.toFixed(2)}:1`);
}
// Exercise the actual reader-preference module after TS type stripping.
let ts;
try{ts=require('typescript');}catch{try{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript');}catch{}}
if(ts){
 const code=ts.transpileModule(read('src/utils/readerThemePreference.ts'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const values=new Map();const events=[];
 const localStorage={getItem:k=>values.has(k)?values.get(k):null,setItem:(k,v)=>values.set(k,v)};
 const exports={};runInNewContext(code,{exports,localStorage,window:{dispatchEvent:e=>events.push(e.type)},Event:class{constructor(type){this.type=type;}}});
 assert.equal(exports.getReaderThemePreference(),'follow');
 assert.equal(exports.resolveReaderTheme('follow','dark'),'night');
 assert.equal(exports.resolveReaderTheme('follow','light'),'white');
 values.set('quiet_reader_settings',JSON.stringify({theme:'sepia'}));
 assert.equal(exports.getReaderThemePreference(),'sepia','Preserve old reading preferences');
 exports.setReaderThemePreference('follow');
 assert.equal(exports.getReaderThemePreference(),'follow','Explicit follow overrides old theme');
 assert.equal(exports.resolveReaderTheme('calm','dark'),'calm','Explicit reader choice survives app changes');
 assert.deepEqual(events,['katakecil:reader-theme-change']);
}
console.log('PASS V6.2: palette contrast, fixed header, nonduplicate navigation, reader inheritance/migration, original gestures, secure Studio gate.');
