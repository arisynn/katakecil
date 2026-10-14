import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const read = file => readFileSync(file, 'utf8');
const hash = file => createHash('sha256').update(read(file)).digest('hex');
const frozenReader = {
  'src/SecureReaderApp.tsx':'28b7d0b35451169dda06ca0e42c2c8a0a66c874f15c68d73a9e3bbfe168e5c12',
  'src/ReaderApp.tsx':'5eb1dd8997cc312909fa8a1f9ab6285155ad1d502270a4f1c1887e910c5f7f6a',
  'src/utils/pagination.ts':'965a272af1ad77804a0b8468ef581dfc653338e9e0b9af588265f86e60a0c81c',
  'src/utils/readerGesture.ts':'609428df3b1d0d1395fc16e5285f359073a2532bff2533796495965f0687ec5d',
  'src/components/PageMeasurer.tsx':'1f858e48cbfb23ba2353572f0f31ae7e58bf0cf50a2b484a70f4a308271dee7c',
};
for (const [file,expected] of Object.entries(frozenReader)) assert.equal(hash(file),expected,`Reader regression guard: ${file}`);
const studio = read('src/features/studio/components/StudioOverview.tsx');
const editor = read('src/features/studio/components/ChapterEditor.tsx');
const announcements = read('src/features/studio/components/AnnouncementManager.tsx');
const navigation = read('src/features/studio/components/StudioNavigation.tsx');
const styles = read('src/design/studio-experience.css');
const works = read('src/features/studio/components/BookManagement.tsx');
assert.match(studio, /Terakhir diedit: \{formatWib\(lastEdited.updated_at\)\}/);
assert.match(editor, /kk-v71-save-retry/);
assert.match(editor, /latestFlush\.current\(\)/);
assert.match(editor, /Gagal menyimpan/);
assert.match(editor, /if \(!\(await latestFlush\.current\(\)\)\)/);
assert.match(editor, /window\.confirm\(confirmation\)/);
assert.match(editor, /quiet:before-navigate/);
assert.match(announcements, /fromWib, toWibInput/);
assert.match(announcements, /toIsoWib\(startInput\)/);
assert.match(announcements, /Masukkan tanggal dan jam WIB/);
assert.doesNotMatch(announcements, /getTimezoneOffset/);
assert.match(navigation, /aria-current=\{isActive\(path, tab.p\)/);
assert.match(styles, /var\(--kk-surface-2\)/);
assert.match(works, /kk-v71-books-filter/);
assert.match(works, /Reset filter bab/);
assert.match(works, /visibility === 'Publik'/);
assert.doesNotMatch(styles.replace(/\/\*[\s\S]*?\*\//g, ''), /#[\da-f]{3,8}\b|\brgba?\s*\(/i);
const pure = ts.transpileModule(read('src/utils/releasePlanning.ts'), {fileName:'releasePlanning.ts', reportDiagnostics:true, compilerOptions:{target:ts.ScriptTarget.ES2022, module:ts.ModuleKind.ESNext}});
assert.equal(pure.diagnostics?.filter(x=>x.category===ts.DiagnosticCategory.Error).length??0,0);
const {fromWib,toWibInput} = await import(`data:text/javascript;base64,${Buffer.from(pure.outputText).toString('base64')}`);
assert.equal(fromWib('2026-10-14','09:30'),'2026-10-14T02:30:00.000Z');
assert.equal(toWibInput('2026-10-14T02:30:00.000Z'),'2026-10-14T09:30');
assert.equal(fromWib('2026-12-31','23:59'),'2026-12-31T16:59:00.000Z');
assert.throws(()=>fromWib('2026-02-30','09:30'));
assert.throws(()=>fromWib('2026-10-14','25:00'));
console.log('PASS V7.1 Studio: frozen Reader hashes, autosave/publish guards, WIB conversion, focused workflow.');
