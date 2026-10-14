import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const read = (p) => readFileSync(p, 'utf8');
const page = read('src/pages/PublicLibrary.tsx');
const nav = read('src/components/public/PublicHeader.tsx');
const cards = read('src/features/public/components/StoryCard.tsx');
const app = read('src/App.tsx');
const style = read('src/design/v70-alpha.css');
const notice = read('src/features/public/components/DiscoveryNotices.tsx');
const oldCollection = read('src/utils/collection.ts');
const logo = read('public/brand/katakecil-mark.svg');
const icon = read('public/brand/katakecil-icon.svg');
const pkg = JSON.parse(read('package.json'));
assert.ok(pkg.version.startsWith('7.0.0-alpha.'), 'V7 alpha semver');
assert.match(nav, /label:'Temukan',icon:Compass/);
assert.match(nav, /label:'Koleksi',icon:Bookmark/);
assert.match(nav, /const visibleLinks = links;/);
assert.match(nav, /navigate\('\/temukan\?focus=1'\)/);
assert.match(page, /<DiscoveryNotices books={books} episodes={episodes} schedules={schedules}\/>/);
assert.match(page, /<Heading title="Cerita Pilihan" to="\/temukan"\/>/);
assert.match(page, /recentChapters\.slice\(0,2\)/);
assert.doesNotMatch(page, /<FeaturedHeroCarousel/);
assert.doesNotMatch(cards, /<BookmarkButton book={book}\/>/);
assert.match(page, /<BookmarkButton book={book}\/>/);
assert.match(page, /className="kk-v7-collection-remove"/);
assert.match(oldCollection, /katakecil:v6:collection/); // No migration loss.
assert.match(app, /<SecureReaderApp/);
assert.match(app, /v70-alpha.css/);
assert.match(style, /var\(--kk-primary\)/);
assert.match(style, /\.kk-v7-discover-grid/);
assert.match(logo, /<svg/);assert.match(icon, /<svg/);
for (const asset of ['public/favicon.png','public/apple-touch-icon.png','public/brand/katakecil-icon-192.png','public/brand/katakecil-icon-512.png','public/manifest.webmanifest']) assert.ok(existsSync(asset), asset);
const manifest=JSON.parse(read('public/manifest.webmanifest'));
assert.equal(manifest.short_name,'KataKecil');
assert.equal(manifest.display,'standalone');
assert.ok(!existsSync('public/sw.js'),'Do not cache protected reader manuscripts via a service worker in alpha.');
// Exercise the pure notice selector without installing React or hitting Supabase.
const fnSource = notice.slice(notice.indexOf('export function buildDiscoveryNotices'),notice.indexOf('export default function DiscoveryNotices')).replace('export function','function');
const js = ts.transpileModule(`${fnSource}\nthis.buildDiscoveryNotices=buildDiscoveryNotices;`,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const sandbox = {Date,Intl,Set,Map,Number};runInNewContext(js,sandbox);
const now=Date.parse('2026-10-14T08:00:00Z');
const book={id:'b1',slug:'masa-panen',title:'Masa Panen',is_published:true};
const hidden={id:'b2',slug:'draft',title:'Draft',is_published:false};
const ep=(book_id,episode_number,release_at,title='Bab')=>({book_id,episode_number,release_at,title});
const notices=sandbox.buildDiscoveryNotices([book,hidden],[ep('b1',2,'2026-10-13T08:00:00Z'),ep('b1',3,'2026-10-14T07:00:00Z'),ep('b1',4,'2026-10-15T08:00:00Z'),ep('b2',1,'2026-10-14T07:00:00Z')],[{book_id:'b1',release_at:'2026-10-16T08:00:00Z'},{book_id:'b2',release_at:'2026-10-16T08:00:00Z'}],now);
assert.equal(notices.length,2);
assert.equal(notices[0].kind,'schedule');
assert.equal(notices[1].detail.includes('Bab 3'),true);
assert.ok(notices.every(n=>n.slug==='masa-panen'));
assert.deepEqual(Array.from(sandbox.buildDiscoveryNotices([],[],[],now)),[]);
// Source TSX parse, no package imports required.
for(const file of ['src/pages/PublicLibrary.tsx','src/components/public/PublicHeader.tsx','src/features/public/components/DiscoveryNotices.tsx','src/features/public/components/StoryCard.tsx','src/components/BrandLogo.tsx','src/features/studio/components/StudioNavigation.tsx']){
 const output=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
 assert.equal(output.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length??0,0,file);
}
console.log('PASS V7.0 Alpha: logo assets, 4-tab nav, clean covers, collection, real-data notices, reader unchanged, TSX syntax.');
