/** V6.12 — responsive geometry, pinch centering, loading and protected reader contracts. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const read = path => readFileSync(path,'utf8');
const importTS = async file => {
  const js = ts.transpileModule(read(file), {fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
};
const {readerGeometry,readerMenuPlacement} = await importTS('src/utils/readerLayout.ts');
const settings={marginWidth:'normal',spreadMode:'single'};
for (const [width,height] of [[320,568],[360,640],[390,844],[430,932],[768,1024],[1440,900]]) {
  const geometry=readerGeometry({width,height,safeTop:0,safeBottom:0},settings);
  assert.ok(geometry.bodyWidth>0 && geometry.bodyHeight>0,`${width}: nonpositive text area`);
  assert.ok(geometry.pageHeight===height,`${width}: viewport height mismatch`);
  assert.ok(geometry.leafWidth<=width,`${width}: leaf exceeds viewport`);
  assert.equal(geometry.bodyHeight+geometry.paddingTop+geometry.paddingBottom+geometry.footerHeight+geometry.footerGap,height);
  const header=width<600?74:80, footer=height-120;
  const menu=readerMenuPlacement(height,geometry.leafWidth,height,width,header,footer);
  const bookTop=height/2+menu.offsetY-menu.scale*height/2;
  const bookBottom=height/2+menu.offsetY+menu.scale*height/2;
  assert.ok(bookTop>=header+13,`${width}: overlaps header`);
  assert.ok(bookBottom<=footer-13,`${width}: overlaps footer`);
  assert.ok(menu.scale>0 && menu.scale<=.84,`${width}: invalid scale`);
  assert.ok(Math.abs(height/2+menu.offsetY-(header+footer)/2)<.02,`${width}: not centered between controls`);
}
const spread=readerGeometry({width:1440,height:900,safeTop:0,safeBottom:0},{...settings,spreadMode:'spread'});
assert.ok(spread.leafWidth*2+16<=1440,'spread exceeds viewport');
const narrow=readerGeometry({width:390,height:844,safeTop:0,safeBottom:0},{...settings,marginWidth:'narrow'});
const wide=readerGeometry({width:390,height:844,safeTop:0,safeBottom:0},{...settings,marginWidth:'wide'});
assert.ok(narrow.bodyWidth>wide.bodyWidth,'margin preference not applied');
const secure=read('src/SecureReaderApp.tsx'),preview=read('src/ReaderApp.tsx');
for (const src of [secure,preview]) {
  assert.match(src,/useReaderViewport\(\)/);
  assert.match(src,/useReaderMenuPlacement\(/);
  assert.match(src,/readerGeometry\(/);
  assert.match(src,/ReaderEpisodeLoading/);
  assert.match(src,/--reader-viewport-height/);
  assert.match(src,/--reader-menu-offset-y/);
  assert.doesNotMatch(src,/innerHeight|translateY\(-7dvh\)/);
}
const css=read('src/design/v612-reader-layout.css');
assert.match(css,/scale\(var\(--reader-menu-scale/);
assert.match(css,/--reader-menu-offset-y/);
assert.match(css,/\.kk-reader-load__symbol/);
assert.match(css,/prefers-reduced-motion: reduce/);
assert.doesNotMatch(css,/translateY\(-\d+dvh\)|background-image:\s*url\(/);
assert.match(read('src/components/ReaderPage.tsx'),/fontSize: `clamp\(/);
assert.match(read('src/App.tsx'),/sapphire-tokens\.css/);
assert.match(read('src/App.tsx'),/v612-reader-layout\.css/);
const loader=read('src/components/ReaderEpisodeLoading.tsx');
assert.match(loader,/phase === 'layout'/);
assert.match(loader,/role=\{isBusy \? 'status' : 'alert'\}/);
assert.match(loader,/onRetry/);
for (const file of ['src/hooks/useReaderViewport.ts','src/hooks/useReaderMenuPlacement.ts','src/utils/readerLayout.ts','src/components/ReaderEpisodeLoading.tsx','src/SecureReaderApp.tsx','src/ReaderApp.tsx','src/components/ReaderPage.tsx']) {
  const result=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
  assert.deepEqual(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error)??[],[],`Syntax ${file}`);
}
for (const [file,hash] of Object.entries({
  'src/data/secureReader.ts':'be24f095ddf3e0ede40e6884d6fb291ddb529c51bb11dadd4a74cc61d94051c3',
  'src/data/supabase.ts':'61f6c88dc1dd9599e11fa33898d531a1a43f647bdb2e780654eba753c3b0f0c3',
  'src/utils/pagination.ts':'965a272af1ad77804a0b8468ef581dfc653338e9e0b9af588265f86e60a0c81c',
  'src/components/PageMeasurer.tsx':'1f858e48cbfb23ba2353572f0f31ae7e58bf0cf50a2b484a70f4a308271dee7c',
  'src/content-protection.css':'3c2ef39f7b73bfdce6abf963f2b46059f00dc74bd364185cd27fc6d09bb4d506',
})) assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),hash,`${file} changed`);
console.log('PASS V6.12: adaptive geometry, centered pinch, real episode loader, shared palette and unchanged security/pagination engine.');
