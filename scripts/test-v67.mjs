/** V6.7: semantic contracts for blue theme, conditional collection, About, Studio Upload, and intact Reader. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = f => readFileSync(f, 'utf8');
const header = read('src/components/public/PublicHeader.tsx');
const publicPage = read('src/pages/PublicLibrary.tsx');
const hero = read('src/features/public/components/FeaturedHeroCarousel.tsx');
const studio = read('src/features/studio/components/StudioNavigation.tsx');
const css = read('src/design/v67-sapphire-polish.css');
const theme = read('src/utils/theme.ts');
const empty = read('src/features/public/components/LibraryUI.tsx');
const index = read('index.html');
assert.match(header, /visibleLinks = links\.filter\(link => link\.to !== '\/koleksi' \|\| showCollection\)/);
assert.match(header, /data-items=\{visibleLinks\.length\}/);
assert.match(publicPage, /showCollection = books\.some\(book => collectionIds\.includes\(book\.id\)\)/);
assert.match(publicPage, /<PublicHeader path=\{path\} showCollection=\{showCollection\}/);
assert.match(publicPage, /Karisyono/);
assert.match(publicPage, /v67-about-author/);
assert.match(publicPage, /Koleksi tersimpan pada browser perangkat ini/);
assert.doesNotMatch(publicPage, /v6-detail-backdrop" aria-hidden/);
assert.match(studio, /p: '\/studio\/impor', label: 'Upload'/);
assert.match(studio, /p: '\/studio\/settings', label: 'Pengaturan'/);
assert.match(studio, /aria-controls=\{mobile \? "v67-studio-more"/);
assert.match(studio, /const secondary =/);
assert.doesNotMatch(studio, /p: '\/studio\/impor', label: 'Impor Naskah'/);
assert.match(hero, /<Cover book=\{story\.book\}/);
assert.doesNotMatch(hero, /<StoryBackdrop|v66-hero-overlay/);
assert.match(hero, /AUTO_ADVANCE_MS = 6000/);
assert.match(hero, /SWIPE_THRESHOLD_PX = 45/);
assert.match(hero, /document\.hidden/);
assert.match(css, /object-fit: contain !important/);
assert.match(css, /\.v6-public \.v6-public-bottom\[data-items='4'\]/);
assert.match(css, /prefers-reduced-motion: reduce/);
assert.match(css, /--kk-bg: #F4F8FD/);
assert.match(css, /--kk-bg: #081425/);
assert.match(theme, /pageBg:'#FFFFFF'/);
assert.match(theme, /pageBg:'#10243D'/);
assert.match(empty, /v67-empty-icon/);
assert.doesNotMatch(empty, /<picture>/);
assert.doesNotMatch(index, /url\('\/assets\/v6\/loading-ambience/);
assert.match(read('src/App.tsx'), /v67-sapphire-polish\.css/);
// Reader code is pinned to the current V6.10 baseline; Supabase access is unchanged.
const protectedHashes = {
  'src/data/secureReader.ts': 'be24f095ddf3e0ede40e6884d6fb291ddb529c51bb11dadd4a74cc61d94051c3',
  'src/data/supabase.ts': '61f6c88dc1dd9599e11fa33898d531a1a43f647bdb2e780654eba753c3b0f0c3',
  'src/utils/pagination.ts': '965a272af1ad77804a0b8468ef581dfc653338e9e0b9af588265f86e60a0c81c',
};
for (const [file, expected] of Object.entries(protectedHashes)) {
  const actual = createHash('sha256').update(readFileSync(file)).digest('hex');
  assert.equal(actual, expected, `${file} changed unexpectedly`);
}
console.log('PASS V6.7: conditional collection, About Karisyono, Studio Upload, blue themes, no backdrop art, current security baseline validated.');
