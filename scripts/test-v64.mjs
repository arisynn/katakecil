/** KataKecil V6.4 regression checks: global theme, migration, reader security. */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const read=file=>readFileSync(file,'utf8');
const transpile=file=>{
  const result=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}});
  const errors=(result.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
  assert.equal(errors.length,0,`${file}: ${errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText,' ')).join('; ')}`);
  return result.outputText;
};
// Actual migration utility, executed without React or network.
const exports={};
const storage=new Map();
const win={localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},matchMedia:()=>({matches:false}),dispatchEvent:()=>{}};
runInNewContext(transpile('src/utils/globalTheme.ts'),{exports,window:win,Event:class {}});
const {chooseGlobalTheme,readerModeFor,readGlobalTheme,saveGlobalTheme}=exports;
for(const [a,b,c,d,os,expected] of [
 ['dark',null,'white',null,false,'dark'],['light',null,'night',null,true,'light'],
 ['system',null,'night',null,true,'dark'],['system',null,'night',null,false,'light'],
 [null,'light','black',null,true,'light'],[null,null,'night',null,false,'dark'],
 [null,null,'black',null,false,'dark'],[null,null,'sepia',null,true,'light'],
 [null,null,'calm',null,true,'light'],[null,null,'follow','night',false,'dark'],
 [null,null,null,null,false,'light'],[null,null,null,null,true,'dark'],
]) assert.equal(chooseGlobalTheme(a,b,c,d,os),expected,`migration ${[a,b,c,d,os]}`);
assert.equal(readerModeFor('dark'),'night');
assert.equal(readerModeFor('light'),'white');
assert.equal(readGlobalTheme(),'light');
assert.equal(storage.get('appThemePreference'),'light');
saveGlobalTheme('dark');
assert.equal(readGlobalTheme(),'dark');
assert.equal(storage.get('appThemePreference'),'dark');
// Boot executes before React; it must follow the same precedence and theme metadata.
const html=read('index.html');
const boot=html.match(/<script>\s*(\(function\(\)\{var context=.*?\}\)\(\);)\s*<\/script>/s)?.[1];
assert.ok(boot,'Pre-React theme boot script exists');
for(const [saved,oldReader,expected] of [[null,'night','dark'],[null,'sepia','light'],['dark','white','dark'],['system','night','light']]){
 const values=new Map([...(saved? [['appThemePreference',saved]]:[]),...(oldReader?[['katakecil_reader_theme_preference_v62',oldReader]]:[])]);
 const attrs={};const meta={setAttribute:(_k,v)=>{attrs.meta=v}};
 const document={documentElement:{setAttribute:(k,v)=>{attrs[k]=v}},querySelector:()=>meta};
 runInNewContext(boot,{document,localStorage:{getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v)},location:{pathname:'/baca/example'},matchMedia:()=>({matches:false})});
 assert.equal(attrs['data-app-theme'],expected);
 assert.equal(attrs['data-reader-theme'],expected==='dark'?'night':'white');
 assert.equal(values.get('appThemePreference'),expected);
 assert.equal(attrs.meta,expected==='dark'?'#15243B':'#FFFCF7');
}
const modal=read('src/components/ReadingSettingsModal.tsx');
const publicHeader=read('src/components/public/PublicHeader.tsx');
const toggle=read('src/components/ThemeToggle.tsx');
const secure=read('src/SecureReaderApp.tsx');
const author=read('src/ReaderApp.tsx');
const app=read('src/App.tsx');
const css=read('src/design/v64-unified-theme.css');
const oldIos=read('src/design/v63-ios.css');
assert.equal((modal.match(/onAppThemeChange\('(dark|light)'\)/g)||[]).length,2,'Exactly two reader theme buttons');
for(const forbidden of ['Sepia','Calm','OLED','Ikuti tema aplikasi','readerPreference','onFollowAppTheme']) assert.ok(!modal.includes(forbidden),`Removed obsolete reader choice: ${forbidden}`);
assert.doesNotMatch(publicHeader,/value:'system'|label:'Otomatis'/);
assert.equal((publicHeader.match(/value:'(light|dark)'/g)||[]).length,2,'Mobile menu has only two choices');
assert.doesNotMatch(toggle,/LaptopMinimal|setOpen|Ikuti perangkat/);
assert.match(toggle,/onClick=\{\(\) => onPreferenceChange\(next\)\}/,'Desktop switch is one action');
assert.match(css,/\.v6-public \.v6-chapters,/);
assert.match(css,/background:var\(--kk-surface\)!important/);
assert.doesNotMatch(oldIos,/background:#F8EDDC!important/,'Remove old dark-mode cream override at its source');
assert.match(app,/design\/v64-unified-theme\.css/);
assert.doesNotMatch(app,/getReaderThemePreference|resolveReaderTheme/);
for(const reader of [secure,author]) {
 assert.match(reader,/readerModeFor\(appTheme\)/);
 assert.doesNotMatch(reader,/setReaderThemePreference|readerPreference|onFollowAppTheme/);
 assert.match(reader,/settings=\{effectiveSettings\}/);
}
for(const marker of ['const onTap=','const onTouchStart=','const onTouchEnd=','const goTo=useCallback','const saveAt=useCallback','onCopy={e=>e.preventDefault()}']) assert.ok(secure.includes(marker),`Secure Reader gesture/position preserved: ${marker}`);
assert.match(secure,/pendingOffset\.current=offsetRef\.current;pendingEdge\.current='offset';\s*setAppTheme\(next\)/,'Changing theme keeps text offset');
assert.match(secure,/loadReaderEpisode\(bookId,ep\)/);
assert.match(secure,/reader-protected/);
for(const f of ['src/data/secureReader.ts','src/data/supabase.ts','src/components/PageMeasurer.tsx','src/utils/pagination.ts']) assert.ok(existsSync(f));
for(const f of ['src/hooks/useUiTheme.ts','src/utils/globalTheme.ts','src/components/ThemeToggle.tsx','src/components/ReadingSettingsModal.tsx','src/ReaderApp.tsx','src/SecureReaderApp.tsx','src/App.tsx','src/components/public/PublicHeader.tsx','src/utils/theme.ts']) transpile(f);
console.log('PASS V6.4: two global modes, preference migration, no reader override, boot parity, chapter colors, secure-reader position and gesture contracts, TS syntax.');
