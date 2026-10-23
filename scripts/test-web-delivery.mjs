import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {createECDH,randomBytes} from 'node:crypto';
import {chromium} from 'playwright';
import webPush from 'web-push';
const base='http://127.0.0.1:4216',date='2026-01-01T00:00:00Z';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4216','--strictPort'],{stdio:'ignore',env:{...process.env,DISABLE_HMR:'true',VITE_SUPABASE_URL:'https://shelf-qa.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'}});
const books=Array.from({length:12},(_,n)=>({id:'book-'+n,slug:'book-'+n,title:n===0?'Cerita Uji':'Judul Buku '+n,genre:'Fiksi',synopsis:'Sinopsis sintetis untuk memeriksa popup dan kerapatan rak. '.repeat(6),status:'ongoing',is_published:true,is_featured:false,cover_url:null,created_at:date,updated_at:date}));
const episodes=books.flatMap((book,i)=>Array.from({length:i===0?120:2},(_,n)=>({book_id:book.id,episode_number:n+1,title:'Bab '+(n+1)+' — Uji',arc_title:'',release_at:date,is_finale:false})));
const ec=createECDH('prime256v1');ec.generateKeys();const keys={p256dh:ec.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')};
const vapid=webPush.generateVAPIDKeys();let browser,available=true;const subscriptions=[];
try{
 for(let n=0;n<100;n++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
 browser=await chromium.launch({headless:true,args:['--no-sandbox']});const page=await browser.newPage({viewport:{width:390,height:740}}),errors=[];
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://fonts.**/**',route=>route.abort());
 await page.route('https://shelf-qa.supabase.co/**',route=>{const name=new URL(route.request().url()).pathname.split('/').at(-1);return route.fulfill({json:name==='qr_books'?books:name==='qr_episodes'?episodes:name==='qr_public_next_chapters'?[{book_id:'book-0',episode_number:121,release_at:'2099-01-01T12:00:00Z'}]:[]});});
 await page.route('**/api/web-push',route=>{if(route.request().method()==='GET')return route.fulfill({json:{available,publicKey:vapid.publicKey}});subscriptions.push(route.request().postDataJSON());return route.fulfill({json:{ok:true}});});
 await page.addInitScript(keys=>{
  window.pushPermission='default';window.pushDenied=false;window.pushPrompts=0;window.pushActive=false;
  const stub={endpoint:'https://fcm.googleapis.com/fcm/send/browser-synthetic',toJSON(){return {endpoint:this.endpoint,keys};},async unsubscribe(){window.pushActive=false;return true;}};
  class MockNotification{static get permission(){return window.pushPermission;}static async requestPermission(){window.pushPrompts++;window.pushPermission=window.pushDenied?'denied':'granted';return window.pushPermission;}}
  window.Notification=MockNotification;
  Object.defineProperty(ServiceWorkerRegistration.prototype,'pushManager',{get:()=>({getSubscription:async()=>window.pushActive?stub:null,subscribe:async()=>{window.pushActive=true;return stub;}})});
 },keys);
 mkdirSync('qa/shelf',{recursive:true});await page.goto(base);await page.getByRole('heading',{name:'Library.',exact:true}).waitFor();
 await page.getByRole('dialog',{name:'Cerita lebih dekat.',exact:true}).waitFor();assert.equal(await page.getByRole('link',{name:'Unduh APK Android',exact:true}).getAttribute('href'),'/downloads/KataKecil.apk');assert.equal(await page.locator('link[rel=manifest]').count(),0);
 await page.screenshot({path:'qa/shelf/apk-prompt.png',fullPage:true});await page.getByRole('button',{name:'Tetap membaca di web',exact:true}).click();
 assert.equal(await page.evaluate(()=>window.pushPrompts),0,'No notification permission on entry');
 const positions=await page.locator('.crystal-story').evaluateAll(nodes=>nodes.map(n=>({x:n.getBoundingClientRect().x,y:n.getBoundingClientRect().y})));
 assert.equal(positions[0].y,positions[1].y);assert.equal(positions[1].y,positions[2].y);assert(positions[3].y>positions[0].y);
 assert(await page.locator('.crystal-story-link').evaluateAll(nodes=>nodes.every(n=>n.children.length===1&&n.firstElementChild.classList.contains('crystal-cover'))));
 await page.evaluate(()=>scrollTo(0,160));await page.locator('.crystal-story-link').nth(5).click();const scroll=await page.evaluate(()=>scrollY);await page.getByRole('dialog').waitFor();await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});assert.equal(await page.evaluate(()=>scrollY),scroll);assert.equal(await page.evaluate(()=>document.body.style.overflow),'');
 await page.getByRole('button',{name:'Informasi Cerita Uji',exact:true}).click();await page.getByText('Bab 121 ·',{exact:false}).waitFor();
 assert.equal(await page.locator('.book-dialog-episode').count(),50);await page.getByLabel('Cari episode buku',{exact:true}).fill('120');assert.equal(await page.locator('.book-dialog-episode').count(),1);await page.getByLabel('Cari episode buku',{exact:true}).fill('');
 for(const theme of ['light','dark'])for(const width of [320,390,768,1440]){
  await page.setViewportSize({width,height:740});await page.evaluate(theme=>{localStorage.setItem('appThemePreference',theme);window.dispatchEvent(new Event('katakecil:theme-change'));},theme);
  assert(await page.getByRole('dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1&&n.getBoundingClientRect().height<=innerHeight*.86));if(width===390)await page.screenshot({path:`qa/shelf/book-${theme}.png`,fullPage:true});
 }
 await page.keyboard.press('Escape');await page.setViewportSize({width:390,height:740});
 const openNotifications=async()=>{await page.getByRole('button',{name:'Buka menu',exact:true}).click();await page.getByRole('menuitem',{name:'Notifikasi',exact:true}).click();await page.getByRole('heading',{name:'Notifikasi web',exact:true}).waitFor();};
 await openNotifications();await page.getByRole('checkbox',{name:'Aktifkan notifikasi web',exact:true}).waitFor();
 await page.evaluate(()=>window.pushDenied=true);await page.getByRole('checkbox',{name:'Aktifkan notifikasi web',exact:true}).click();await page.getByRole('alert').filter({hasText:'Izin notifikasi belum diberikan'}).waitFor();assert.equal(subscriptions.length,0);
 await page.keyboard.press('Escape');await page.evaluate(()=>{window.pushDenied=false;window.pushPermission='default';});await openNotifications();await page.getByRole('checkbox',{name:'Aktifkan notifikasi web',exact:true}).click();await page.waitForFunction(()=>window.pushActive);await page.waitForFunction(()=>document.querySelector('[aria-label="Aktifkan notifikasi web"]')?.checked);
 assert.equal(subscriptions[0].action,'subscribe');assert.equal(subscriptions[0].capability.length,43);assert(!JSON.stringify(subscriptions[0]).includes(vapid.privateKey));
 await page.screenshot({path:'qa/shelf/web-notifications.png',fullPage:true});await page.getByRole('checkbox',{name:'Aktifkan notifikasi web',exact:true}).click();await page.waitForFunction(()=>!window.pushActive);assert.equal(subscriptions[1].action,'unsubscribe');assert.equal(subscriptions[0].capability,subscriptions[1].capability);
 await page.keyboard.press('Escape');available=false;await openNotifications();await page.getByText('Notifikasi web belum diaktifkan pengelola.',{exact:true}).waitFor();assert(await page.getByRole('checkbox',{name:'Aktifkan notifikasi web',exact:true}).isDisabled());await page.keyboard.press('Escape');
 await page.reload();await page.getByRole('heading',{name:'Library.',exact:true}).waitFor();await page.waitForTimeout(2100);assert.equal(await page.getByRole('dialog').count(),0,'Dismissed APK promotion must not repeat');
 assert.deepEqual(errors,[]);console.log('PASS web delivery: three cover columns; only covers; popup schedules, 120-episode search/pagination, bounded light/dark layouts, Escape/focus/scroll; automatic APK offer with dismissal, no PWA; web push permission only on consent, denial/grant, persisted unsubscribe ownership and honest unconfigured state. Browser push API mocked; no live sends.');
}finally{await browser?.close();server.kill();}
