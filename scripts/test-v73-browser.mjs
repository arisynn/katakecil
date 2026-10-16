import {CoverRaster} from './test-utils/cover-codec.mjs';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {chromium} from 'playwright';
import {Image} from './test-utils/image-fixture.mjs';
import JSZip from 'jszip';
import {loadTs} from './test-utils/load-ts.mjs';
const {renderCover}=loadTs('supabase/functions/_shared/cover-render.ts');
const {DEFAULT_COVER}=loadTs('src/features/covers/model.ts');
const fixtures=new Map();
for(const [name,w,h] of [['9x16',360,640],['3x4',360,480],['1x1',400,400],['5x1',1000,200]]){const image=new Image(w,h);image.fill((x,y)=>x<w/3?0x246ccaff:x>w*2/3?0xc25462ff:0x44bbaaFF);fixtures.set(name,Buffer.from(await image.encode()));}
const port=4183,base=`http://127.0.0.1:${port}`,fixture='/scripts/fixtures/v73/index.html';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{env:{...process.env,VITE_SUPABASE_URL:'https://synthetic-qa.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'synthetic-public-key'},stdio:['ignore','pipe','pipe']});let logs='';server.stdout.on('data',d=>logs+=d);server.stderr.on('data',d=>logs+=d);
for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
const browser=await chromium.launch({headless:true,args:['--no-sandbox']}).catch(e=>{server.kill();throw e;});
const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});const page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
await page.route('**/fixture-cover/*.png',route=>route.fulfill({contentType:'image/png',body:fixtures.get(route.request().url().match(/([^/]+)\.png/)[1])}));
const privateBucket='story-covers-v73-private',publicBucket='story-covers-v73',actor='00000000-0000-4000-8000-000000000001';
let assets=[],active=null,version=0,prepareFailures=0,publishLostResponse=true,importCalls=0,importPayload=null,publishRequests=[],uploads=[],responses=new Map(),objects=new Map();
await page.route('https://synthetic-qa.supabase.co/**',async route=>{
 const req=route.request(),url=new URL(req.url()),path=url.pathname;let result=[];
 if(path==='/auth/v1/user')result={id:actor,aud:'authenticated',role:'authenticated',email:'synthetic@example.test',app_metadata:{},user_metadata:{},created_at:'2026-01-01'};
 else if(path.includes('/storage/v1/object/')&&req.method()==='POST'){
  const key=decodeURIComponent(path.split('/object/')[1]);uploads.push(key);if(objects.has(key))return route.fulfill({status:409,json:{statusCode:409,message:'already exists'}});
  let bytes=req.postDataBuffer();const contentType=req.headers()['content-type'];if(contentType?.includes('multipart/form-data')){const form=await new Response(bytes,{headers:{'content-type':contentType}}).formData();const blob=Array.from(form.values()).find(v=>typeof v!=='string');bytes=Buffer.from(await blob.arrayBuffer());}
  objects.set(key,bytes);result={Key:key,Id:'synthetic'};
 }else if(path.includes('/storage/v1/object/')&&req.method()==='GET'){
  const key=decodeURIComponent(path.replace('/storage/v1/object/','').replace(/^(authenticated|public)\//,''));const body=objects.get(key);return route.fulfill(body?{contentType:key.endsWith('.png')?'image/png':'image/webp',body}:{status:404,json:{message:'not found'}});
 }else if(path.endsWith('/rpc/qr_cover_begin_v73')){
  const {p_id,p_payload}=req.postDataJSON();let asset=assets.find(a=>a.id===p_id);if(!asset){const ext=p_payload.source_mime==='image/png'?'png':'jpg';asset={...p_payload,id:p_id,created_by:actor,created_at:new Date().toISOString(),status:'pending',source_path:`${p_payload.book_id}/${p_id}/original.${ext}`,normalized_path:`${p_payload.book_id}/${p_id}/normalized.png`,manifest:null};assets.unshift(asset);}result=asset;
 }else if(path.endsWith('/functions/v1/cover-assets')){
  const input=req.postDataJSON(),asset=assets.find(a=>a.id===input.asset_id);
  if(input.action==='prepare'){
   if(prepareFailures>0){prepareFailures--;return route.fulfill({status:503,json:{error:'Synthetic prepare failure'}});}
   const normalized=objects.get(`${privateBucket}/${asset.normalized_path}`);const outputs=await renderCover(normalized,asset.settings,CoverRaster);asset.manifest={version:asset.id,mode:asset.settings.mode,card:[],detail:null};
   for(const output of outputs){const key=`${asset.book_id}/${asset.id}/${output.name}`;objects.set(`${privateBucket}/${key}`,Buffer.from(output.bytes));const variant={path:key,width:output.width,height:output.height,bytes:output.bytes.length,mime:output.mime};if(output.kind==='card')asset.manifest.card.push(variant);else asset.manifest.detail=variant;}asset.status='ready';result={asset};
  }else{
   publishRequests.push(input);if(responses.has(input.request_id))result=responses.get(input.request_id);
   else if(input.expected_version!==version)return route.fulfill({status:409,json:{error:'Sampul telah berubah di tab lain. Muat ulang sebelum menerbitkan.'}});
   else{const convert=v=>{const key=`${asset.book_id}/${input.request_id}/${v.path.split('/').pop()}`;objects.set(`${publicBucket}/${key}`,objects.get(`${privateBucket}/${v.path}`));const {path,...metadata}=v;return{...metadata,url:`https://synthetic-qa.supabase.co/storage/v1/object/public/${publicBucket}/${key}`};};
    version++;active={book_id:asset.book_id,asset_id:asset.id,version,manifest:{version:input.request_id,mode:asset.settings.mode,card:asset.manifest.card.map(convert),detail:convert(asset.manifest.detail)}};asset.status='published';result={...active,request_id:input.request_id};responses.set(input.request_id,result);
    if(publishLostResponse){publishLostResponse=false;return route.abort('failed');}
   }
  }
 }else if(path.endsWith('/qr_cover_assets'))result=assets.filter(a=>['ready','published'].includes(a.status));
 else if(path.endsWith('/qr_book_covers'))result=active?[active]:[];
 else if(path.endsWith('/rpc/qr_import_manuscript_v72')){importCalls++;const body=req.postDataJSON();importPayload=body;result={request_id:body.p_request_id,book_id:body.p_payload.book_id,batch_id:crypto.randomUUID(),imported_count:body.p_payload.episodes.length,sections_count:body.p_payload.sections.length};}
 else if(path.endsWith('/qr_books'))result=[{id:'qa',slug:'qa',title:'Synthetic',cover_url:null}];
 return route.fulfill({json:result,headers:{'cache-control':'no-store'}});
});
mkdirSync('qa/v73',{recursive:true});
const upload=async(name='9x16')=>{await page.locator('input[type=file]').setInputFiles({name:`${name}.png`,mimeType:'image/png',buffer:fixtures.get(name)});await page.getByRole('button',{name:'Tampilkan utuh',exact:true}).waitFor();};
try{
 for(const theme of ['light','dark']) for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:1000});await page.goto(base+fixture+`?mode=gallery&theme=${theme}`);await page.locator('.kk-v7-story-card img').first().waitFor();await page.waitForFunction(()=>Array.from(document.querySelectorAll('.kk-v7-story-card img')).every(i=>i.complete&&i.naturalWidth));
  const layout=await page.locator('.kk-v7-story-card').evaluateAll(nodes=>nodes.map(node=>{const cover=node.querySelector('.kk-v7-cover').getBoundingClientRect(),title=node.querySelector('.kk-v7-story-title').getBoundingClientRect(),img=node.querySelector('img');return{width:cover.width,height:cover.height,bottom:cover.bottom,titleTop:title.top,fit:getComputedStyle(img).objectFit};}));
  assert(layout.every(x=>Math.abs(x.width/x.height-2/3)<.02&&x.titleTop>=x.bottom-1&&x.fit==='contain'));assert(Math.abs(layout[0].titleTop-layout[1].titleTop)<2);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  const color=await page.locator('.kk-cover-enlarge').evaluate(n=>getComputedStyle(n).color);assert.equal(color,theme==='light'?'rgb(35, 93, 180)':'rgb(155, 201, 255)');
  if(width===390)await page.screenshot({path:`qa/v73/gallery-${theme}.png`,fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Lihat sampul lebih besar'}).click();assert(await page.getByRole('dialog').isVisible());await page.keyboard.press('Escape');assert(!(await page.getByRole('dialog').isVisible()));
 await page.goto(base+fixture+'?mode=recovery');await page.getByRole('img',{name:/Sampul belum dapat dimuat/}).waitFor();await page.getByRole('button',{name:'Ganti URL gagal'}).click();await page.waitForFunction(()=>document.querySelector('.kk-cover img')?.naturalWidth===360);
 await page.goto(base+fixture+'?mode=editor');await upload();const editorRatios=await page.locator('.kk-cover--card').evaluateAll(nodes=>nodes.map(n=>{const b=n.getBoundingClientRect();return b.width/b.height;}));assert(editorRatios.every(r=>Math.abs(r-2/3)<.015));assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));let prepared=JSON.parse(await page.getByTestId('prepared').textContent());assert.deepEqual([prepared.width,prepared.height],[360,640]);
 await page.getByRole('button',{name:'Penuhi bingkai',exact:true}).click();await page.getByLabel('Posisi vertikal sampul',{exact:true}).fill('1');prepared=JSON.parse(await page.getByTestId('prepared').textContent());assert.equal(prepared.settings.y,1);
 const crop=page.getByRole('group',{name:/Geser area sampul/});await crop.focus();await page.keyboard.press('ArrowUp');prepared=JSON.parse(await page.getByTestId('prepared').textContent());assert(prepared.settings.y<1);
 await page.getByRole('button',{name:'Putar 90°',exact:true}).click();await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-testid=prepared]').textContent||'{}').width===640);await page.getByRole('button',{name:'Reset',exact:true}).click();await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-testid=prepared]').textContent||'{}').width===360);
 await page.waitForFunction(()=>{const images=[...document.querySelectorAll('.kk-cover-previews img')];return images.length===3&&images.every(i=>i.complete&&i.naturalWidth>0);});
 await page.screenshot({path:'qa/v73/editor-390.png',fullPage:true});
 await page.locator('input[type=file]').setInputFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('not a picture')});await page.getByRole('alert').filter({hasText:/bukan JPG/}).waitFor();
 // Selection A then B: only B may win even if A was still decoding in its worker.
 await page.locator('input[type=file]').setInputFiles({name:'A.png',mimeType:'image/png',buffer:fixtures.get('9x16')});await page.locator('input[type=file]').setInputFiles({name:'B.png',mimeType:'image/png',buffer:fixtures.get('3x4')});await page.waitForFunction(()=>JSON.parse(document.querySelector('[data-testid=prepared]').textContent||'{}').height===480);
 // Verify the browser normalizes all EXIF rotations/mirroring before any user crop.
 const jpegBase64=await page.evaluate(async()=>{const canvas=document.createElement('canvas');canvas.width=300;canvas.height=400;const ctx=canvas.getContext('2d');ctx.fillStyle='#246cca';ctx.fillRect(0,0,150,400);ctx.fillStyle='#c25462';ctx.fillRect(150,0,150,400);return canvas.toDataURL('image/jpeg',.92).split(',')[1];});const jpeg=Buffer.from(jpegBase64,'base64');
 for(let orientation=1;orientation<=8;orientation++){
  const exif=Buffer.alloc(36);exif[0]=255;exif[1]=225;exif.writeUInt16BE(34,2);exif.write('Exif\0\0',4,'binary');exif.write('II',10);exif.writeUInt16LE(42,12);exif.writeUInt32LE(8,14);exif.writeUInt16LE(1,18);exif.writeUInt16LE(0x112,20);exif.writeUInt16LE(3,22);exif.writeUInt32LE(1,24);exif.writeUInt16LE(orientation,28);
  await page.locator('input[type=file]').setInputFiles({name:`orientation-${orientation}.jpg`,mimeType:'image/jpeg',buffer:Buffer.concat([jpeg.subarray(0,2),exif,jpeg.subarray(2)])});
  await page.waitForFunction(()=>Boolean(document.querySelector('[data-testid=prepared]')?.textContent));const value=JSON.parse(await page.getByTestId('prepared').textContent());assert.deepEqual([value.width,value.height],orientation>=5?[400,300]:[300,400]);
 }
 await page.goto(base+fixture+'?mode=manager');await upload();await page.getByRole('button',{name:'Simpan sampul privat',exact:true}).click();await page.getByText('Sampul privat tersimpan.',{exact:false}).waitFor();assert.equal(version,0);assert(!uploads.some(p=>p.startsWith(publicBucket+'/')));
 await page.getByRole('button',{name:'Terbitkan sampul',exact:true}).click();await page.getByRole('button',{name:'Coba terbitkan lagi',exact:true}).waitFor();await page.getByRole('button',{name:'Coba terbitkan lagi',exact:true}).click();await page.getByText('Sampul berhasil diterbitkan.',{exact:true}).waitFor();assert.equal(version,1);assert.equal(publishRequests[0].request_id,publishRequests[1].request_id);
 await upload('3x4');await page.getByRole('button',{name:'Simpan sampul privat',exact:true}).click();await page.getByText('Sampul privat tersimpan.',{exact:false}).waitFor();assert.equal(version,1);await page.getByRole('button',{name:'Terbitkan sampul',exact:true}).click();await page.getByText('Sampul berhasil diterbitkan.',{exact:true}).waitFor();assert.equal(version,2);
 await page.getByText('Riwayat sampul (2)',{exact:true}).click();await page.getByRole('button',{name:'Gunakan versi ini',exact:true}).click();await page.getByText('Sampul berhasil diterbitkan.',{exact:true}).waitFor();await page.locator('.kk-cover-history li').filter({hasText:'9x16.png'}).getByRole('button',{name:'Sedang digunakan',exact:true}).waitFor();assert.equal(version,3);
 await page.screenshot({path:'qa/v73/manager-390.png',fullPage:true});
 // A failed cover after successful manuscript commit is retried independently.
 await page.goto(base+fixture+'?mode=import');const zip=new JSZip();zip.file('001.md','# Bab 1\nSynthetic chapter content.');zip.file('cover.png',fixtures.get('9x16'));zip.file('sampul-alt.png',fixtures.get('3x4'));
 await page.locator('input[type=file]').first().setInputFiles({name:'synthetic.zip',mimeType:'application/zip',buffer:await zip.generateAsync({type:'nodebuffer'})});await page.getByRole('heading',{name:'Pilih sampul (2)',exact:true}).waitFor();await page.locator('.kk-cover-candidate').filter({hasText:'sampul-alt.png'}).click();await page.getByRole('button',{name:'Tampilkan utuh',exact:true}).waitFor();
 const saveButton=page.getByRole('button',{name:/^Simpan \d+ episode \+ \d+ halaman/}).last();prepareFailures=1;await saveButton.click();await page.getByRole('button',{name:'Coba simpan sampul',exact:true}).waitFor();assert.equal(importCalls,1);await page.getByRole('button',{name:'Coba simpan sampul',exact:true}).click();await page.getByText('Sampul privat berhasil disimpan. Naskah tidak diimpor ulang.',{exact:false}).waitFor();assert.equal(importCalls,1);assert.equal(importPayload.p_payload.episodes.length,1);
 const storage=await page.evaluate(()=>({local:Object.entries(localStorage),session:Object.entries(sessionStorage)}));assert(!JSON.stringify(storage).includes('Synthetic chapter content.'));assert(!JSON.stringify(storage).includes('original.png'));assert.deepEqual(errors,[],`Browser errors: ${errors.join('\n')}`);
 console.log('V7.3 browser: responsive galleries in both themes, detail dialog, image-error recovery, crop/rotate/reset, invalid files, eight EXIF orientations, A/B race, private upload, lost publication response, restore history and cover-only import retry passed.');
}catch(e){await page.screenshot({path:'qa/v73/failure.png',fullPage:true});console.error((await page.locator('body').innerText()).slice(-5000));console.error({uploads,assetCount:assets.length,objectKeys:[...objects.keys()]});throw e;}finally{await browser.close();server.kill('SIGTERM');if(errors.length)console.error(errors);}
