import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {chromium} from 'playwright';
import {epubFixture} from './test-utils/epub-fixture.mjs';
import {loadTs} from './test-utils/load-ts.mjs';
const {epubEpisodeRequest}=loadTs('server/epub/service.ts');
const base='http://127.0.0.1:4218',host='https://epub-qa.supabase.co',date='2026-01-01T00:00:00Z',uid='00000000-0000-4000-8000-000000000001';
const bytes=await epubFixture(),sha=createHash('sha256').update(bytes).digest('hex'),uploads=new Map(),books=[],sources=new Map(),releases=[];let loggedIn=false,publicOriginalRequests=0,missing=false,loseReply=true;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4218','--strictPort'],{stdio:'ignore',env:{...process.env,DISABLE_HMR:'true',VITE_SUPABASE_URL:host,VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'}});
const config={url:host,publicKey:'sb_publishable_synthetic',secretKey:'server-test-only',origin:base};
const repo={release:async id=>{const row=releases.find(row=>row.id===id),book=books.find(book=>book.id===row?.book_id);return row?{...row,book}:null;},source:async bookId=>sources.get(bookId),file:async path=>new Blob([uploads.get(path)],{type:'application/epub+zip'})};
const user={id:uid,aud:'authenticated',role:'authenticated',email:'author@example.test',created_at:date,app_metadata:{provider:'email'},user_metadata:{},identities:[]};
let browser,page;
try{
 for(let n=0;n<100;n++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});const context=await browser.newContext({viewport:{width:390,height:844}});page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('kk-apk-prompt-dismissed',String(Date.now())));
 await page.route('https://fonts.**/**',r=>r.abort());
 await page.route('**/api/epub-episode?*',async route=>{const response=await epubEpisodeRequest(new Request(route.request().url(),{headers:{origin:base}}),config,repo);await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});});
 await page.route(host+'/**',async route=>{
  const request=route.request(),url=new URL(request.url()),name=url.pathname.split('/').at(-1),method=request.method();
  const body=()=>request.postDataJSON(),eq=field=>{const value=url.searchParams.get(field);return value?.startsWith('eq.')?value.slice(3):undefined;};let data=[];
  if(method==='OPTIONS')return route.fulfill({status:204});
  if(url.pathname.includes('/auth/v1/token')){loggedIn=true;return route.fulfill({json:{access_token:`${Buffer.from('{"alg":"HS256"}').toString('base64url')}.${Buffer.from(JSON.stringify({sub:uid,role:'authenticated',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')}.test`,token_type:'bearer',expires_in:3600,refresh_token:'synthetic-refresh',user}});}
  if(name==='user')return route.fulfill({json:user});
  if(name==='logout'){loggedIn=false;return route.fulfill({status:204});}
  if(url.pathname.includes('/storage/v1/object/')){
   const path=decodeURIComponent(url.pathname.split('/book-epubs/')[1]);
   if(!loggedIn){publicOriginalRequests++;return route.fulfill({status:403,json:{message:'Private original'}});}
   if(method==='POST'){const form=await new Request(url,{method:'POST',headers:{'content-type':request.headers()['content-type']},body:request.postDataBuffer()}).formData();const file=[...form.values()].find(value=>value instanceof Blob);uploads.set(path,Buffer.from(await file.arrayBuffer()));return route.fulfill({json:{Key:'book-epubs/'+path}});}
   if(uploads.has(path))return route.fulfill({body:uploads.get(path),contentType:'application/epub+zip'});
   return route.fulfill({status:404,json:{message:'Missing'}});
  }
  if(name==='qr_author_members')data=[{user_id:uid}];
  else if(name==='qr_books'){
   if(method==='POST'){const row=body();books.push({...row,cover_url:null,created_at:date,updated_at:date});data=[];}
   else if(method==='PATCH'){const book=books.find(book=>book.id===eq('id'));Object.assign(book,body());data=book;}
   else{data=books.filter(book=>(!eq('id')||book.id===eq('id'))&&(!eq('slug')||book.slug===eq('slug'))&&(loggedIn||book.is_published));if(request.headers().accept?.includes('vnd.pgrst.object'))data=data[0]||null;}
  }else if(name==='qr_book_epubs'){
   if(missing)return route.fulfill({status:404,json:{code:'PGRST205',message:'Migration pending'}});
   data=loggedIn?[...sources.values()].filter(row=>!eq('book_id')||row.book_id===eq('book_id')):[];
  }else if(name==='qr_epub_catalog')data=[...sources.values()].filter(row=>!eq('book_id')||row.book_id===eq('book_id')).filter(row=>loggedIn||books.find(book=>book.id===row.book_id)?.is_published).map(row=>({book_id:row.book_id}));
  else if(name==='qr_save_epub'){
   const {p_file:metadata,p_expected_path:expected}=body(),previous=sources.get(metadata.book_id);
   if(previous?.object_path!==metadata.object_path){assert.equal(previous?.object_path||null,expected);sources.set(metadata.book_id,metadata);for(let n=releases.length-1;n>=0;n--)if(releases[n].book_id===metadata.book_id)releases.splice(n,1);for(const [index,item] of metadata.toc.entries())releases.push({id:crypto.randomUUID(),book_id:metadata.book_id,section_index:index,episode_number:index+1,title:item.title,is_enabled:false,release_at:null});}
   if(loseReply){loseReply=false;return route.fulfill({status:503,json:{message:'Synthetic lost successful response'}});}data=metadata.book_id;
  }else if(name==='qr_epub_releases'){
   if(method==='PATCH'){const row=releases.find(row=>row.id===eq('id'));Object.assign(row,body());data=[{id:row.id}];}
   else data=releases.filter(row=>(!eq('book_id')||row.book_id===eq('book_id'))&&(!url.searchParams.has('is_enabled')||row.is_enabled&&row.release_at&&Date.parse(row.release_at)<=Date.now())&&(loggedIn||books.find(book=>book.id===row.book_id)?.is_published&&row.is_enabled&&row.release_at&&Date.parse(row.release_at)<=Date.now()));
  }else if(name==='qr_epub_schedule')data=releases.filter(row=>row.is_enabled&&row.release_at&&Date.parse(row.release_at)>Date.now()).map(({book_id,episode_number,release_at})=>({book_id,episode_number,release_at}));
  return route.fulfill({json:data});
 });
 mkdirSync('qa/epub',{recursive:true});await page.goto(base+'/studio/impor');await page.getByLabel('Email',{exact:true}).fill('author@example.test');await page.getByLabel('Kata sandi',{exact:true}).fill('synthetic');await page.getByRole('button',{name:/Masuk ke Studio/}).click();await page.locator('input[name=manuscript]').waitFor();
 const parsed=await page.evaluate(async()=>{
  const {epubReaderContent}=await import('/src/features/epub/readerContent.ts');
  const {chapterFromEpisode}=await import('/src/utils/episodeChapter.ts');
  const html='<h1 id="start">Judul</h1><p>Teks <strong>tebal</strong> <em>miring</em> <a href="https://example.org">luar</a><a href="javascript:alert(1)">aman</a></p><img src="https://evil.test/image.png"/><script>window.PARSER_ATTACK=true</script><iframe src="https://evil.test"></iframe><p id="end">Akhir</p>';
  const value=epubReaderContent(html),chapter=chapterFromEpisode(1,'Uji','',value.content,value.blocks);
  return {value,chapter,attack:window.PARSER_ATTACK};
 });
 assert.equal(parsed.attack,undefined);assert(!JSON.stringify(parsed.value).includes('javascript:'));assert(!JSON.stringify(parsed.value).includes('evil.test'));assert(!parsed.value.blocks.some(block=>block.kind==='image'));assert(parsed.value.blocks.some(block=>block.nodes.some(node=>node.bold&&node.text==='tebal')));assert(parsed.value.blocks.some(block=>block.nodes.some(node=>node.italic)));assert(parsed.value.anchors.end>parsed.value.anchors.start);assert.equal(parsed.chapter.plainText,parsed.value.content);

 await page.locator('input[name=manuscript]').setInputFiles({name:'source.epub',mimeType:'application/epub+zip',buffer:bytes});await page.getByRole('heading',{name:'EPUB utuh.',exact:true}).waitFor();await page.getByRole('button',{name:'Simpan EPUB utuh privat',exact:true}).waitFor();assert.equal(await page.getByLabel('Setelah impor').count(),0);await page.getByText('Daftar isi · 4',{exact:true}).waitFor();
 // Missing migration cannot create records or upload bytes.
 missing=true;await page.getByRole('button',{name:'Simpan EPUB utuh privat',exact:true}).click();await page.getByRole('alert').filter({hasText:'belum diaktifkan di backend'}).waitFor();assert.equal(uploads.size,0);assert.equal(books.length,0);missing=false;
 // Lost successful RPC response retries the same immutable source, no duplicate books.
 await page.getByRole('button',{name:'Simpan EPUB utuh privat',exact:true}).click();await page.getByRole('alert').filter({hasText:'lost successful'}).waitFor();await page.getByRole('button',{name:'Simpan EPUB utuh privat',exact:true}).click();await page.getByRole('heading',{name:'EPUB utuh · terbit per episode',exact:true}).waitFor();assert.equal(books.length,1);assert.equal(uploads.size,1);assert.equal(releases.length,4);assert(Buffer.from([...uploads.values()][0]).equals(bytes));assert.equal([...sources.values()][0].sha256,sha);
 await page.getByRole('button',{name:'Pratinjau EPUB privat',exact:true}).click();await page.locator('.epub-preview .reader-book').getByText('PUBLIC_FIRST_BODY',{exact:true}).waitFor();assert.equal(await page.locator('iframe').count(),0);assert.equal(await page.evaluate(id=>localStorage.getItem('kk-secure-progress-'+id),books[0].id),null);await page.getByRole('button',{name:'Tutup pratinjau',exact:true}).click();
 await page.getByLabel('Status episode 1',{exact:true}).selectOption('now');await page.locator('.epub-release-row').nth(0).getByRole('button',{name:'Simpan',exact:true}).click();await page.waitForFunction(()=>document.querySelector('[aria-label="Status episode 1"]')?.value==='now');
 await page.getByLabel('Status episode 2',{exact:true}).selectOption('schedule');await page.getByLabel('Jadwal episode 2 WIB',{exact:true}).fill('2099-01-01T19:00');await page.locator('.epub-release-row').nth(1).getByRole('button',{name:'Simpan',exact:true}).click();
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Studio EPUB overflow ${width}`);}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'qa/epub/studio.png',fullPage:true});
 await page.getByText('Pengaturan buku & sampul',{exact:true}).click();await page.getByRole('checkbox',{name:/Tampilkan novel di perpustakaan/}).check();await page.getByRole('button',{name:'Simpan perubahan',exact:true}).click();await page.getByRole('heading',{name:'EPUB utuh · terbit per episode',exact:true}).waitFor();
 await page.getByRole('button',{name:'Buka menu Studio',exact:true}).click();await page.getByRole('menuitem',{name:'Keluar akun',exact:true}).click();await page.getByRole('button',{name:/Masuk ke Studio/}).waitFor();await page.goto(base);
 await page.getByRole('button',{name:'Informasi Buku EPUB Uji',exact:true}).click();await page.getByText('1 episode terbit',{exact:false}).waitFor();assert.equal(await page.getByText('Bab Kedua',{exact:true}).count(),0);await page.getByText('Bab 2 ·',{exact:false}).waitFor();await page.screenshot({path:'qa/epub/library-popup.png',fullPage:true});
 await page.getByRole('button',{name:'Buka episode 1: Kata Pengantar',exact:true}).click();const content=page.locator('.reader-book');await content.getByText('PUBLIC_FIRST_BODY',{exact:true}).waitFor();assert.equal(await page.locator('iframe').count(),0,'EPUB must use the existing DOM reader');assert.equal(await content.getByText('FUTURE_SECOND_SECRET',{exact:true}).count(),0);assert.equal(publicOriginalRequests,0);
 assert(await content.locator('[data-paragraph-index]').count()>90,'Long section keeps every paragraph');
 const illustration=content.getByRole('img',{name:'Ilustrasi',exact:true});await illustration.evaluate(image=>image.decode());assert(await illustration.evaluate(image=>image.naturalWidth>0&&image.getBoundingClientRect().width<=innerWidth&&image.getBoundingClientRect().height<innerHeight),'Raster illustration fits shared page');
 const options=async()=>{if(await page.locator('.quiet-app').getAttribute('data-reader-view')==='reading')await page.locator('.reader-stage').click({position:{x:195,y:400}});await page.getByRole('button',{name:'Opsi pembaca lainnya',exact:true}).click();};
 await options();assert(await page.getByRole('menuitem',{name:'Bab berikutnya',exact:true}).isDisabled());await page.getByRole('menuitem',{name:'Pengaturan membaca',exact:true}).click();await page.getByRole('button',{name:'Gelap',exact:true}).click();await page.getByRole('button',{name:'Perbesar teks',exact:true}).click();await page.getByRole('button',{name:'Tutup pengaturan',exact:true}).click();
 assert.equal(await page.locator('.quiet-app').getAttribute('data-reader-theme'),'night');assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('quiet_reader_settings')).fontSize),110);
 await page.getByRole('button',{name:'Halaman berikutnya',exact:true}).click();await page.waitForFunction(id=>JSON.parse(localStorage.getItem('kk-secure-progress-'+id))?.offset>0,books[0].id);const saved=await page.evaluate(id=>JSON.parse(localStorage.getItem('kk-secure-progress-'+id)),books[0].id);
 await page.getByRole('button',{name:'Simpan penanda',exact:true}).click();await page.reload();await content.waitFor();assert.equal(await content.getAttribute('data-epub-reader'),null);await options();assert(Number((await page.getByRole('slider',{name:/Posisi halaman/}).getAttribute('aria-label')).match(/(\d+) dari/)[1])>1,'EPUB resumes in shared pagination');assert.equal(await page.evaluate(()=>window.EPUB_ATTACK),undefined);
 assert.equal(await page.evaluate(id=>JSON.parse(localStorage.getItem('kk-secure-progress-'+id)).offset,books[0].id),saved.offset);await page.getByRole('menuitem',{name:'Daftar isi dan penanda',exact:true}).click();assert.equal(await page.locator('.v610-chapter-row').count(),1,'Only released metadata in shared contents');await page.getByRole('tab',{name:/Penanda/}).click();await page.getByRole('button',{name:/Kata Pengantar/}).first().waitFor();await page.keyboard.press('Escape');
 for(const width of [320,390,1440]){await page.setViewportSize({width,height:844});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'qa/epub/reader.png',fullPage:true});
 // Upgrade v1.3 scroll metadata into the same reader progress key, without text.
 await page.evaluate(({book,release,sha})=>{localStorage.removeItem('kk-secure-progress-'+book);localStorage.setItem('kk:epub-last:'+book,'1');localStorage.setItem('kk:epub-scroll:'+book+':'+release+':'+sha,'0.5');},{book:books[0].id,release:releases[0].id,sha});
 await page.reload();await content.waitFor();await options();assert(Number((await page.getByRole('slider',{name:/Posisi halaman/}).getAttribute('aria-label')).match(/(\d+) dari/)[1])>1);const migrated=await page.evaluate(id=>localStorage.getItem('kk-secure-progress-'+id),books[0].id);assert(!migrated.includes('PUBLIC_FIRST_BODY'));assert.equal(JSON.parse(migrated).sourceVersion,sha);
 await page.getByRole('menuitem',{name:'Sembunyikan kontrol',exact:true}).click();
 // Simulate scheduled release: the same shared next/previous controls fetch one section.
 releases[1].release_at=date;await page.reload();await content.waitFor();await options();await page.getByRole('menuitem',{name:'Bab berikutnya',exact:true}).click();await content.getByText('FUTURE_SECOND_SECRET',{exact:true}).waitFor();assert.equal(await content.getByText('THIRD_SECRET_BODY',{exact:true}).count(),0);assert.equal(await content.getByText('PUBLIC_FIRST_BODY',{exact:true}).count(),0);await options();await page.getByRole('menuitem',{name:'Bab sebelumnya',exact:true}).click();await content.waitFor();
 // A new source version invalidates the old text offset.
 await page.route('**/api/epub-episode?*',route=>route.fulfill({json:{html:'<p>REPLACED_SOURCE_BODY</p>',sourceVersion:'f'.repeat(64)}}));await page.reload();await content.getByText('REPLACED_SOURCE_BODY',{exact:true}).waitFor();assert.equal(await page.evaluate(id=>JSON.parse(localStorage.getItem('kk-secure-progress-'+id)).offset,books[0].id),0);
 // Missing endpoint and unavailable book give a retry state rather than a blank view.
 await page.route('**/api/epub-episode?*',route=>route.fulfill({status:503,json:{error:'unconfigured'}}));await page.reload();await page.getByRole('alert').filter({hasText:'Layanan EPUB belum diaktifkan'}).waitFor();assert.equal(publicOriginalRequests,0);assert.deepEqual(errors,[]);
 console.log('PASS EPUB browser: Android-compatible input path; intact bytes/hash; missing migration before writes; lost-response retry without duplicate source; private preview; per-episode publication/WIB scheduling; cover Library -> book popup -> frontmatter reader; future titles and bodies hidden; 320–1440 layouts; shared reader without iframe, typography/theme/metadata-only progress reload and v1.3 migration/source-version reset, bookmarks/contents, next/previous, and endpoint retry state. Synthetic auth/Storage, actual renderer and HTTP handler; no production writes.');
}catch(error){console.error('UI failure:',page?.url(),await page?.locator('body').innerText());throw error;}finally{await browser?.close();server.kill();}
