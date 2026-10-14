import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
const read = path => readFileSync(path,'utf8');
const app=read('src/App.tsx');
const page=read('src/pages/PublicLibrary.tsx');
const studio=read('src/pages/Studio.tsx');
const nav=read('src/features/studio/components/StudioNavigation.tsx');
const carousel=read('src/features/public/components/DiscoveryNotices.tsx');
const api=read('src/data/announcements.ts');
const manager=read('src/features/studio/components/AnnouncementManager.tsx');
const sql=read('supabase/migrations/20261014010000_v7_public_announcements.sql');
const css=read('src/design/v70-alpha3.css');
assert.match(JSON.parse(read('package.json')).version,/^(?:7\.0\.0-(?:alpha\.[34]|beta\.[12])|7\.1\.0-rc\.1)$/);
assert.match(app,/design\/v70-alpha3.css/);
assert.match(page,/getPublicAnnouncements\(\)/);
assert.match(page,/<DiscoveryNotices books={books} episodes={episodes} schedules={schedules} announcements={announcements}\/>/);
assert.match(studio,/sections\[1\] === 'pengumuman' \? <AnnouncementManager books={books}\/>/);
assert.match(nav, /\/studio\/pengumuman/);
assert.match(manager,/saveAnnouncement/);
assert.match(manager,/deleteAnnouncement/);
assert.match(manager,/datetime-local/);
assert.match(manager,/type="submit" disabled={busy}/);
assert.match(sql,/enable row level security/);
assert.match(sql,/status = 'published' and starts_at <= now\(\)/);
assert.match(sql,/ends_at is null or ends_at > now\(\)/);
assert.match(sql,/qr_author_members/);
assert.match(sql,/revoke all on public.qr_announcements from public, anon, authenticated/);
assert.match(sql,/book_id is null or exists/);
assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g,''),/#[0-9a-f]{3,8}\b|rgba?\s*\(|hsla?\s*\(/i);
// Pure domain functions are tested without React, network, or real Supabase.
const funcs=api.slice(api.indexOf('export function isActiveAnnouncement'),api.indexOf('/** This optional feature'));
const compiled=ts.transpileModule(`${funcs.replace(/^export /gm, '')}\nthis.isActiveAnnouncement=isActiveAnnouncement;this.validateAnnouncement=validateAnnouncement;`,{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText;
const context={Date,Number};runInNewContext(compiled,context);
const now=Date.parse('2026-10-14T08:00:00Z');
const sample={id:'a1',title:'Halo',body:'',book_id:null,starts_at:'2026-10-13T08:00:00Z',ends_at:null};
assert.equal(context.isActiveAnnouncement(sample,now),true);
assert.equal(context.isActiveAnnouncement({...sample,starts_at:'2026-10-15T08:00:00Z'},now),false);
assert.equal(context.isActiveAnnouncement({...sample,ends_at:'2026-10-14T07:59:59Z'},now),false);
assert.equal(context.isActiveAnnouncement({...sample,ends_at:'2026-10-14T08:00:00Z'},now),false);
assert.equal(context.isActiveAnnouncement({...sample,ends_at:'2026-10-14T08:00:01Z'},now),true);
const input={title:'Pengumuman',body:'Halo',book_id:null,starts_at:sample.starts_at,ends_at:null,status:'draft'};
assert.equal(context.validateAnnouncement(input),null);
assert.ok(context.validateAnnouncement({...input,title:' '}));
assert.ok(context.validateAnnouncement({...input,body:'x'.repeat(321)}));
assert.ok(context.validateAnnouncement({...input,ends_at:'2026-10-12T08:00:00Z'}));
const select=carousel.slice(carousel.indexOf('export function buildDiscoveryNotices'),carousel.indexOf('export default function DiscoveryNotices'));
const noticeCompiled=ts.transpileModule(`${select.replace(/^export /gm, '')}\nthis.buildDiscoveryNotices=buildDiscoveryNotices;`,{compilerOptions:{module:ts.ModuleKind.None,target:ts.ScriptTarget.ES2022}}).outputText;
const sandbox={Date,Intl,Map,Set,Number,isActiveAnnouncement:context.isActiveAnnouncement};
runInNewContext(noticeCompiled,sandbox);
const book={id:'book',slug:'masa-panen',title:'Masa Panen',is_published:true};
const hidden={id:'hidden',slug:'draft',title:'Draft',is_published:false};
const active={...sample,book_id:'book'};
const notices=sandbox.buildDiscoveryNotices([book,hidden],[],[],now,[
 active,{...sample,id:'a2',book_id:null,title:'Pengumuman umum'},
 {...sample,id:'a3',book_id:'hidden',title:'Rahasia'},
 {...sample,id:'a4',starts_at:'2026-10-15T08:00:00Z',title:'Belum tayang'},
 {...sample,id:'a5',ends_at:'2026-10-14T07:00:00Z',title:'Kedaluwarsa'},
]);
assert.equal(notices.length,2);
assert.equal(notices[0].kind,'announcement');
assert.equal(notices[0].slug,'masa-panen');
assert.equal(notices[1].slug,undefined);
assert.ok(notices.every(n=>n.title!=='Rahasia'));
for(const file of ['src/data/announcements.ts','src/pages/PublicLibrary.tsx','src/pages/Studio.tsx','src/features/studio/components/AnnouncementManager.tsx','src/features/public/components/DiscoveryNotices.tsx']) {
 const result=ts.transpileModule(read(file),{fileName:file,reportDiagnostics:true,compilerOptions:{jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}});
 assert.equal(result.diagnostics?.filter(d=>d.category===ts.DiagnosticCategory.Error).length??0,0,file);
}
console.log('PASS V7 Alpha.3: Studio notices CRUD wiring, scheduled visibility, draft privacy, hidden-book isolation, Sapphire CSS, TS/TSX parse.');
