/** Production-bundle smoke; intercepts the public API, never writes to production. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
import {createHash} from 'node:crypto';
const base='http://127.0.0.1:4211';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port','4211','--strictPort'],{stdio:'ignore'});
let browser;
try{
 let ready=false;for(let n=0;n<100;n++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}assert(ready,'Preview server must start');
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],api=[];
 page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>localStorage.setItem('kk-apk-prompt-dismissed',String(Date.now())));
 await page.route('https://fonts.**/**',r=>r.abort());
 await page.route('https://*.supabase.co/**',async route=>{
  assert.equal(route.request().method(),'GET','Smoke must never write');api.push(route.request().url());
  return route.fulfill({json:[]});
 });
 await page.goto(base);await page.getByRole('heading',{name:'Library.',exact:true}).waitFor();
 await page.getByRole('heading',{name:'Belum ada cerita terbit',exact:true}).waitFor();
 assert(api.some(url=>url.includes('/rest/v1/qr_books')),'Compiled bundle must initialize public Supabase');
 await page.getByRole('button',{name:'Buka menu',exact:true}).click();await page.getByRole('menuitem',{name:'Studio penulis',exact:true}).click();
 await page.getByRole('button',{name:'Masuk ke Studio',exact:false}).waitFor();
 assert(await page.getByLabel('Email',{exact:true}).isVisible());
 const manifestResponse=await page.request.get(base+'/downloads/latest.json');assert(manifestResponse.ok());const metadata=await manifestResponse.json();assert.equal(metadata.packageId,'app.katakecil.mobile');assert.equal(metadata.versionCode,3);
 const apkResponse=await page.request.get(base+'/downloads/KataKecil.apk');assert(apkResponse.ok());const apk=await apkResponse.body();assert.equal(apk.length,metadata.size);assert.equal(createHash('sha256').update(apk).digest('hex'),metadata.sha256);
 assert.deepEqual(errors,[]);
 console.log('PASS bundled startup: compiled Library, public Supabase initialization, lazy Studio/login, 390px viewport, no JavaScript errors; hosted APK download matches version metadata, byte count and SHA-256. Public requests intercepted; no production writes.');
}finally{await browser?.close();server.kill();}
