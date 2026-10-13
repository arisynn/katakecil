/** V6.5 maintenance regression: secure code hashes + modularization contracts. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const protectedFiles = {
  'src/SecureReaderApp.tsx': '4dfe5318cb5a06907106c92fc7801c5b85f9924e04ab3119ffbc5f6566eeb087',
  'src/ReaderApp.tsx': '94b2a66ca7730fb9540c25d795cf04b14b3cf81d6888b07191ff34f4a12afcc2',
  'src/components/PageMeasurer.tsx': '1f858e48cbfb23ba2353572f0f31ae7e58bf0cf50a2b484a70f4a308271dee7c',
  'src/components/ReaderPage.tsx': 'dfb258c966fdadcc82e8e9811c230d40343536badf94aa55d5e759e933d6e5f3',
  'src/components/ReadingSettingsModal.tsx': '6ac46d58ac36628c4c1d4b6aacb7f3099f72fcf442fe9a3973263a671defe558',
  'src/components/ReaderControls.tsx': '53a39b32deb019c053e3fc297d8764cbeddedc3ef34d9fc0dabcd3a3758df747',
  'src/components/ReaderPanels.tsx': '94fa66988e8b77e7a177c9185459a0a2f8c4b95a7640b2dea733ed2c37e29108',
  'src/utils/pagination.ts': '965a272af1ad77804a0b8468ef581dfc653338e9e0b9af588265f86e60a0c81c',
  'src/data/secureReader.ts': 'be24f095ddf3e0ede40e6884d6fb291ddb529c51bb11dadd4a74cc61d94051c3',
  'src/data/supabase.ts': '61f6c88dc1dd9599e11fa33898d531a1a43f647bdb2e780654eba753c3b0f0c3',
  'src/index.css': 'c0bb84adae9161fe15800f98baf3b570820bf6c8594c40dfd71d01b008c4e968',
  'src/secure-reader.css': 'ff8e351cda000f690c61e1395fadcc3d09a2343068b203e7c43fdf17cbf75ced',
  'src/content-protection.css': '3c2ef39f7b73bfdce6abf963f2b46059f00dc74bd364185cd27fc6d09bb4d506',
};
for (const [file, expected] of Object.entries(protectedFiles)) {
  const actual = createHash('sha256').update(readFileSync(file)).digest('hex');
  assert.equal(actual, expected, `${file}: protected reader/security code changed`);
}
const studio = readFileSync('src/pages/Studio.tsx', 'utf8');
const publicUi = readFileSync('src/pages/PublicLibrary.tsx', 'utf8');
for (const name of ['StudioNavigation', 'ChapterEditor', 'StudioOverview', 'BookManagement', 'StudioShared']) {
  assert.ok(studio.includes(name), `Studio imports ${name}`);
}
assert.ok(publicUi.includes('features/public/components/StoryCard'));
assert.ok(publicUi.includes('features/public/components/LibraryUI'));
assert.doesNotMatch(studio, /function (?:Nav|Dashboard|Editor|BookDetails)\(/, 'Extracted components must not remain duplicated');
assert.ok(readdirSync('docs/archive').filter(name => name.endsWith('.md')).length >= 26);
assert.ok(!existsSync('_implement_v63.py') && !existsSync('_preview_v63.py'));
assert.ok(['6.5.0', '6.6.0'].includes(JSON.parse(readFileSync('package.json', 'utf8')).version));
for (const file of ['src/studio.css', 'src/site.css', 'src/design/v6.css']) {
  const longest = Math.max(...readFileSync(file, 'utf8').split('\n').map(line => line.length));
  assert.ok(longest < 200, `${file} still contains unusually long lines (${longest})`);
}
execFileSync(process.execPath, ['scripts/quality/check-structure.mjs'], { stdio: 'inherit' });
console.log(`PASS V6.5: ${Object.keys(protectedFiles).length} protected files unchanged, modular imports, formatted CSS, archived docs.`);
