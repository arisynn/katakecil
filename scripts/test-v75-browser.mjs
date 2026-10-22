import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import JSZip from 'jszip';
import {createDatabase,author,rpc} from './test-v75.mjs';
const db=await createDatabase();
let queue=Promise.resolve();const serial=fn=>{const job=queue.then(fn);queue=job.catch(()=>{});return job;};
const sql=(query,args=[])=>serial(()=>db.query(query,args));
const seed=async()=>{
 await sql("insert into qr_books(id,slug,title,synopsis,genre,status,is_published,is_featured)values('synthetic-a','synthetic-a','Cerita Sintetis A','Sinopsis QA','Fiksi','completed',true,true),('synthetic-b','synthetic-b','Cerita Sintetis B','Sinopsis QA','Fiksi','ongoing',true,false)");
 for(let i=1;i<=8;i++)await sql("insert into qr_episodes(book_id,episode_number,title,arc_title,content_md,is_enabled,release_at)values('synthetic-a',$1,$2,'','SENTINEL_V75_PRIVATE_QA',true,now()-$1::integer*interval '1 hour')",[i,`Bab ${i}`]);
};
await seed();
const port=4185,base=`http://127.0.0.1:${port}`,fixture='/scripts/fixtures/v75/index.html';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://synthetic-qa.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'synthetic-key'},stdio:'ignore'});
for(let i=0;i<80;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}).catch(e=>{server.kill();throw e;});
const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[],calls=[];
page.on('pageerror',e=>errors.push(e.message));mkdirSync('qa/v75',{recursive:true});
let loseManagementReply=true;
await context.route('https://synthetic-qa.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1);
 try{
  if(url.pathname.includes('/rpc/')){
   const args=req.postDataJSON()||{};calls.push({name,args:structuredClone(args)});
   const result=await serial(async()=>{await db.exec('reset role');await db.query("select set_config('test.uid',$1,false)",[author]);await db.exec('set role authenticated');try{return await rpc(db,name,args);}finally{await db.exec('reset role');}});
   if(name==='qr_manage_items_v75'&&loseManagementReply){loseManagementReply=false;return route.fulfill({status:503,json:{message:'Synthetic lost successful reply'}});}
   return route.fulfill({json:result});
  }
  if(name==='qr_books'){
   let rows=(await sql('select * from qr_books order by updated_at desc')).rows;
   if(url.searchParams.get('deleted_at')==='is.null')rows=rows.filter(b=>!b.deleted_at);
   if(url.searchParams.get('is_published')==='eq.true')rows=rows.filter(b=>b.is_published);
   return route.fulfill({json:rows});
  }
  if(name==='qr_episodes'){
   assert(!url.searchParams.get('select')?.includes('content_md'),'public catalog must never request manuscript bodies');
   const rows=(await sql('select book_id,episode_number,title,arc_title,release_at,is_finale from qr_episodes where is_enabled and release_at<=now() and deleted_at is null')).rows;
   return route.fulfill({json:rows});
  }
  if(name==='qr_release_rules')return route.fulfill({json:(await sql('select * from qr_release_rules')).rows});
  return route.fulfill({json:[]});
 }catch(e){return route.fulfill({status:400,json:{code:e.code||'P0001',message:e.message}});}
});
async function goto(mode){await page.goto(`${base}${fixture}?mode=${mode}`);}
async function screenshot(name){await page.screenshot({path:`qa/v75/${name}.png`,fullPage:true});}
try{
 // Real EPUB parsing -> confirmation -> actual PostgreSQL import/publication transaction.
 const zip=new JSZip();zip.file('mimetype','application/epub+zip');zip.file('META-INF/container.xml','<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
 zip.file('OPS/content.opf',`<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="book"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:identifier id="book">qa-v75</dc:identifier><dc:title>EPUB Sintetis</dc:title><dc:language>id</dc:language></metadata><manifest>${[1,2,3,4,5,6].map(i=>`<item id="c${i}" href="chapter-${i}.xhtml" media-type="application/xhtml+xml"/>`).join('')}</manifest><spine>${[1,2,3,4,5,6].map(i=>`<itemref idref="c${i}"/>`).join('')}</spine></package>`);
 for(let i=1;i<=6;i++)zip.file(`OPS/chapter-${i}.xhtml`,`<html xmlns="http://www.w3.org/1999/xhtml"><head><title>Bab ${i}</title></head><body><h1>Bab ${i}</h1><p>Isi bab sintetis nomor ${i}. Seluruh teks ini hanya dipakai sebagai data uji penerbitan.</p></body></html>`);
 await goto('import');await page.locator('input[type=file][name=manuscript]').setInputFiles({name:'synthetic.epub',mimeType:'application/epub+zip',buffer:await zip.generateAsync({type:'nodebuffer'})});
 await page.getByLabel('Setelah impor').waitFor();await page.getByLabel('Setelah impor').selectOption('mixed');
 await page.getByRole('button',{name:'3× seminggu',exact:true}).click();
 await page.getByLabel('Pratinjau penerbitan').getByText('3 bab terbit sekarang · 3 bab terjadwal').waitFor();
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`import horizontal overflow at ${width}`);
 }
 await page.setViewportSize({width:390,height:844});await screenshot('import-mobile');
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:/Simpan 6 episode/}).click();await page.getByRole('status').filter({hasText:'Impor berhasil:'}).waitFor();
 let imported=(await sql("select e.* from qr_episodes e join qr_books b on b.id=e.book_id where b.title='EPUB Sintetis' order by e.episode_number")).rows;
 assert.equal(imported.length,6);assert.equal(imported.filter(e=>Date.parse(e.release_at)<=Date.now()).length,3);assert.equal(imported.filter(e=>Date.parse(e.release_at)>Date.now()).length,3);
 const importedBook=imported[0].book_id;
 // Pause future chapters, then resume using a visible, newly confirmed release plan.
 await goto('schedule');await page.getByRole('button',{name:'Jadwal massal',exact:true}).click();await page.getByRole('combobox',{name:/^Novel/}).selectOption(importedBook);
 const pause=page.getByRole('button',{name:'Jeda 3 bab mendatang',exact:true});await pause.waitFor();await page.waitForFunction(()=>!document.querySelector('.v3-plan-layout fieldset')?.disabled);
 page.once('dialog',d=>d.accept());await pause.click();await page.getByRole('status').filter({hasText:'3 bab berhasil dijeda'}).waitFor();
 assert.equal((await sql('select count(*)::int n from qr_episodes where book_id=$1 and is_enabled',[importedBook])).rows[0].n,3);
 await page.getByLabel('Bab yang diatur').selectOption('resume');await page.getByRole('button',{name:'Semua bab (3)',exact:true}).click();await page.getByRole('button',{name:'1× seminggu',exact:true}).click();await page.getByRole('button',{name:'Pratinjau jadwal',exact:true}).click();
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Konfirmasi 3 jadwal',exact:true}).click();await page.getByRole('status').filter({hasText:'3 bab berhasil dijadwalkan'}).waitFor();await screenshot('schedule-mobile');
 assert.equal((await sql('select count(*)::int n from qr_episodes where book_id=$1 and is_enabled',[importedBook])).rows[0].n,6);
 // Global delete intentionally includes novels hidden by the title filter. Lost reply retries identical operation.
 await goto('books');await page.getByRole('button',{name:'Hapus semua novel (3)',exact:true}).waitFor();await page.getByPlaceholder('Cari judul atau genre…').fill('Sintetis A');
 await page.getByRole('button',{name:'Hapus semua novel (3)',exact:true}).click();await page.getByRole('dialog').waitFor();assert(await page.getByRole('dialog').getByText('Cerita Sintetis B',{exact:true}).isVisible());
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert(await page.getByRole('dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1));}
 await page.setViewportSize({width:390,height:844});await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});assert.equal((await sql('select count(*)::int n from qr_books where deleted_at is not null')).rows[0].n,0,'Escape must cancel without a mutation');await page.getByRole('button',{name:'Hapus semua novel (3)',exact:true}).click();
 await page.getByRole('dialog').getByRole('textbox').fill('HAPUS');await screenshot('delete-confirmation-mobile');await page.getByRole('button',{name:'Pindahkan ke Sampah',exact:true}).click();await page.getByRole('dialog').getByRole('alert').waitFor();await page.getByRole('button',{name:'Coba lagi',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});
 const management=calls.filter(c=>c.name==='qr_manage_items_v75');assert.deepEqual(management[0].args,management[1].args);
 assert.equal((await sql('select count(*)::int n from qr_books where deleted_at is not null')).rows[0].n,3);
 // Restore all as private; no chapter is exposed merely by restoring its parent.
 await goto('trash');await page.getByRole('button',{name:'Pilih semua (3)',exact:true}).click();await page.getByRole('button',{name:'Pulihkan terpilih (3)',exact:true}).click();await page.getByRole('dialog').getByRole('textbox').fill('PULIHKAN');await page.getByRole('dialog').getByRole('button',{name:'Pulihkan',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});
 assert((await sql('select * from qr_books')).rows.every(b=>!b.deleted_at&&!b.is_published));
 await sql("update qr_books set is_published=true where id='synthetic-a'");
 await goto('home');await page.getByRole('region',{name:'Novel tamat',exact:true}).waitFor();assert.equal(await page.locator('.v68-chapter-item').count(),6);
 for(const theme of ['light','dark'])for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.evaluate(t=>{localStorage.setItem('appThemePreference',t);window.dispatchEvent(new Event('katakecil:theme-change'));},theme);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`home overflow at ${width}`);
  if(width===390)await screenshot(`home-${theme}-mobile`);
 }
 assert(!await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('SENTINEL_V75_PRIVATE_QA')));
 await goto('books');await page.getByRole('button',{name:'Hapus semua novel (3)',exact:true}).click();await page.getByRole('dialog').getByRole('textbox').fill('HAPUS');await page.getByRole('dialog').getByRole('button',{name:'Pindahkan ke Sampah',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});
 await goto('trash');await page.getByRole('button',{name:'Kosongkan Sampah',exact:true}).click();await page.getByRole('dialog').getByRole('textbox').fill('HAPUS PERMANEN');await page.getByRole('dialog').getByRole('button',{name:'Hapus permanen',exact:true}).click();await page.getByRole('dialog').waitFor({state:'detached'});assert.equal((await sql('select count(*)::int n from qr_books')).rows[0].n,0);
 assert.deepEqual(errors,[]);
 console.log('V7.5 browser + PostgreSQL: real EPUB -> mixed 3-now/3-scheduled publication, presets, pause/resume, global delete across filters, lost-reply replay, private restoration, 6 recent chapters, completed shelf, 320–1440 layouts, both themes and no manuscript persistence passed.');
}catch(e){console.error(e.message);console.error((await page.locator('body').innerText()).slice(-4500));await screenshot('failure');throw e;}
finally{await browser.close();server.kill('SIGTERM');await db.close();}
