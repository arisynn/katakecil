import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import JSZip from 'jszip';
const port=4178,base=`http://127.0.0.1:${port}`,fixture='/scripts/fixtures/v72/index.html';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://synthetic-qa.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'synthetic-public-key'},stdio:['ignore','pipe','pipe']});
let serverOutput='';server.stdout.on('data',d=>serverOutput+=d);server.stderr.on('data',d=>serverOutput+=d);
for(let n=0;n<80;n++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}).catch(error=>{server.kill('SIGTERM');throw error;});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
mkdirSync('qa/v72',{recursive:true});
let failNext=false,committed=false,importCalls=[];const body='SENTINEL_QA_V72_PRIVATE_8372. Synthetic public test body.\n\n## Heading internal\n\n'+('Synthetic paragraph for pagination.\n\n'.repeat(40));
let editorRow={id:'00000000-0000-4000-8000-000000000012',book_id:'synthetic',episode_number:12,title:'Judul terbaru server',arc_title:'Arc terbaru',content_md:'Synthetic original editor body.',release_at:null,is_enabled:false,is_finale:false,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-02T00:00:00Z',editor_version:0},editorWrites=[];
await page.route('https://synthetic-qa.supabase.co/**',async route=>{
 const req=route.request(),url=req.url(),data=req.postDataJSON();let result;
 if(url.includes('/rpc/qr_author_episode_v72'))result=editorRow;
 else if(url.includes('/rpc/qr_episode_save_v74')){
  editorWrites.push({data,url});
  if(data.p_expected_version!==editorRow.editor_version)return route.fulfill({status:409,json:{code:'40001',message:'Bab berubah di tab lain. Tinjau perubahan sebelum menyimpan.'}});
  editorRow={...editorRow,title:data.p_document.title,arc_title:data.p_document.arc,content_md:data.p_document.body,editor_version:editorRow.editor_version+1,updated_at:new Date(Date.parse(editorRow.updated_at)+1000).toISOString()};
  const {content_md,...metadata}=editorRow;result=metadata;
 }else if(url.includes('/rest/v1/qr_episodes')&&req.method()==='PATCH'){
  editorWrites.push({data,url});
  if(new URL(url).searchParams.get('updated_at')!=='eq.'+editorRow.updated_at)return route.fulfill({status:406,json:{code:'PGRST116',message:'No matching version'}});
  editorRow={...editorRow,...data,updated_at:new Date(Date.parse(editorRow.updated_at)+1000).toISOString()};
  const {content_md,...metadata}=editorRow;result=metadata;
 }else if(url.includes('/functions/v1/secure-episode')){
  if(data.action==='index')result={type:'index',episodes:[0,12,48].map(n=>({episode_number:n,title:`Bab ${n} — Synthetic`,arc_title:'Arc II',release_at:'2026-01-01T00:00:00Z'}))};
  else if(failNext&&data.episodeNumber===48){failNext=false;return route.fulfill({status:503,json:{error:'Synthetic failure'}});}
  else result={episodeNumber:data.episodeNumber,title:`Bab ${data.episodeNumber} — Synthetic`,arc:'Arc II',content:body};
 }else if(url.includes('qr_import_manuscript_v72')){
  importCalls.push(data);result={request_id:data.p_request_id,book_id:data.p_payload.book_id,batch_id:'00000000-0000-4000-8000-000000000009',imported_count:data.p_payload.episodes.length,sections_count:data.p_payload.sections.length};
  if(!committed){committed=true;return route.abort('failed');}
 }else if(url.includes('qr_import_status_v72')){const op=importCalls[0];result=op?{request_id:op.p_request_id,book_id:op.p_payload.book_id,batch_id:'00000000-0000-4000-8000-000000000009',imported_count:op.p_payload.episodes.length,sections_count:op.p_payload.sections.length}:null;}
 else if(url.includes('/rest/v1/qr_books')) result=[{id:'synthetic',slug:'synthetic',title:'Cerita sintetis',synopsis:'Sinopsis untuk uji tampilan.',genre:'Fiksi',cover_url:null,status:'ongoing',is_published:true,is_featured:false,created_at:'2026-01-01',updated_at:'2026-01-01'}];
 else if(url.includes('/rest/v1/qr_episodes')) result=[{book_id:'synthetic',episode_number:1,title:'Bab 1 — Awal',arc_title:'Arc I',release_at:'2026-01-01',is_finale:false}];
 else result=[];
 return route.fulfill({json:result,headers:{'cache-control':'no-store'}});
});
try{
 // Actual detail page: arrow mask visible on mobile/desktop, blue in both themes.
 for(const theme of ['light','dark']) for(const width of [320,390,1440]){
  await page.setViewportSize({width,height:900});await page.goto(base+fixture+'?mode=detail');
  await page.evaluate(t=>{localStorage.setItem('appThemePreference',t);window.dispatchEvent(new Event('katakecil:theme-change'));},theme);
  const back=page.getByRole('button',{name:'Kembali ke Temukan',exact:true});await back.waitFor();
  const icon=back.locator('.kk-brand-icon');assert(await icon.isVisible());
  const detail=await icon.evaluate(n=>{const s=getComputedStyle(n);return{color:s.color,mask:s.maskImage,w:n.getBoundingClientRect().width};});
  assert.equal(detail.color,theme==='light'?'rgb(35, 93, 180)':'rgb(155, 201, 255)');assert(detail.mask.includes('arrow-left.svg'));assert(detail.w>=17);
  const readIcon=page.getByRole('button',{name:'Mulai Membaca',exact:true}).locator('.kk-brand-icon');
  assert.equal(await readIcon.evaluate(n=>getComputedStyle(n).color),theme==='light'?'rgb(255, 255, 255)':'rgb(8, 20, 37)');
  assert((await page.request.get(base+'/assets/v7/icons/arrow-left.svg')).ok());
  if(width===390)await page.screenshot({path:`qa/v72/detail-${theme}-390.png`,fullPage:true});
  await back.click();await page.waitForURL('**/temukan');
 }
 await page.evaluate(()=>{localStorage.setItem('appThemePreference','light');});
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+fixture+'?ep=12');await page.locator('.reader-book').waitFor();
 assert((await page.locator('.reader-book').innerText()).includes('12'));
 assert.equal(await page.locator('.kk-preview-label').count(),0);assert.equal(await page.getByText('Pratinjau penulis',{exact:true}).count(),0);
 await page.screenshot({path:'qa/v72/preview-390.png'});
 const storage=await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}}));assert(!storage.includes('SENTINEL_QA'));
 for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.goto(base+fixture+'?mode=toc');await page.locator('.v610-chapter-row').first().waitFor();
  const rows=await page.locator('.v610-chapter-row').evaluateAll(nodes=>nodes.map(n=>{const a=n.querySelector('.episode-count').getBoundingClientRect(),b=n.querySelector('strong').getBoundingClientRect();return{number:n.querySelector('.episode-count').textContent,delta:Math.abs(a.top-b.top),overflow:n.scrollWidth>n.clientWidth+1};}));
  assert.deepEqual(rows.map(r=>r.number),['00','12','48','9999']);assert(rows.every(r=>r.delta<=2&&!r.overflow),JSON.stringify({width,rows}));
  await page.screenshot({path:`qa/v72/toc-${width}.png`});
  await page.getByRole('tab',{name:'Bab',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('tab',{name:/Penanda/}).getAttribute('aria-selected'),'true');
 }
 await page.setViewportSize({width:390,height:844});
 await page.goto(base+fixture+'?mode=public&ep=12');await page.locator('.reader-book').waitFor();
 await page.locator('.reader-stage').click({position:{x:195,y:400}});
 await page.getByRole('button',{name:'Opsi pembaca lainnya'}).click();
 const next=page.getByRole('menuitem',{name:/Bab berikutnya/i});
 failNext=true;await next.click();await page.getByText('Layanan baca sementara tidak tersedia.').waitFor();assert.equal(await page.locator('.reader-book').count(),0);
 await page.getByRole('button',{name:/coba lagi|coba muat|coba ulang/i}).click();await page.locator('.reader-book').waitFor();assert((await page.locator('.reader-book').innerText()).includes('48'));
 await context.setOffline(true);await page.waitForFunction(()=>!document.querySelector('.reader-book'));assert(!await page.locator('.reader-measure-host').count());await context.setOffline(false);await page.locator('.reader-book').waitFor();
 // Worker parsing, excluded notes, explicit review, lost response and stable retry UUID.
 await page.goto(base+fixture+'?mode=import');
 const z=new JSZip();z.file('001.md','# Bab 1 — Awal\nSynthetic first body.');z.file('002.md','# Bab 2 — Akhir\nSynthetic second body.');z.file('README.md','Synthetic working notes.');z.file('art.jpg','not-a-cover');
 await page.getByLabel('Pilih berkas ZIP, EPUB, MD, atau TXT').setInputFiles({name:'Synthetic.zip',mimeType:'application/zip',buffer:await z.generateAsync({type:'nodebuffer'})});
 await page.getByText('2 episode dipilih', {exact:false}).waitFor();
 const unsupported=page.getByLabel('Simpan art.jpg');assert(await unsupported.isDisabled());assert(!await page.getByLabel('Simpan README').isChecked());
 await page.screenshot({path:'qa/v72/import-390.png',fullPage:true});
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Simpan 2 episode + 0 halaman',exact:true}).click();
 await page.getByRole('button',{name:'Coba simpan lagi',exact:true}).waitFor();await page.getByRole('button',{name:'Coba simpan lagi',exact:true}).click();await page.getByText('Impor berhasil:',{exact:false}).waitFor();
 assert.equal(importCalls.length,2);assert.deepEqual(importCalls[0],importCalls[1]);
 assert(!await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('Synthetic first body')));
 assert.equal(await page.evaluate(()=>sessionStorage.getItem('kk-pending-import-operation-v72')),null);
 // EPUB preamble and two arcs are preserved using the browser DOM parser.
 const epub=new JSZip();epub.file('META-INF/container.xml','<container><rootfiles><rootfile full-path="OEBPS/package.opf"/></rootfiles></container>');epub.file('OEBPS/package.opf','<package><metadata><title>QA EPUB</title></metadata><manifest><item id="chapter" href="chapter.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="chapter"/></spine></package>');epub.file('OEBPS/chapter.xhtml','<html xmlns="http://www.w3.org/1999/xhtml"><body><p>EPUB preamble kept.</p><h1>Arc I</h1><h2>Bab 1</h2><p>First EPUB body.</p><h1>Arc II</h1><h2>Bab 2</h2><p>Second EPUB body.</p></body></html>');
 const epubResult=await page.evaluate(async bytes=>{const {parseEpubFile}=await import('/src/utils/importEpub.ts');return parseEpubFile(new File([new Uint8Array(bytes)],'qa.epub'));},Array.from(await epub.generateAsync({type:'uint8array'})));
 assert(epubResult.chapters.some(c=>c.content_md.includes('EPUB preamble kept.')));assert.equal(epubResult.chapters.find(c=>c.episode_number===2).arc_title,'Arc II');
 // Editor loads one complete fresh snapshot, flushes navigation and preserves conflicts.
 await page.goto(base+fixture+'?mode=editor');
 await page.getByLabel('Isi bab dalam Markdown').waitFor();
 assert.equal(await page.getByLabel('Judul bab',{exact:true}).inputValue(),'Judul terbaru server');
 assert.equal(await page.getByLabel('Arc / bagian (opsional)',{exact:true}).inputValue(),'Arc terbaru');
 await page.getByLabel('Isi bab dalam Markdown').fill('Synthetic editor saved body.');
 await page.getByRole('button',{name:'Kembali ke karya',exact:true}).click();await page.waitForURL('**/studio/cerita/synthetic');
 assert.equal(editorRow.content_md,'Synthetic editor saved body.');assert.equal(editorRow.title,'Judul terbaru server');
 assert(editorWrites.length>=1);assert(editorWrites[0].url.includes('qr_episode_save_v74'));
 await page.goto(base+fixture+'?mode=editor');await page.getByLabel('Isi bab dalam Markdown').waitFor();
 await page.getByRole('button',{name:'Pratinjau',exact:true}).click();await page.locator('.reader-book').waitFor();
 assert.equal(await page.locator('.kk-preview-label').count(),0);
 await page.locator('.reader-stage').click({position:{x:195,y:400}});
 await page.getByRole('button',{name:'Kembali ke editor',exact:true}).click();await page.getByLabel('Isi bab dalam Markdown').waitFor();
 editorRow={...editorRow,editor_version:editorRow.editor_version+1,updated_at:'2026-02-01T00:00:00Z',title:'Judul diubah tab lain',content_md:'Synthetic newer remote body.'};
 await page.getByLabel('Isi bab dalam Markdown').fill('Synthetic unsaved local conflict.');
 await page.getByRole('button',{name:'Kembali ke karya',exact:true}).click();await page.getByRole('alert').filter({hasText:'Bab berubah di tab lain'}).waitFor();
 assert(page.url().includes('mode=editor'));assert.equal(await page.getByLabel('Isi bab dalam Markdown').inputValue(),'Synthetic unsaved local conflict.');
 assert.equal(editorRow.content_md,'Synthetic newer remote body.');
 assert(await page.getByRole('button',{name:'Coba simpan ulang',exact:true}).locator('.kk-brand-icon').isVisible());
 assert(!await page.evaluate(()=>JSON.stringify({...localStorage,...sessionStorage}).includes('Synthetic unsaved local conflict.')));
 // A test-only reload discards the deliberate conflict, with native confirmation.
 page.once('dialog',d=>d.accept());
 // Back and app navigation respect the same active leave guard.
 await page.goto(base+fixture+'?mode=guard');page.once('dialog',d=>d.dismiss());await page.getByRole('button',{name:'Navigasi'}).click();assert(!page.url().includes('step=next'));
 page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'Navigasi'}).click();await page.waitForURL('**step=next');
 await Promise.all([page.waitForEvent('dialog').then(d=>d.dismiss()),page.evaluate(()=>history.back())]);await page.waitForTimeout(150);assert(page.url().includes('step=next'));
 await Promise.all([page.waitForEvent('dialog').then(d=>d.accept()),page.evaluate(()=>history.back())]);await page.waitForURL('**mode=guard');
 page.once('dialog',d=>d.accept());await page.goto(base+fixture+'?ep=0');await page.locator('.reader-book').waitFor();
 // Install instructions and network-only service worker fallback, with empty Cache Storage.
 await page.evaluate(()=>window.dispatchEvent(new Event('kk:install')));await page.getByRole('dialog').waitFor();await page.screenshot({path:'qa/v72/install-390.png'});await page.getByRole('button',{name:'Tutup',exact:true}).click();
 await page.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;});await page.reload();await page.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await new Promise(resolve=>{server.once('exit',resolve);server.kill('SIGTERM');});
 await context.setOffline(true);await page.goto(base+'/baca/synthetic?cold=1');await page.getByRole('heading',{name:'Koneksi diperlukan'}).waitFor();assert.equal(await page.evaluate(async()=>JSON.stringify(await caches.keys())),'[]');await context.setOffline(false);
 assert.equal(errors.length,0,errors.join('\n'));console.log('V7.2 browser: fresh editor snapshot, save-on-navigation, conflict preservation, unobstructed preview and return to editor; detail back arrow and blue/contrast icons (light/dark/mobile/desktop), preview, TOC alignment 320/390/768/1440, tab keys, failed chapter retry, online-only purge, ZIP worker review, lost-response retry, no body storage, install dialog, network-only SW passed.');
}catch(error){console.error('Browser QA failure:',error.message,'URL:',page.url());console.error((await page.locator('body').innerText()).slice(0,1800));await page.screenshot({path:'qa/v72/failure.png',fullPage:true});throw error;}finally{await browser.close();server.kill('SIGTERM');}
