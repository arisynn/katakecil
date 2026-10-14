import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const read = (path) => readFileSync(path, 'utf8');
const page = read('src/pages/PublicLibrary.tsx');
const empty = read('src/features/public/components/LibraryUI.tsx');
const css = read('src/design/v70-alpha2.css');
const app = read('src/App.tsx');
const pkg = JSON.parse(read('package.json'));
assert.ok(/^(?:7\.0\.0-(?:alpha\.\d+|beta\.\d+)|7\.1\.0-rc\.1)$/.test(pkg.version));
assert.match(app, /design\/v70-alpha2.css/);
assert.match(page, /filterSavedStories\(savedStories, collectionFilter,/);
assert.match(page, /collectionFilter===value/);
assert.match(page, /filteredSaved\.map/);
assert.match(empty, /collection && <Action to="\/temukan"/);
assert.doesNotMatch(empty, /className=\"v6-empty\"/); // No legacy empty-state class.
assert.match(css, /background:\s*var\(--kk-surface\)/);
// Evaluate the pure collection selectors with real data, without requiring React.
const src = read('src/features/public/collectionFilters.ts');
const js = ts.transpileModule(`${src.replace(/^export /gm, '')}\nthis.sortSavedStories=sortSavedStories;this.filterSavedStories=filterSavedStories;`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const context = {Map};runInNewContext(js,context);
const books = [{id:'first'},{id:'second'},{id:'third'}];
const ordered = context.sortSavedStories(books,['third','first','second']);
assert.deepEqual(Array.from(ordered,x=>x.id),['second','first','third']);
assert.deepEqual(Array.from(books,x=>x.id),['first','second','third']);
const progress = book => book.id === 'second' ? 0 : null;
assert.deepEqual(Array.from(context.filterSavedStories(ordered,'dibaca',progress),x=>x.id),['second']);
assert.deepEqual(Array.from(context.filterSavedStories(ordered,'belum',progress),x=>x.id),['first','third']);
assert.equal(context.filterSavedStories(ordered,'semua',progress).length,3);
for (const file of ['src/pages/PublicLibrary.tsx','src/features/public/components/LibraryUI.tsx','src/features/public/collectionFilters.ts']) {
  const result = ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
  assert.equal(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length??0,0,file);
}
console.log('PASS V7 Alpha.2: compact empty states, functional saved filters, stable order, chapter-zero progress, TSX syntax.');
