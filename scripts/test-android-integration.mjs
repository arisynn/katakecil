/** Desktop contract test for native wiring. Does not substitute for WebView/device QA. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';
const port=4197,base=`http://127.0.0.1:${port}`;
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:'ignore',env:{...process.env,DISABLE_HMR:'true',VITE_SUPABASE_URL:'https://synthetic-android.supabase.co',VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_synthetic'}});
let browser;
try {
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({headless:true,args:['--no-sandbox']});
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://synthetic-android.supabase.co/**',route=>route.fulfill({json:[]}));
  await page.addInitScript(()=>{
    window.androidBridge={};window.nativeCalls=[];window.nativeHandlers={};window.notificationSettings={reminder:false,chapters:false,time:"20:00",lastChecked:0,allowed:false};
    window.Capacitor={PluginHeaders:[
      {name:'App',methods:[{name:'addListener',rtype:'callback'},{name:'removeListener',rtype:'promise'},{name:'minimizeApp',rtype:'promise'}]},
      {name:'Browser',methods:[{name:'open',rtype:'promise'}]},
      {name:'Filesystem',methods:[{name:'writeFile',rtype:'promise'}]},
      {name:'Share',methods:[{name:'share',rtype:'promise'}]},
      {name:'ReaderChrome',methods:[{name:'setBackground',rtype:'promise'}]},
      {name:'ChapterAlerts',methods:[{name:'getSettings',rtype:'promise'},{name:'configure',rtype:'promise'},{name:'saveReminder',rtype:'promise'},{name:'consumeRoute',rtype:'promise'},{name:'addListener',rtype:'callback'}]},
      {name:'LocalNotifications',methods:['checkPermissions','requestPermissions','createChannel','schedule','cancel'].map(name=>({name,rtype:'promise'})).concat([{name:'addListener',rtype:'callback'}])},
      {name:'SystemBars',methods:[{name:'setStyle',rtype:'promise'}]},
    ],nativePromise:async(plugin,method,args)=>{window.nativeCalls.push({plugin,method,args});if(plugin==='Filesystem')return {uri:'file:///cache/exports/synthetic.csv'};
      if(plugin==='ChapterAlerts'){
        if(method==='getSettings')return {...window.notificationSettings};
        if(method==='consumeRoute')return {route:''};
        if(method==='configure')window.notificationSettings.chapters=args.enabled;
        if(method==='saveReminder'){window.notificationSettings.reminder=args.enabled;window.notificationSettings.time=args.time;}
      }
      if(plugin==='LocalNotifications'){
        if(method==='checkPermissions')return {display:window.notificationSettings.allowed?'granted':'prompt'};
        if(method==='requestPermissions'){window.notificationSettings.allowed=!window.denyNotifications;return {display:window.notificationSettings.allowed?'granted':'denied'};}
      }
      },
    nativeCallback:(plugin,method,args,cb)=>{if(method==='addListener')window.nativeHandlers[args.eventName]=cb;return 'synthetic-listener';}};
  });
  await page.goto(base);
  await page.waitForFunction(()=>window.nativeHandlers.appStateChange);
  await page.locator('.crystal-startup').waitFor({state:'detached'});
  assert.equal(await page.evaluate(()=>document.documentElement.dataset.nativeApp),'android');
  assert((await page.locator('meta[name=viewport]').getAttribute('content')).includes('viewport-fit=auto'));
  assert.equal(await page.evaluate(async()=>(await navigator.serviceWorker.getRegistrations()).length),0);
  await page.evaluate(()=>window.dispatchEvent(new Event('kk:install')));
  await page.getByRole('status').filter({hasText:'sudah terpasang'}).waitFor();
  await page.evaluate(async()=>{const nav=await import('/src/utils/nav.ts');nav.navigate('/temukan');});
  await page.waitForURL('**/temukan');
  await page.evaluate(async()=>{window.removeGuard=(await import('/src/utils/nav.ts')).registerLeaveGuard(()=>false);window.nativeHandlers.backButton({});});
  await page.waitForTimeout(400);assert.equal(new URL(page.url()).pathname,'/temukan');
  await page.evaluate(()=>{window.removeGuard();window.nativeHandlers.backButton({});});
  await page.waitForURL(base+'/');
  await page.waitForTimeout(300);
  await page.evaluate(()=>window.nativeHandlers.backButton({}));
  await page.waitForFunction(()=>window.nativeCalls.some(c=>c.method==='minimizeApp'));
  await page.evaluate(()=>{const a=document.createElement('a');a.href='https://example.com/reading';a.id='external-qa';a.style.cssText='position:fixed;top:100px;left:20px;z-index:99999;background:white';a.textContent='External QA';document.body.append(a);});
  await page.locator('#external-qa').click();
  await page.waitForFunction(()=>window.nativeCalls.some(c=>c.plugin==='Browser'&&c.args.url==='https://example.com/reading'));
  assert.equal(new URL(page.url()).origin,base);
  await page.evaluate(()=>{document.documentElement.dataset.appTheme='dark';});
  await page.waitForFunction(()=>window.nativeCalls.some(c=>c.plugin==='SystemBars'&&c.args.style==='DARK'));
  await page.evaluate(async()=>{await (await import('/src/native/export.ts')).shareStudioExport('../synthetic.csv','Synthetic metadata');});
  assert(await page.evaluate(()=>window.nativeCalls.some(c=>c.plugin==='Filesystem'&&c.args.path==='exports/.._synthetic.csv')));
  assert(await page.evaluate(()=>window.nativeCalls.some(c=>c.plugin==='Share'&&c.args.files[0]==='file:///cache/exports/synthetic.csv')));
  await page.getByRole('button',{name:'Buka menu',exact:true}).click();
  await page.getByRole('menuitem',{name:'Notifikasi',exact:true}).click();
  await page.getByRole('dialog').waitFor();
  await page.waitForFunction(()=>!document.querySelector('[role="dialog"]').getAttribute('aria-busy')||document.querySelector('[role="dialog"]').getAttribute('aria-busy')==='false');
  await page.evaluate(()=>window.denyNotifications=true);
  await page.getByRole('checkbox',{name:'Aktifkan pengingat',exact:true}).click();
  await page.getByRole('alert').filter({hasText:'Izin notifikasi belum diberikan'}).waitFor();
  assert(!await page.getByRole('checkbox',{name:'Aktifkan pengingat',exact:true}).isChecked());
  await page.evaluate(()=>window.denyNotifications=false);
  await page.getByRole('checkbox',{name:'Aktifkan pengingat',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Pengingat membaca diaktifkan'}).waitFor();
  await page.getByRole('checkbox',{name:'Aktifkan kabar bab baru',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Kabar bab baru diaktifkan'}).waitFor();
  assert(await page.evaluate(()=>window.nativeCalls.some(c=>c.plugin==='ChapterAlerts'&&c.method==='configure'&&c.args.enabled&&c.args.url==='https://synthetic-android.supabase.co')));
  assert(await page.evaluate(()=>window.nativeCalls.some(c=>c.plugin==='LocalNotifications'&&c.method==='schedule'&&c.args.notifications[0].isExactNotification===false)));
  await page.getByRole('button',{name:'Coba notifikasi',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Notifikasi percobaan dikirim'}).waitFor();
  await page.getByRole('checkbox',{name:'Aktifkan kabar bab baru',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Kabar bab baru dimatikan'}).waitFor();
  await page.getByRole('checkbox',{name:'Aktifkan pengingat',exact:true}).click();
  await page.getByRole('status').filter({hasText:'Pengingat membaca dimatikan'}).waitFor();
  assert(await page.evaluate(()=>window.nativeCalls.some(c=>c.plugin==='LocalNotifications'&&c.method==='cancel')));
  await page.keyboard.press('Escape');await page.getByRole('dialog').waitFor({state:'detached'});
  assert.deepEqual(errors,[]);
  console.log('PASS native bridge contract: no startup errors, local viewport, no SW, installed notice, guarded Back, history, minimize, external browser, theme bars, native export, opt-in permission denial/grant, inexact reading reminders, chapter worker configuration, test notification, cancellation. Desktop mocks only.');
}finally{await browser?.close();server.kill();}
