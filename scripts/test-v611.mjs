/** V6.11 — actual title parsing and pinch directions, plus visual/security contracts. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import ts from 'typescript';

const read = file => readFileSync(file,'utf8');
const load = async file => {
  const js = ts.transpileModule(read(file), {fileName:file, compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText;
  return import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
};
const {readerHeading} = await load('src/utils/readerHeading.ts');
const {pinchAction} = await load('src/utils/readerGesture.ts');
assert.deepEqual(readerHeading('Episode 5 — Sebuah Pertemuan',5),{eyebrow:'BAB 5',title:'Sebuah Pertemuan'});
assert.deepEqual(readerHeading('Bab 5: Sebuah Pertemuan',5),{eyebrow:'BAB 5',title:'Sebuah Pertemuan'});
assert.deepEqual(readerHeading('5. Sebuah Pertemuan',5),{eyebrow:'BAB 5',title:'Sebuah Pertemuan'});
assert.deepEqual(readerHeading('Sebuah Pertemuan',5),{eyebrow:'BAB 5',title:'Sebuah Pertemuan'});
assert.deepEqual(readerHeading('Bab 5',5),{eyebrow:'BAB 5',title:''});
assert.deepEqual(readerHeading('Bab 3: Tidak cocok',5),{eyebrow:'BAB 5',title:'Bab 3: Tidak cocok'});
assert.deepEqual(readerHeading('Prolog'),{eyebrow:'PROLOG',title:''});
assert.deepEqual(readerHeading('Epilog — Kepulangan'),{eyebrow:'EPILOG',title:'Kepulangan'});
assert.deepEqual(readerHeading('Bab 8: Pulang'),{eyebrow:'BAB 8',title:'Pulang'});
assert.equal(pinchAction(200,166,false),'open');
assert.equal(pinchAction(200,235,true),'close');
assert.equal(pinchAction(200,170,true),null);
assert.equal(pinchAction(200,230,false),null);
assert.equal(pinchAction(200,191,false),null);
assert.equal(pinchAction(0,191,false),null);

const secure=read('src/SecureReaderApp.tsx');
const preview=read('src/ReaderApp.tsx');
const chapter=read('src/components/ChapterText.tsx');
const controls=read('src/components/ReaderControls.tsx');
const css=read('src/design/v611-immersive-reader.css');
const boot=read('index.html');
const loader=read('src/components/ThemeLoading.tsx');
const app=read('src/App.tsx');
assert.match(app,/v611-immersive-reader\.css/);
assert.match(chapter,/readerHeading\(chapter\.title, chapter\.displayNumber\)/);
assert.match(chapter,/chapter-arc/);
assert.match(secure,/chapterFromEpisode/); // metadata mapped in utility
assert.match(read('src/utils/episodeChapter.ts'),/displayNumber:episodeNumber/);
assert.match(preview,/story\.episodeNumbers\?\.\[i\] \?\? i \+ 1/);
for (const source of [secure,preview]) {
  assert.match(source,/pinchAction\(/);
  assert.match(source,/data-reader-view=/);
  assert.match(source,/setControls\(action === 'open'\)|setControls\(action==='open'\)/);
}
assert.match(controls,/v611-page-step/);
assert.match(controls,/v610-chapter-nav/);
assert.match(controls,/aria-label="Daftar isi dan penanda"/);
assert.match(css,/showing-controls \.reader-book/);
assert.match(css,/scale\(\.64\)/);
assert.match(css,/\.chapter-intro/);
assert.match(css,/\.v610-drawer/);
assert.match(css,/prefers-reduced-motion: reduce/);
assert.doesNotMatch(css,/url\(['"]?\/assets\//);
assert.match(boot,/kk-v611-loader__symbol/);
assert.match(loader,/kk-v611-loader__symbol/);
assert.match(boot,/kk-v611-loader__eyebrow/);
assert.match(loader,/RUANG MEMBACA/);
assert.doesNotMatch(boot,/#FFF5E6|#f8eedc|#F0C98B|#805321/);

// These files remain byte-for-byte identical to the verified V6.10 baseline.
for (const [file,expected] of Object.entries({
  'src/data/secureReader.ts':'be24f095ddf3e0ede40e6884d6fb291ddb529c51bb11dadd4a74cc61d94051c3',
  'src/data/supabase.ts':'61f6c88dc1dd9599e11fa33898d531a1a43f647bdb2e780654eba753c3b0f0c3',
  'src/utils/pagination.ts':'965a272af1ad77804a0b8468ef581dfc653338e9e0b9af588265f86e60a0c81c',
  'src/components/PageMeasurer.tsx':'1f858e48cbfb23ba2353572f0f31ae7e58bf0cf50a2b484a70f4a308271dee7c',
  'src/content-protection.css':'3c2ef39f7b73bfdce6abf963f2b46059f00dc74bd364185cd27fc6d09bb4d506',
})) assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),expected,`${file} changed`);
for (const file of ['src/ReaderApp.tsx','src/SecureReaderApp.tsx','src/components/ReaderControls.tsx','src/components/ChapterText.tsx','src/components/ThemeLoading.tsx','src/utils/readerHeading.ts','src/utils/readerGesture.ts']) {
  const result=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}});
  assert.deepEqual(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error)??[],[],`Syntax ${file}`);
}
console.log('PASS V6.11: chapter heading, directional pinch, new loader, Sapphire styling and protected data layer.');
