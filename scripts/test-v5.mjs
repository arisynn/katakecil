// KataKecil V5 contract regression tests. No browser deps needed.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(name)=>readFileSync(name,'utf8');
const app=read('src/App.tsx');
const css=read('src/mist-blue.css');
const importUi=read('src/pages/ManuscriptImporter.tsx');
const sql=read('supabase/migrations/20261012170000_katakecil_v5_core.sql');
const originalReaderCss=read('src/secure-reader.css');
assert.match(app,/import '\.\/mist-blue\.css'/);
assert.ok(css.includes('--kk-ocean:#52789d'), 'V5 must use approved Mist Blue palette.');
assert.ok(!/(?:^|})\s*(?:\.quiet-app|\.reader-stage|\.reader-leaf|\.reader-page)/m.test(css), 'Reader styling must remain untouched.');
assert.ok(originalReaderCss.includes('reader'), 'Existing Reader CSS must remain present.');
assert.ok(read('src/site.css').includes('object-fit:contain'), 'Artwork must not be cropped.');
assert.ok(read('src/components/Cover.tsx').includes('art-cover-backdrop'), 'Provide image-aware cover background for mismatched ratios.');
assert.match(read('supabase/REVIEW_ONLY_stage2_metadata_grants.sql'),/updated_at, deleted_at/, 'Grant safe metadata column before filtering trashed episodes.');
assert.ok(!/\.from\('qr_books'\)\.insert\(/.test(importUi), 'Importer must not create a new book in a separate transaction.');
assert.ok(importUi.includes("rpc('qr_import_manuscript_v5'"), 'Importer must use atomic RPC.');
assert.ok(importUi.includes(".eq('id',String(data?.batch_id||''))"), 'Importer needs a post-write verification.');
assert.ok(importUi.includes('meaningfulFrontmatter') && importUi.includes('chosenSections'));
assert.ok(read('src/pages/BookSections.tsx').includes('loadBookSections'));
assert.ok(read('src/pages/TrashManager.tsx').includes("restore(group.kind,item.id)"));
assert.ok(read('src/pages/Studio.tsx').includes("'/studio/sampah'"));
assert.match(sql,/create or replace function public\.qr_import_manuscript_v5/);
assert.match(sql,/security definer set search_path=''/);
assert.match(sql,/create table if not exists public\.qr_book_sections/);
assert.match(sql,/create or replace function public\.qr_trash_item/);
assert.match(sql,/create or replace function public\.qr_restore_item/);
assert.match(sql,/is_enabled=false,release_at=null/);
assert.ok(!/\bdelete from public\.qr_(?:books|episodes|book_sections)\b/i.test(sql),'Do not hard-delete manuscripts.');
for(const file of ['src/ReaderApp.tsx','src/SecureReaderApp.tsx','src/components/ReaderPage.tsx','src/components/ReadingSettingsModal.tsx']){
 assert.ok(read(file).length>500,`${file} missing`);
}
console.log('PASS V5: Mist Blue scoped, uncropped covers, transactional import, section storage, safe trash and reader preservation contracts.');
