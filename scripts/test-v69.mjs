/** V6.9 Writer Studio: layout, theme and publishing safety regression. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';
const read = file => readFileSync(file, 'utf8');
const editor = read('src/features/studio/components/ChapterEditor.tsx');
const nav = read('src/features/studio/components/StudioNavigation.tsx');
const dashboard = read('src/features/studio/components/StudioOverview.tsx');
const works = read('src/features/studio/components/BookManagement.tsx');
const importer = read('src/pages/ManuscriptImporter.tsx');
const styles = read('src/design/v69-writer-studio.css');
const route = read('src/utils/nav.ts');
const app = read('src/App.tsx');

assert.match(app, /v69-writer-studio\.css/);
assert.match(nav, /label: 'Upload'/);
assert.match(nav, /label: 'Pengaturan'/);
assert.match(nav, /v69-tools-popover/);
assert.doesNotMatch(nav, /v6-sidebar-secondary/);
assert.match(dashboard, /v69-resume/);
assert.match(dashboard, /lastEdited/);
assert.match(dashboard, /v69-dashboard-stats/);
assert.match(works, /v69-chapter-filters/);
assert.match(works, /v69-status-filter/);
assert.match(works, /v69-bulk-details/);
assert.match(importer, /v69-upload-steps/);
assert.match(editor, /v69-writing-paper/);
assert.match(editor, /v69-focus-mode/);
assert.match(editor, /v69-publish-review/);
assert.match(editor, /Gagal menyimpan naskah/);
assert.match(editor, /if \(!\(await latestFlush\.current\(\)\)\)/);
assert.match(editor, /window\.confirm\(confirmation\)/);
assert.match(editor, /beforeunload/);
assert.doesNotMatch(editor, /studio-editor-mobile-actions/);
assert.doesNotMatch(editor, /<button[^>]+onClick=\{\(\) => void save\(\)\}/);
assert.match(route, /cancelable: true/);
assert.match(route, /if \(!window\.dispatchEvent\(before\)\) return/);
assert.match(styles, /--st-bg: var\(--kk-bg\)/);
assert.match(styles, /--st-primary: var\(--kk-amber\)/);
assert.match(styles, /\.v69-manuscript/);
assert.match(styles, /\.v69-tools-popover/);
assert.match(styles, /:has\(\.v69-writing-shell\) \.studio-bottom-nav/);
assert.match(styles, /prefers-reduced-motion: reduce/);
assert.doesNotMatch(styles, /#[0-9a-fA-F]{6}/);

// Current V6.10 Reader baseline and unchanged Supabase access layer.
for (const [file, hash] of Object.entries({
  'src/SecureReaderApp.tsx': '6b23f072091dcf6042ed46d7e5f61103a09722eab6066d9bb2d640eeab3a688e',
  'src/ReaderApp.tsx': 'a45caed8e3b8f0e2b0859b7c54a0ac71d1fc995b0e3a3d94769600e1fb9076c2',
  'src/data/supabase.ts': '61f6c88dc1dd9599e11fa33898d531a1a43f647bdb2e780654eba753c3b0f0c3',
  'src/data/secureReader.ts': 'be24f095ddf3e0ede40e6884d6fb291ddb529c51bb11dadd4a74cc61d94051c3',
})) {
  assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), hash, `${file} changed`);
}
for (const file of [
  'src/features/studio/components/StudioNavigation.tsx',
  'src/features/studio/components/StudioOverview.tsx',
  'src/features/studio/components/ChapterEditor.tsx',
  'src/features/studio/components/BookManagement.tsx',
  'src/pages/ManuscriptImporter.tsx',
  'src/pages/Studio.tsx',
]) {
  const result = ts.transpileModule(read(file), {
    fileName: file,
    reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  });
  assert.deepEqual(result.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) ?? [], [], `Invalid syntax: ${file}`);
}
// Exercise the cancelable SPA navigation contract without a browser or Supabase.
const compiledNav = ts.transpileModule(route, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
}).outputText;
const { navigate } = await import(`data:text/javascript;base64,${Buffer.from(compiledNav).toString('base64')}`);
const mockWindow = new EventTarget();
let pushed = 0;
let navigated = 0;
mockWindow.location = { pathname: '/studio/editor/1' };
mockWindow.history = { pushState() { pushed += 1; } };
mockWindow.scrollTo = () => undefined;
mockWindow.addEventListener('quiet:navigate', () => { navigated += 1; });
globalThis.window = mockWindow;
const guard = event => event.preventDefault();
mockWindow.addEventListener('quiet:before-navigate', guard);
navigate('/studio/cerita');
assert.equal(pushed, 0, 'Unsaved navigation must not update history');
assert.equal(navigated, 0, 'Unsaved navigation must not unmount editor');
mockWindow.removeEventListener('quiet:before-navigate', guard);
navigate('/studio/cerita');
assert.equal(pushed, 1);
assert.equal(navigated, 1);
delete globalThis.window;
console.log('PASS V6.9: writer-first Studio, global blue tokens, safe save/publish, route guard, current Reader baseline validated.');
