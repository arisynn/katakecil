/** V6.10 Reader experience: regression contracts and security boundaries. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import ts from 'typescript';

const read = path => readFileSync(path, 'utf8');
const secure = read('src/SecureReaderApp.tsx');
const preview = read('src/ReaderApp.tsx');
const controls = read('src/components/ReaderControls.tsx');
const settings = read('src/components/ReadingSettingsModal.tsx');
const panels = read('src/components/ReaderPanels.tsx');
const page = read('src/components/ReaderPage.tsx');
const focus = read('src/hooks/useReaderDialogFocus.ts');
const css = read('src/design/v610-reader-experience.css');
const app = read('src/App.tsx');

assert.match(app, /v610-reader-experience\.css/);
assert.match(controls, /v610-more-menu/);
assert.match(controls, /onSearch/);
assert.match(controls, /onFullscreen/);
assert.match(controls, /v610-progress-row/);
assert.match(controls, /v610-chapter-nav/);
assert.match(controls, /onPrevChapter/);
assert.match(controls, /onNextChapter/);
assert.match(controls, /aria-label="Daftar isi dan penanda"/);
assert.doesNotMatch(controls, /footer-scrubber/);
assert.match(settings, /v610-settings-sheet/);
assert.match(settings, /v610-advanced-settings/);
assert.match(settings, /min=\{90\} max=\{160\}/);
assert.match(settings, /aria-modal="true"/);
assert.equal((settings.match(/onAppThemeChange\('(light|dark)'\)/g) || []).length, 2);
assert.doesNotMatch(settings, /Sepia|Calm|OLED/);
assert.match(panels, /Cari judul atau nomor bab/);
assert.match(panels, /useReaderDialogFocus/);
assert.match(focus, /previous\?\.focus\(\)/);
assert.match(panels, /chapter\.wordCount > 0/);
assert.match(panels, /chapter\.estimatedMinutes > 0/);
assert.match(panels, /Cari dalam bab ini/);
assert.doesNotMatch(page, /Swipe|Pinch for menu/);
assert.match(page, /folio-counter/);
assert.match(css, /--r-bg: #F4F8FD/);
assert.match(css, /--r-bg: #081425/);
assert.match(css, /prefers-reduced-motion: reduce/);
assert.doesNotMatch(css, /background-image:\s*url\(/);
for (const reader of [secure, preview]) {
  assert.match(reader, /readerModeFor\(appTheme\)/);
  assert.match(reader, /onTouchMove=/);
  assert.match(reader, /onTouchEnd=/);
  assert.match(reader, /setControls\(true\)/);
  assert.doesNotMatch(reader, /navigationUI:\s*'hide'/);
  assert.match(reader, /Math\.max\(90,Math\.min\(160|Math\.max\(90, Math\.min\(160/);
}
assert.match(secure, /persistProgress\(decoded\.ep,anchor\.offset\)/);
assert.match(secure, /loadReaderEpisode\(bookId,ep\)/);
assert.match(secure, /\.preventDefault\(\)/);
assert.match(preview, /onCopy=\{e=>\{if\(!previewStory\)e\.preventDefault\(\);\}\}/);

// The sensitive data layer and pagination measuring engine are unchanged.
const pinned = {
  'src/data/secureReader.ts': 'be24f095ddf3e0ede40e6884d6fb291ddb529c51bb11dadd4a74cc61d94051c3',
  'src/data/supabase.ts': '61f6c88dc1dd9599e11fa33898d531a1a43f647bdb2e780654eba753c3b0f0c3',
  'src/utils/pagination.ts': '965a272af1ad77804a0b8468ef581dfc653338e9e0b9af588265f86e60a0c81c',
  'src/components/PageMeasurer.tsx': '1f858e48cbfb23ba2353572f0f31ae7e58bf0cf50a2b484a70f4a308271dee7c',
  'src/content-protection.css': '3c2ef39f7b73bfdce6abf963f2b46059f00dc74bd364185cd27fc6d09bb4d506',
};
for (const [file, expected] of Object.entries(pinned)) {
  assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'), expected, `${file} must remain unchanged`);
}
for (const file of [
  'src/SecureReaderApp.tsx', 'src/ReaderApp.tsx', 'src/components/ReaderControls.tsx',
  'src/components/ReadingSettingsModal.tsx', 'src/components/ReaderPanels.tsx',
  'src/components/ReaderPage.tsx', 'src/hooks/useReaderDialogFocus.ts',
]) {
  const compiled = ts.transpileModule(read(file), {
    fileName: file, reportDiagnostics: true,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
  });
  assert.deepEqual(compiled.diagnostics?.filter(d => d.category === ts.DiagnosticCategory.Error) ?? [], [], `Invalid syntax: ${file}`);
}
console.log('PASS V6.10: focused Reader, compact controls, two global themes, chapter search, secure access and pagination baseline.');
