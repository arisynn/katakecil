/** V6 static regression checks. No credentials, live database or dependencies needed. */
import assert from 'node:assert/strict';
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
const read = file => readFileSync(file,'utf8');
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const app=read('src/App.tsx');
const studio=read('src/pages/Studio.tsx');
const publicUi=read('src/pages/PublicLibrary.tsx');
const cover=read('src/components/Cover.tsx');
const settings=read('src/components/ReadingSettingsModal.tsx');
const css=read('src/design/v6.css');
const theme=read('src/utils/theme.ts');
assert.match(app,/\.\/design\/v6\.css/);
assert.match(app,/path\.startsWith\('\/studio'\)/);
assert.match(app,/path\.startsWith\('\/baca\/'\)/);
assert.match(studio,/qr_author_members/);
assert.match(studio,/getStudioLibrary/);
assert.match(studio,/getUser\(/);
assert.match(studio,/bulkPublishDrafts/);
assert.match(studio,/qr_episodes'\)\.update/);
assert.match(studio,/setTimeout\(\(\)=>\{void save\(\);\},1700\)/);
assert.match(studio,/Analytics/);
assert.match(studio,/authorName\(user\)/);
assert.ok(!/Halo,\s*<i>Karisyono/.test(studio),'Studio greeting must not be hardcoded.');
assert.ok(!/42\.8K|45\.2K|4\.8★/.test(publicUi+studio),'No mockup-only readership metrics.');
assert.match(publicUi,/getPublicLibrary/);
assert.match(publicUi,/!isConfigured/);
assert.match(publicUi,/v6-demo/);
assert.match(publicUi,/useCollection/);
assert.match(cover,/book\.cover_url/);
assert.match(cover,/art-cover-backdrop/);
assert.match(settings,/onUpdateSettings\(\{fontSize:/);
for(const label of ['Paper','Malam','Sepia','Calm']) assert.ok(settings.includes(label));
assert.match(theme,/name:'black'/);
assert.match(theme,/name:'calm'/);
assert.match(css,/prefers-reduced-motion/);
assert.match(css,/safe-area-inset-bottom/);
assert.ok(!/create table|alter table/i.test(css),'No database DDL in visual CSS');
const core={
 'src/SecureReaderApp.tsx':'3bed290d82e2d26d294951fc784ff81244b4c3ba1c50ea7b6d43b54738c29901',
 'src/ReaderApp.tsx':'3b00e0a0a0b15f9eb54fb7552c2b3d53e557c2d3372a48c74b685ea2f598ad9e',
 'src/components/PageMeasurer.tsx':'1f858e48cbfb23ba2353572f0f31ae7e58bf0cf50a2b484a70f4a308271dee7c',
 'src/utils/pagination.ts':'965a272af1ad77804a0b8468ef581dfc653338e9e0b9af588265f86e60a0c81c',
};
for(const [file,expected] of Object.entries(core)) assert.equal(sha(file),expected,`Core reader changed: ${file}`);
const assets=readdirSync('public/assets/v6/covers').filter(n=>n.endsWith('.webp'));
assert.equal(assets.filter(n=>!n.endsWith('-mobile.webp')).length,8,'Eight distinct desktop cover assets');
assert.equal(assets.filter(n=>n.endsWith('-mobile.webp')).length,8,'Eight distinct mobile cover assets');
for(const file of [...assets.map(a=>`public/assets/v6/covers/${a}`),...['hero-library-sunset.webp','hero-library-sunset-mobile.webp','studio-ambience.webp','empty-library.webp','reader-paper-texture.webp','detail-backdrop.webp','studio-ambience-mobile.webp','empty-library-mobile.webp','detail-backdrop-mobile.webp','reader-paper-texture-mobile.webp','loading-ambience.webp','loading-ambience-mobile.webp'].map(a=>`public/assets/v6/${a}`)]) {
 const b=readFileSync(file);assert.equal(b.toString('ascii',8,12),'WEBP',`Not WebP: ${file}`);assert.ok(statSync(file).size>2000,`Asset missing or empty: ${file}`);
}
console.log('PASS V6: public/Studio routes, private author gate, actual data, autosave, reader core hashes, theme compatibility, collection, 28 WebP assets.');
