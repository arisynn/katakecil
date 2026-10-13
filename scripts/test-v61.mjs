/** V6.1 loading and mobile-asset checks; no credentials or dependencies needed. */
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
const read=file=>readFileSync(file,'utf8');
const boot=read('index.html');
const app=read('src/App.tsx');
const css=read('src/design/v61-loading-mobile.css');
const loader=read('src/components/ThemeLoading.tsx');
const cover=read('src/components/Cover.tsx');
const publicUi=read('src/pages/PublicLibrary.tsx');
const studio=read('src/pages/Studio.tsx');
const readerSettings=read('src/components/ReadingSettingsModal.tsx');
assert.match(boot,/kk-boot-loader/);
assert.match(boot,/data-kk-boot-context/);
assert.match(boot,/loading-ambience-mobile\.webp/);
assert.match(boot,/prefers-reduced-motion/);
assert.match(boot,/aria-busy/);
assert.match(app,/readerLookup\.slug!==slug\|\|!readerLookup\.resolved/);
assert.match(app,/setReaderLookup\(\{slug,book:null,resolved:false\}\)/);
assert.match(app,/design\/v61-loading-mobile\.css/);
assert.match(loader,/kk-v6-loading--\$\{context\}/);
assert.match(loader,/context === 'reader'/);
assert.match(loader,/context === 'studio'/);
assert.match(css,/loading-ambience-mobile\.webp/);
assert.match(css,/studio-ambience-mobile\.webp/);
assert.match(css,/reader-paper-texture-mobile\.webp/);
assert.match(css,/detail-backdrop-mobile\.webp/);
assert.match(css,/prefers-reduced-motion/);
assert.match(cover,/fallbackCoverMobile/);
assert.match(cover,/book\.cover_url \|\| failed/);
assert.match(cover,/<picture>/);
assert.match(publicUi,/empty-library-mobile\.webp/);
assert.match(studio,/empty-library-mobile\.webp/);
assert.match(readerSettings,/mobileImage/);
for(const path of ['hero-library-sunset-mobile.webp','studio-ambience-mobile.webp','empty-library-mobile.webp','detail-backdrop-mobile.webp','loading-ambience-mobile.webp','reader-paper-texture-mobile.webp','loading-ambience.webp']) {
  assert.ok(statSync(`public/assets/v6/${path}`).size>2000,`${path} missing`);
}
for(let i=1;i<=8;i++) {
  const name=['senja','langit','jejak','ruang','hujan','rumah','tertunda','bunga'][i-1];
  assert.ok(statSync(`public/assets/v6/covers/${String(i).padStart(2,'0')}-${name}-mobile.webp`).size>8000);
}
console.log('PASS V6.1: responsive assets, boot loader, reader route race guard, accessible loading, reduced motion, original cover priority.');
