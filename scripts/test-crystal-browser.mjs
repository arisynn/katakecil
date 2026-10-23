/** Full UI flow with synthetic public content and an isolated fake author session. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
const port=4209,base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{env:{...process.env,DISABLE_HMR:'true',VITE_SUPABASE_URL:'https://crystal-qa.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'},stdio:'ignore'});
let browser,page;
const date='2026-01-01T00:00:00Z',uid='00000000-0000-4000-8000-000000000001';
const user={id:uid,aud:'authenticated',role:'authenticated',email:'author@example.test',email_confirmed_at:date,created_at:date,app_metadata:{provider:'email'},user_metadata:{display_name:'Penulis Uji'},identities:[]};
const books=['Awal Sebuah Cerita','Sebuah Judul Panjang untuk Menguji Ruang dan Keterbacaan'].map((title,i)=>({id:`synthetic-${i}`,slug:`synthetic-${i}`,title,synopsis:'Sebuah cerita sintetis untuk menguji tampilan, tanpa menyertakan naskah asli.',genre:i?'Drama':'Fiksi',status:i?'completed':'ongoing',cover_url:null,is_published:true,is_featured:false,created_at:date,updated_at:date}));
const episodes=books.flatMap(book=>[1,2].map(n=>({id:`${book.id}-ep-${n}`,book_id:book.id,episode_number:n,title:`Bab ${n} — Uji`,arc_title:'Arc Uji',content_md:'',release_at:date,is_enabled:true,is_finale:n===2,created_at:date,updated_at:date,editor_version:0})));
const sections=[{id:'synthetic-section',book_id:'synthetic-0',position:1,section_type:'frontmatter',title:'Dedikasi Uji',content_md:'Halaman sintetis.',created_at:date,updated_at:date}];
const managementCalls=[],receipts=new Map();let loseTrashReply=true;
let editor={...episodes[0],content_md:'Isi naskah sintetis untuk pengujian editor.'},writes=0,failCatalog=false;
try{
 for(let n=0;n<100;n++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 page=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('kk-apk-prompt-dismissed',String(Date.now())));
 await page.route('https://fonts.**/**',r=>r.abort());
 await page.route('https://crystal-qa.supabase.co/**',async route=>{
  const req=route.request(),url=new URL(req.url()),name=url.pathname.split('/').at(-1),body=req.postDataJSON();let result=[];
  if(req.method()==='OPTIONS')return route.fulfill({status:204});
  if(url.pathname.includes('/auth/v1/token')){
   const jwt=`${Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')}.${Buffer.from(JSON.stringify({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.synthetic`;
   result={access_token:jwt,token_type:'bearer',expires_in:3600,refresh_token:'synthetic-refresh',user};
  }else if(url.pathname.endsWith('/auth/v1/user'))result=user;
  else if(url.pathname.endsWith('/auth/v1/logout'))return route.fulfill({status:204});
  else if(name==='qr_books'){
   if(failCatalog)return route.fulfill({status:503,json:{message:'Synthetic temporary catalog failure'}});
   const slug=url.searchParams.get('slug')?.replace('eq.','');const available=books.filter(book=>!book.deleted_at);result=slug?available.find(b=>b.slug===slug):available;
   if(slug&&!req.headers().accept?.includes('vnd.pgrst.object'))result=result?[result]:[];
  }else if(name==='qr_episodes')result=episodes.map(({content_md,...row})=>row);
  else if(name==='qr_public_next_chapters')result=[{book_id:'synthetic-0',episode_number:3,release_at:'2099-01-01T12:00:00Z'}];
  else if(name==='qr_book_sections')result=sections.filter(section=>!section.deleted_at);
  else if(name==='qr_get_trash')result={books:books.filter(book=>book.deleted_at),episodes:episodes.filter(ep=>ep.deleted_at),sections:sections.filter(section=>section.deleted_at)};
  else if(name==='qr_manage_items_v75'){
   managementCalls.push(body);if(!receipts.has(body.p_request_id)){for(const item of body.p_items){const row=(item.kind==='book'?books:item.kind==='episode'?episodes:sections).find(row=>row.id===item.id);row.deleted_at=body.p_action==='trash'?new Date().toISOString():null;if(item.kind==='book')row.is_published=false;if(item.kind==='episode'){row.is_enabled=false;row.release_at=null;}}receipts.set(body.p_request_id,{count:body.p_items.length,cleanup_queued:false});}
   if(loseTrashReply){loseTrashReply=false;return route.fulfill({status:503,json:{message:'Synthetic lost trash response'}});}result=receipts.get(body.p_request_id);
  }
  else if(name==='qr_author_members')result=[{user_id:uid}];
  else if(name==='qr_author_episode_metadata_v72')result=episodes.map(({content_md,...row})=>row);
  else if(name==='qr_author_episode_v72')result=editor;
  else if(name==='qr_episode_save_v74'){
   writes++;editor={...editor,title:body.p_document.title,arc_title:body.p_document.arc,content_md:body.p_document.body,editor_version:editor.editor_version+1,updated_at:new Date().toISOString()};result=editor;
  }else if(name==='secure-episode')result=body.action==='index'?{type:'index',episodes:episodes.filter(ep=>ep.book_id===body.bookId).map(({episode_number,title,arc_title,release_at})=>({episode_number,title,arc_title,release_at}))}:{episodeNumber:body.episodeNumber,title:`Bab ${body.episodeNumber} — Uji`,arc:'Arc Uji',content:'Teks sintetis untuk pengujian halaman membaca.\n\n'.repeat(50)};
  return route.fulfill({json:result});
 });
 mkdirSync('qa/crystal',{recursive:true});
 await page.goto(base);await page.getByRole('heading',{name:'Library.',exact:true}).waitFor();await page.locator('.crystal-story').first().waitFor();
 assert.equal(await page.locator('.crystal-story').count(),2);assert.equal(await page.locator('.v6-public-bottom').count(),0);assert.equal(await page.locator('.crystal-story-copy').count(),0);
 assert.equal(await page.getByRole('button',{name:/^(?:Baca|Mulai Membaca|Lanjutkan Membaca)$/}).count(),0);
 for(const theme of ['light','dark'])for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:900});await page.evaluate(t=>{localStorage.setItem('appThemePreference',t);window.dispatchEvent(new Event('katakecil:theme-change'));},theme);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Library overflow ${width}/${theme}`);if(width<=390)assert.equal(await page.locator('.crystal-shelf').evaluate(n=>getComputedStyle(n).gridTemplateColumns.split(' ').length),3);
  if(width===390||width===1440)await page.screenshot({path:`qa/crystal/library-${theme}-${width}.png`,fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Informasi Awal Sebuah Cerita',exact:true}).click();
 await page.getByRole('dialog',{name:'Awal Sebuah Cerita',exact:true}).waitFor();await page.getByText('Bab 3 ·',{exact:false}).waitFor();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:844});assert(await page.getByRole('dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1));if(width===390)await page.screenshot({path:'qa/crystal/book-popup.png',fullPage:true});}
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Buka episode 1: Bab 1 — Uji',exact:true}).click();
 await page.waitForURL('**/baca/synthetic-0?episode=1');await page.locator('.reader-book').waitFor();
 await page.locator('.reader-stage').click({position:{x:195,y:400}});await page.getByRole('button',{name:'Opsi pembaca lainnya'}).click();await page.getByRole('menuitem',{name:/Bab berikutnya/}).click();
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kk-secure-progress-synthetic-0')||'null')?.ep===2);
 await page.locator('.reader-book').waitFor();await page.locator('.reader-stage').click({position:{x:195,y:400}});await page.getByRole('button',{name:'Kembali ke Library'}).click();await page.waitForURL(base+'/');await page.getByRole('button',{name:'Informasi Awal Sebuah Cerita',exact:true}).click();await page.getByText('Terakhir dibaca',{exact:true}).waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});
 await page.evaluate(async()=>{(await import('/src/utils/nav.ts')).navigate('/baca/synthetic-0');});await page.locator('.reader-book').waitFor();await page.evaluate(()=>window.dispatchEvent(new Event('offline')));await page.getByRole('alert').filter({hasText:'Koneksi diperlukan'}).waitFor();await page.getByRole('button',{name:'Kembali ke Library',exact:true}).click();await page.waitForURL(base+'/');
 await page.getByRole('button',{name:'Buka menu',exact:true}).click();await page.getByRole('menuitem',{name:'Studio penulis'}).click();
 await page.getByLabel('Email',{exact:true}).fill('author@example.test');await page.getByLabel('Kata sandi',{exact:true}).fill('synthetic-test-password');await page.screenshot({path:'qa/crystal/login.png',fullPage:true});await page.getByRole('button',{name:/Masuk ke Studio/}).click();
 await page.getByRole('heading',{name:'Karya.'}).waitFor();
 assert.equal(await page.getByRole('navigation',{name:'Navigasi Studio',exact:true}).getByRole('button').count(),3);
 const cards=await page.locator('.writer-book-card').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));
 assert(await page.locator('.writer-book-card').evaluateAll(nodes=>nodes.every(node=>node.getBoundingClientRect().height<200)),'Compact work cards must not waste a full screen');assert.equal(cards.length,2);assert(Math.abs(cards[0].y-cards[1].y)<1&&cards[1].x>cards[0].x,'390px Studio must show works side by side');
 await page.screenshot({path:'qa/crystal/studio-mobile-dark.png',fullPage:true});
 await page.locator('.writer-book-open').first().click();await page.getByRole('tab',{name:'Pengaturan',exact:true}).click();
 const title=page.getByLabel('Judul cerita',{exact:true});await title.fill('Judul belum disimpan');
 page.once('dialog',d=>d.dismiss());await page.getByRole('tab',{name:'Bab',exact:true}).click();assert.equal(await title.inputValue(),'Judul belum disimpan');
 page.once('dialog',d=>d.accept());await page.getByRole('tab',{name:'Bab',exact:true}).click();await page.getByRole('heading',{name:'Daftar Bab',exact:true}).waitFor();
 await page.screenshot({path:'qa/crystal/book-mobile.png',fullPage:true});
 await page.getByRole('tab',{name:'Halaman buku',exact:true}).click();await page.getByRole('button',{name:'Tambah halaman',exact:true}).click();
 await page.getByLabel('Isi Markdown',{exact:true}).fill('Dedikasi yang belum disimpan.');
 await page.waitForFunction(async()=>(await import('/src/utils/nav.ts')).hasPendingWork());
 page.once('dialog',d=>d.dismiss());await page.getByRole('tab',{name:'Bab',exact:true}).click();assert(await page.getByLabel('Isi Markdown',{exact:true}).isVisible());
 page.once('dialog',d=>d.accept());await page.getByRole('tab',{name:'Bab',exact:true}).click();
 await page.evaluate(async()=>{(await import('/src/utils/nav.ts')).navigate('/studio/editor/synthetic-0-ep-1');});
 const body=page.getByLabel('Isi bab dalam Markdown');await body.waitFor();
 assert((await body.evaluate(n=>parseFloat(getComputedStyle(n).fontSize)))>=16);
 assert((await body.evaluate(n=>parseFloat(getComputedStyle(n).lineHeight)))>=29);
 await body.fill('Isi naskah sintetis yang disimpan dari desain Studio baru.');
 await page.waitForFunction(()=>document.querySelector('.v69-editor-heading strong')?.textContent==='Tersimpan');assert(writes>0);
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Editor overflow ${width}`);if(width!==320)await page.screenshot({path:`qa/crystal/editor-${width}.png`,fullPage:true});}
 await page.reload();await body.waitFor();assert.equal(await body.inputValue(),'Isi naskah sintetis yang disimpan dari desain Studio baru.');
 await page.getByRole('navigation',{name:'Navigasi Studio',exact:true}).getByRole('button',{name:'Karya',exact:true}).click();
 await page.getByRole('button',{name:'Cerita baru',exact:true}).click();await page.getByLabel('Judul cerita',{exact:true}).fill('Karya yang belum disimpan');
 page.once('dialog',d=>d.dismiss());await page.getByRole('navigation',{name:'Navigasi Studio',exact:true}).getByRole('button',{name:'Impor',exact:true}).click();assert(await page.getByLabel('Judul cerita',{exact:true}).isVisible());
 page.once('dialog',d=>d.accept());await page.getByRole('navigation',{name:'Navigasi Studio',exact:true}).getByRole('button',{name:'Impor',exact:true}).click();
 await page.locator('input[type=file][name=manuscript]').setInputFiles({name:'synthetic.md',mimeType:'text/markdown',buffer:Buffer.from('# Bab 1\n\nNaskah sintetis untuk pemilih berkas.\n\n# Bab 2\n\nNaskah bab berikutnya.')});
 await page.getByLabel('Setelah impor').waitFor();
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Importer overflow ${width}`);if(width===390)await page.screenshot({path:'qa/crystal/importer-mobile.png',fullPage:true});}
 page.once('dialog',d=>d.accept());await page.getByRole('navigation',{name:'Navigasi Studio',exact:true}).getByRole('button',{name:'Jadwal',exact:true}).click();await page.locator('.v3-days').waitFor();assert(await page.locator('.v3-day-detail').evaluate(node=>node.getBoundingClientRect().height<240),'An empty calendar detail must stay compact');
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Schedule overflow ${width}`);if(width===390)await page.screenshot({path:'qa/crystal/schedule-mobile.png',fullPage:true});}
 for(const route of ['/studio/settings','/studio/analytics','/studio/database','/studio/sampah','/studio/pengumuman','/studio']){
  await page.evaluate(async path=>(await import('/src/utils/nav.ts')).navigate(path),route);await page.waitForURL(base+route);await page.locator('.writer-page-body').waitFor();
  await page.setViewportSize({width:320,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route} overflow`);
  if(route!=='/studio'){await page.setViewportSize({width:390,height:900});await page.screenshot({path:`qa/crystal/tool-${route.split('/').at(-1)}.png`,fullPage:true});}
  if(route==='/studio/settings'){const layout=await page.locator('.writer-settings-grid>.studio-panel').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().y));assert.equal(layout[1],layout[2],'Preferences and security sit side by side at 390px');}
  for(const theme of ['light','dark']){await page.evaluate(theme=>{localStorage.setItem('appThemePreference',theme);window.dispatchEvent(new Event('katakecil:theme-change'));},theme);await page.waitForFunction(theme=>document.documentElement.dataset.appTheme===theme,theme);for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:740});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${route}/${theme}/${width} overflow`);}}

 }
 await page.evaluate(()=>{localStorage.setItem('appThemePreference','light');window.dispatchEvent(new Event('katakecil:theme-change'));});
 for(const width of [390,1440]){await page.setViewportSize({width,height:900});await page.screenshot({path:`qa/crystal/studio-light-${width}.png`,fullPage:true});}
 // Single book, episode, book-page trash and restore all use the internal dialog.
 const browserTrashDialogs=[];const recordDialog=dialog=>{browserTrashDialogs.push(dialog.type());void dialog.dismiss();};page.on('dialog',recordDialog);
 const go=async path=>{await page.evaluate(async path=>(await import('/src/utils/nav.ts')).navigate(path),path);await page.waitForURL(base+path);};
 await go('/studio/editor/synthetic-0-ep-1');await page.getByLabel('Isi bab dalam Markdown').waitFor();await page.getByText('Pengelolaan bab',{exact:true}).click();await page.getByRole('button',{name:'Pindahkan ke Sampah',exact:true}).click();let confirmation=page.getByRole('dialog');await confirmation.waitFor();assert(await confirmation.getByRole('button',{name:'Pindahkan ke Sampah',exact:true}).isDisabled());await confirmation.getByRole('button',{name:'Batal',exact:true}).click();assert.equal(managementCalls.length,0);
 await go('/studio/cerita/synthetic-0');await page.getByRole('tab',{name:'Halaman buku',exact:true}).click();await page.getByRole('button',{name:'Hapus Dedikasi Uji',exact:true}).click();await confirmation.waitFor();await page.keyboard.press('Escape');await confirmation.waitFor({state:'detached'});assert.equal(managementCalls.length,0);
 await page.getByRole('button',{name:'Hapus Dedikasi Uji',exact:true}).click();await confirmation.getByLabel('Ketik HAPUS untuk mengonfirmasi').fill('SALAH');assert(await confirmation.getByRole('button',{name:'Pindahkan ke Sampah',exact:true}).isDisabled());await confirmation.getByLabel('Ketik HAPUS untuk mengonfirmasi').fill('HAPUS');await confirmation.getByRole('button',{name:'Pindahkan ke Sampah',exact:true}).click();await confirmation.getByRole('alert').filter({hasText:'Synthetic lost trash'}).waitFor();await confirmation.getByRole('button',{name:'Coba lagi',exact:true}).click();await confirmation.waitFor({state:'detached'});assert.equal(managementCalls[0].p_request_id,managementCalls[1].p_request_id);assert.equal(await page.getByRole('button',{name:'Hapus Dedikasi Uji',exact:true}).count(),0);
 await go('/studio/editor/synthetic-0-ep-1');await page.getByLabel('Isi bab dalam Markdown').waitFor();await page.getByText('Pengelolaan bab',{exact:true}).click();await page.getByRole('button',{name:'Pindahkan ke Sampah',exact:true}).click();await confirmation.getByLabel('Ketik HAPUS untuk mengonfirmasi').fill('HAPUS');await confirmation.getByRole('button',{name:'Pindahkan ke Sampah',exact:true}).click();await page.waitForURL(base+'/studio/sampah');await page.getByRole('heading',{name:'Ruang Sampah.'}).waitFor();await page.locator('.v5-trash-row').filter({hasText:'Bab 1 — Uji'}).getByRole('button',{name:'Pulihkan',exact:true}).click();await confirmation.getByLabel('Ketik PULIHKAN untuk mengonfirmasi').fill('PULIHKAN');await confirmation.getByRole('button',{name:'Pulihkan',exact:true}).click();await confirmation.waitFor({state:'detached'});
 await go('/studio/cerita/synthetic-0');await page.getByRole('tab',{name:'Pengaturan',exact:true}).click();await page.getByRole('button',{name:'Pindahkan novel ke Sampah',exact:true}).click();await confirmation.getByLabel('Ketik HAPUS untuk mengonfirmasi').fill('HAPUS');for(const width of [320,390,1440]){await page.setViewportSize({width,height:844});assert(await confirmation.evaluate(el=>{const rect=el.getBoundingClientRect();return Math.abs(rect.left+rect.width/2-innerWidth/2)<2&&rect.height<=innerHeight&&rect.top>=0;}),'Internal dialog must stay centered and within viewport');}await page.setViewportSize({width:390,height:844});await page.screenshot({path:'qa/crystal/trash-internal-popup.png'});await confirmation.getByRole('button',{name:'Pindahkan ke Sampah',exact:true}).click();await page.waitForURL(base+'/studio/cerita');assert(books[0].deleted_at);assert.deepEqual(browserTrashDialogs,[]);page.off('dialog',recordDialog);
 await page.getByRole('button',{name:'Buka menu Studio',exact:true}).click();await page.getByRole('menuitem',{name:'Keluar akun',exact:true}).click();await page.getByRole('button',{name:/Masuk ke Studio/}).waitFor();
 await page.evaluate(async()=>{(await import('/src/utils/nav.ts')).navigate('/');});await page.locator('.crystal-story').first().waitFor();
 failCatalog=true;await page.reload();await page.getByRole('alert').filter({hasText:'Library belum dapat dibuka'}).waitFor();failCatalog=false;await page.getByRole('button',{name:'Coba lagi',exact:true}).click();await page.locator('.crystal-story').first().waitFor();
 assert.deepEqual(errors,[]);
 console.log('PASS Crystal: Library only/no read CTA; 320–1440/light/dark layouts; reader/chapter/progress; author login/session reload/logout; editor saves; unsaved book/section/new-work guards; file parsing; schedule and all Studio routes; catalog retry; single book/episode/page trash and restore in internal popups, cancel/Escape/wrong input, idempotent retry without browser dialogs; no JS errors. Synthetic backend only.');
}catch(error){console.error('UI failure:',page?.url(),await page?.locator('body').innerText());throw error;}finally{await browser?.close();server.kill();}
