import assert from 'node:assert/strict';
import {readFileSync,mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
await db.exec(readFileSync('scripts/test-v72-database.mjs','utf8').match(/await db.exec\(`([\s\S]*?)`\);/)[1]);
for(const name of ['20261014085124_v72_online_pwa_smart_import.sql','20261015225222_v74_private_editor_revisions.sql'])await db.exec(readFileSync(`supabase/migrations/${name}`,'utf8'));
const ep='00000000-0000-4000-8000-000000000012';
await db.exec(`insert into qr_books(id,slug,title,is_published)values('synthetic','synthetic','Synthetic QA',true);
 insert into qr_episodes(id,book_id,episode_number,title,arc_title,content_md,is_enabled,release_at,is_finale)values('${ep}','synthetic',12,'Synthetic initial title','Synthetic initial arc','SENTINEL_V74_PRIVATE original synthetic body.',true,'2026-01-01T00:00:00Z',true);
 select set_config('test.uid','00000000-0000-4000-8000-000000000001',false);set role authenticated;`);
const rpc=async(name,args)=>(await db.query(`select public.${name}(${Object.keys(args).map((k,i)=>`${k}=>$${i+1}`).join(',')}) as result`,Object.values(args).map(v=>typeof v==='object'&&v!==null?JSON.stringify(v):v))).rows[0].result;
const current=()=>rpc('qr_author_episode_v72',{p_episode_id:ep});
const remoteEdit=async values=>{const row=await current();return rpc('qr_episode_save_v74',{p_episode_id:ep,p_request_id:crypto.randomUUID(),p_expected_version:row.editor_version,p_document:{title:row.title,arc:row.arc_title,body:row.content_md,...values},p_reason:'automatic'});};
const port=4180,base=`http://127.0.0.1:${port}`,url=base+'/scripts/fixtures/v72/index.html?mode=editor';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://synthetic-qa.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'synthetic-public-key'},stdio:'ignore'});
for(let i=0;i<80;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}).catch(e=>{server.kill();throw e;});
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));mkdirSync('qa/v74',{recursive:true});
let writes=[],bodyReads=0,loseReply=false,missingMigration=false;
await context.route('https://synthetic-qa.supabase.co/**',async route=>{
 const path=new URL(route.request().url()).pathname,name=path.split('/').at(-1),args=route.request().postDataJSON()??{};
 if(!path.includes('/rest/v1/rpc/'))return route.fulfill({json:[]});
 if(name==='qr_episode_save_v74'){
  writes.push(structuredClone(args));
  if(missingMigration)return route.fulfill({status:404,json:{code:'PGRST202',message:'Synthetic missing migration'}});
 }
 if(name==='qr_episode_revision_v74')bodyReads++;
 try{const result=await rpc(name,args);if(name==='qr_episode_save_v74'&&loseReply){loseReply=false;return route.abort('failed');}return route.fulfill({json:result,headers:{'cache-control':'private, no-store, max-age=0'}});}
 catch(e){return route.fulfill({status:e.code==='40001'?409:400,json:{code:e.code,message:e.message}});}
});
const body=()=>page.getByLabel('Isi bab dalam Markdown'),dialog=()=>page.getByRole('dialog'),reviewBody=()=>page.getByLabel('Isi hasil tinjauan'),check=()=>page.getByRole('checkbox',{name:'Saya sudah meninjau hasil ini'});
try{
 await page.goto(url);await body().waitFor();
 await body().fill('SENTINEL_V74_PRIVATE unsaved before history.');
 await page.getByRole('button',{name:'Riwayat revisi',exact:true}).click();await dialog().waitFor();await page.getByRole('button',{name:'Buat checkpoint',exact:true}).waitFor();
 assert.equal((await current()).content_md,'SENTINEL_V74_PRIVATE unsaved before history.');assert(await body().isDisabled());assert.equal(bodyReads,0,'history list must not fetch every body');
 await page.getByRole('button',{name:'Buat checkpoint',exact:true}).click();await page.waitForFunction(()=>document.querySelectorAll('.kk-revision-list li').length===2);
 await page.locator('.kk-revision-list button').last().click();await reviewBody().waitFor();assert.equal(await reviewBody().inputValue(),'SENTINEL_V74_PRIVATE original synthetic body.');assert.equal(bodyReads,1);
 const restore=page.getByRole('button',{name:'Pulihkan hasil tinjauan',exact:true});assert(await restore.isDisabled());await check().check();page.once('dialog',d=>d.accept());await restore.click();await dialog().waitFor({state:'detached'});
 assert.equal(await body().inputValue(),'SENTINEL_V74_PRIVATE original synthetic body.');let row=await current();assert(row.is_enabled&&row.is_finale);assert.equal(Date.parse(row.release_at),Date.parse('2026-01-01T00:00:00Z'));
 // Real SQL CAS, two competing edits, three versions, manually reviewed merge.
 await remoteEdit({title:'Synthetic remote title',arc:'Synthetic remote arc',body:'SENTINEL_V74_PRIVATE remote body.'});
 await body().fill('SENTINEL_V74_PRIVATE local conflict body.');await page.getByRole('button',{name:'Tinjau konflik',exact:true}).waitFor();
 const beforeConflict=writes.length;await page.waitForTimeout(1900);assert.equal(writes.length,beforeConflict,'autosave pauses after conflict');
 await page.getByRole('button',{name:'Tinjau konflik',exact:true}).click();await reviewBody().waitFor();
 assert.equal(await page.getByLabel('Judul hasil tinjauan').inputValue(),'Synthetic remote title');assert.equal(await reviewBody().inputValue(),'SENTINEL_V74_PRIVATE local conflict body.');
 await page.getByText('Versi dasar editor',{exact:true}).click();await dialog().getByText('Synthetic initial title',{exact:true}).waitFor();
 for(const theme of ['light','dark'])for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.evaluate(t=>{localStorage.setItem('appThemePreference',t);window.dispatchEvent(new Event('katakecil:theme-change'));},theme);
  await page.waitForFunction(t=>document.querySelector('.studio-app')?.getAttribute('data-kk-theme')===t,theme);
  assert(await dialog().evaluate(n=>n.scrollWidth<=n.clientWidth+1));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const color=await page.getByRole('button',{name:'Muat ulang versi server',exact:true}).locator('.kk-brand-icon').evaluate(n=>getComputedStyle(n).color);assert.equal(color,theme==='light'?'rgb(35, 93, 180)':'rgb(155, 201, 255)');
  if(width===390)await page.screenshot({path:`qa/v74/conflict-${theme}-390.png`,fullPage:true});
 }
 await reviewBody().fill('SENTINEL_V74_PRIVATE manually combined body.');await check().check();
 await remoteEdit({body:'SENTINEL_V74_PRIVATE remote changed again.'});page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Simpan hasil tinjauan',exact:true}).click();
 await dialog().getByRole('alert').filter({hasText:'Bab berubah di tab lain'}).waitFor();assert.equal((await current()).content_md,'SENTINEL_V74_PRIVATE remote changed again.');assert.equal(await body().inputValue(),'SENTINEL_V74_PRIVATE manually combined body.');
 await page.getByRole('button',{name:'Muat ulang versi server',exact:true}).click();await page.waitForFunction(()=>!document.body.innerText.includes('Memuat revisi…'));assert.equal(await reviewBody().inputValue(),'SENTINEL_V74_PRIVATE manually combined body.','refresh must preserve reviewed text');assert(!await check().isChecked());
 await check().check();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Simpan hasil tinjauan',exact:true}).click();await dialog().waitFor({state:'detached'});assert.equal((await current()).content_md,'SENTINEL_V74_PRIVATE manually combined body.');
 // Lost successful response retries the exact UUID/payload and creates no second revision.
 loseReply=true;await body().fill('SENTINEL_V74_PRIVATE lost acknowledgement body.');await page.getByRole('button',{name:'Coba simpan ulang',exact:true}).waitFor();const lost=writes.at(-1),versionAfterLost=(await current()).editor_version;
 await page.getByRole('button',{name:'Coba simpan ulang',exact:true}).click();await page.waitForFunction(()=>!document.querySelector('.kk-v71-save-retry'));assert.deepEqual(writes.at(-1),lost);assert.equal((await current()).editor_version,versionAfterLost);
 // History reload, keyboard cancellation, focus restoration, and no persistent manuscript bodies.
 await page.getByRole('button',{name:'Riwayat revisi',exact:true}).click();await dialog().waitFor();await page.getByRole('button',{name:'Buat checkpoint',exact:true}).waitFor();await page.screenshot({path:'qa/v74/history-dark-1440.png',fullPage:true});await page.keyboard.press('Escape');await dialog().waitFor({state:'detached'});
 assert(!await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('SENTINEL_V74_PRIVATE')));assert.equal(await page.evaluate(async()=>JSON.stringify(await caches.keys())),'[]');
 // Missing migration is explicit; no unsafe fallback to a direct manuscript PATCH.
 missingMigration=true;await body().fill('SENTINEL_V74_PRIVATE unsaved missing migration.');await page.getByRole('alert').filter({hasText:'Pasang migrasi V7.4'}).waitFor();assert.equal(await body().inputValue(),'SENTINEL_V74_PRIVATE unsaved missing migration.');assert.notEqual((await current()).content_md,'SENTINEL_V74_PRIVATE unsaved missing migration.');
 assert.deepEqual(errors,[]);console.log('V7.4 browser + real PostgreSQL RPCs: flush before history, metadata-only list/lazy body, checkpoint/restore, preserved release/finale, paused conflict autosave, three-version review, second conflict, merge retained on refresh, exact UUID lost-ack retry, themes/320–1440 layout, Escape, no body/cache persistence, missing migration passed.');
}catch(e){console.error('V7.4 browser failure:',e.message);console.error((await page.locator('body').innerText()).slice(-3500));await page.screenshot({path:'qa/v74/failure.png',fullPage:true});throw e;}
finally{await browser.close();server.kill('SIGTERM');await db.close();}
