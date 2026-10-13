/** V6.3 mobile-first visual shell regression checks; no credentials required. */
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const read=(file)=>readFileSync(file,'utf8');
const css=read('src/design/v63-ios.css');
const header=read('src/components/public/PublicHeader.tsx');
const publicUi=read('src/pages/PublicLibrary.tsx');
const reader=read('src/SecureReaderApp.tsx');
const controls=read('src/components/ReaderControls.tsx');
const settings=read('src/components/ReadingSettingsModal.tsx');
const app=read('src/App.tsx');
assert.match(app,/design\/v63-ios\.css/,'V6.3 stylesheet is loaded last');
assert.match(css,/@media\(max-width:600px\)/,'Mobile layout is explicitly designed');
assert.match(css,/--v63-canvas:#F8F2E9/);
assert.match(css,/--v63-canvas:#091424/);
assert.match(css,/v6-public-header\{position:fixed/,'Mobile header remains pinned');
assert.match(css,/backdrop-filter:blur\(24px\)/,'Mobile navigation uses translucent material');
assert.match(css,/empty-library-mobile\.webp/,'Light mobile hero uses independent artwork');
assert.match(css,/hero-library-sunset-mobile\.webp/,'Dark mobile hero uses independent artwork');
assert.match(css,/v63-public-detail \.v6-public-header/,'Story detail uses only one mobile back action');
assert.match(header,/aria-expanded=\{menuOpen\}/);
assert.match(header,/aria-controls="v63-mobile-menu"/);
assert.match(header,/onClick=\{\(\)=>\{setMenuOpen\(false\);navigate\('\/studio'\)\}\}/);
assert.match(header,/document\.addEventListener\('pointerdown',outside\)/);
assert.match(header,/document\.addEventListener\('keydown',esc\)/);
assert.equal((header.match(/v6-public-bottom/g)||[]).length,1,'One mobile public navigation');
assert.equal((header.match(/<ThemeToggle/g)||[]).length,1,'One theme picker on desktop');
assert.doesNotMatch(header,/v6-mobile-menu-button/,'Old duplicated navigation removed');
assert.match(publicUi,/v63-public-detail/);
assert.match(publicUi,/className="v6-story-open"/);
assert.match(publicUi,/book\.cover_url\|\|fallbackCover/,'Original cover is always prioritized');
assert.match(settings,/readerPreference==='follow'/,'Reader can follow app theme');
assert.match(settings,/v63-theme-\$\{choice\.id\}/,'Theme swatches use visual identity');
assert.match(controls,/reader-close-menu/);
assert.match(controls,/reader-exit/);
assert.match(css,/\.reader-close-menu\{display:none/,'Mobile reader has one visible back control');
for(const fn of ['const onTap=','const onTouchStart=','const onTouchEnd=','const goTo=useCallback','const saveAt=useCallback','onCopy={e=>e.preventDefault()}']) assert.ok(reader.includes(fn),`Secure Reader changed: ${fn}`);
for(const file of ['src/data/supabase.ts','src/data/secureReader.ts','src/utils/pagination.ts','src/components/PageMeasurer.tsx']) assert.ok(existsSync(file));
let ts;
try{ts=require('typescript')}catch{ts=require('/opt/nvm/versions/node/v22.16.0/lib/node_modules/typescript')}
for(const file of ['src/App.tsx','src/components/public/PublicHeader.tsx','src/pages/PublicLibrary.tsx','src/components/ReaderControls.tsx','src/components/ReadingSettingsModal.tsx']){
 const output=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}});
 const errors=(output.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error);
 assert.equal(errors.length,0,`${file} syntax: ${errors.map(e=>e.messageText).join('; ')}`);
}
console.log('PASS V6.3: mobile-first dark/light layout, fixed header, unique navigation actions, cover priority, independent reader themes, unchanged secure-reader mechanics, TS/TSX syntax.');
