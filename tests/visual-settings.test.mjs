import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {indexedDB} from 'fake-indexeddb';
import {createVisualSettings} from '../dist/loading-previews.js';
import {icon,applyIconPack} from '../dist/ui.js?v=16';
import {loadingLogo,applyLoadingStyle} from '../dist/loading-logo.js?v=6';
import {createBackup,parseBackup} from '../dist/device-backup.js';

function fixture(initial={}){
 const w=new JSDOM('<body><div id="live"></div><div id="overlay"></div></body>',{pretendToBeVisual:true}).window,doc=w.document;
 let prefs={iconPack:'katakecil',loadingStyle:'wordmark',fontSize:24,...initial},writes=[],applied=0,sheet;
 const apply=()=>{applied++;applyIconPack(prefs.iconPack,doc);applyLoadingStyle(prefs.loadingStyle,doc);};
 apply();doc.querySelector('#live').innerHTML=icon('refresh')+loadingLogo();
 sheet=createVisualSettings({document:doc,prefs:()=>prefs,save:value=>{writes.push(value);prefs={...prefs,...value};},apply,
  heading:title=>`<header class="dialog-heading"><h2>${title}</h2></header>`,show:html=>{sheet?.close();doc.querySelector('#overlay').innerHTML=`<section class="dialog">${html}</section>`;}});
 const action=(name,value,key)=>sheet.action({dataset:{action:name,value,visualKey:key}});
 action('loading-previews');
 return{w,doc,sheet,action,writes,apply,get prefs(){return prefs;},get applied(){return applied;},external:value=>{prefs={...prefs,...value};sheet.sync();apply();}};
}

test('icon and loading candidates do not affect the live renderer until their own Use action',()=>{
 const s=fixture(),{doc,action}=s;
 try{
  const dialog=doc.querySelector('.dialog'),tabs=doc.querySelector('.visual-settings-tabs'),liveIcon=doc.querySelector('#live svg'),liveLoader=doc.querySelector('#live .loading-brand'),beforeApplied=s.applied;
  action('visual-candidate','lucide','iconPack');assert.deepEqual(s.writes,[]);assert.equal(liveIcon.dataset.iconPack,'katakecil');assert.equal(s.applied,beforeApplied);
  action('visual-tab','loading');action('visual-candidate','dots','loadingStyle');assert.deepEqual(s.writes,[]);assert.equal(liveLoader.dataset.loadingStyle,'wordmark');
  action('visual-tab','icons');action('visual-use');
  assert.deepEqual(s.writes,[{iconPack:'lucide'}]);assert.equal(s.prefs.loadingStyle,'wordmark');assert.equal(s.prefs.fontSize,24);
  assert.equal(doc.querySelector('#live svg'),liveIcon);assert.equal(liveIcon.dataset.iconPack,'lucide');assert.equal(doc.querySelector('#live .loading-brand'),liveLoader);
  assert.equal(doc.querySelector('.dialog'),dialog);assert.equal(doc.querySelector('.visual-settings-tabs'),tabs);
  assert.ok([...doc.querySelectorAll('[data-icon-preview]')].some(svg=>svg.dataset.iconPack==='katakecil'),'the other pack preview is not replaced by applying Lucide');
  assert.equal(doc.querySelector('[data-action="visual-use"]').disabled,true);
 }finally{s.w.close();}
});

test('Try only restarts the loading sample; closing without Use discards candidates',()=>{
 const s=fixture(),{doc,action}=s;
 try{
  action('visual-tab','loading');const stage=doc.querySelector('.visual-loading-stage'),live=doc.querySelector('#live .loading-brand');
  action('visual-candidate','pulse','loadingStyle');const first=stage.firstElementChild;action('visual-try');
  assert.equal(doc.querySelector('.visual-loading-stage'),stage);assert.notEqual(stage.firstElementChild,first);assert.equal(stage.firstElementChild.dataset.loadingStyle,'pulse');assert.equal(stage.firstElementChild.dataset.loadingPreview,'true');
  assert.deepEqual(s.writes,[]);assert.equal(live.dataset.loadingStyle,'wordmark');
  s.sheet.close();action('loading-previews');action('visual-tab','loading');assert.equal(doc.querySelector('.visual-choice[aria-pressed="true"]').dataset.value,'wordmark');
  action('visual-candidate','dots','loadingStyle');const tabs=doc.querySelector('.visual-settings-tabs');action('visual-use');
  assert.deepEqual(s.writes,[{loadingStyle:'dots'}]);assert.equal(s.prefs.iconPack,'katakecil');assert.equal(live.dataset.loadingStyle,'dots');assert.equal(doc.querySelector('.visual-settings-tabs'),tabs);
  action('visual-try');assert.equal(s.writes.length,1);assert.equal(live.dataset.loadingStyle,'dots');
 }finally{s.w.close();}
});

test('cross-tab sync updates current badges while retaining an explicitly selected candidate',()=>{
 const s=fixture(),{doc,action}=s;
 try{
  action('visual-candidate','lucide','iconPack');const card=doc.querySelector('[data-value="lucide"]'),tabs=doc.querySelector('.visual-settings-tabs');
  s.external({iconPack:'katakecil',loadingStyle:'pulse'});assert.equal(card.getAttribute('aria-pressed'),'true');assert.equal(doc.querySelector('[data-action="visual-use"]').disabled,false);
  s.external({iconPack:'lucide'});assert.equal(card.querySelector('[data-visual-current]').hidden,false);assert.equal(doc.querySelector('[data-action="visual-use"]').disabled,true);assert.equal(doc.querySelector('.visual-settings-tabs'),tabs);
  action('visual-tab','loading');assert.equal(doc.querySelector('.visual-loading-stage .loading-brand').dataset.loadingStyle,'pulse');assert.deepEqual(s.writes,[]);
 }finally{s.w.close();}
});

test('visual keyboard navigation moves focus with selection without invoking the reader tab handler',()=>{
 const s=fixture(),{doc}=s;let legacyCalls=0;
 doc.addEventListener('keydown',()=>legacyCalls++);
 try{
  const icons=doc.querySelector('#visual-tab-icons'),loading=doc.querySelector('#visual-tab-loading'),dialog=doc.querySelector('.dialog'),tabs=doc.querySelector('.visual-settings-tabs');
  const key=value=>doc.activeElement.dispatchEvent(new s.w.KeyboardEvent('keydown',{key:value,bubbles:true,cancelable:true}));
  icons.focus();key('ArrowRight');assert.equal(doc.activeElement,loading);assert.equal(loading.getAttribute('aria-selected'),'true');assert.equal(doc.querySelector('#visual-settings-body').getAttribute('aria-labelledby'),'visual-tab-loading');
  key('ArrowLeft');assert.equal(doc.activeElement,icons);assert.equal(icons.getAttribute('aria-selected'),'true');
  key('End');assert.equal(doc.activeElement,loading);key('Home');assert.equal(doc.activeElement,icons);key('ArrowLeft');assert.equal(doc.activeElement,loading,'arrow navigation wraps');
  assert.equal(legacyCalls,0);assert.equal(doc.querySelector('.dialog'),dialog);assert.equal(doc.querySelector('.visual-settings-tabs'),tabs);assert.deepEqual(s.writes,[]);
 }finally{s.w.close();}
});

test('visual preferences survive reload, old backup restore, comfort reset and cross-tab normalization',async()=>{
 const w=new JSDOM('',{url:'https://visual-settings.test/'}).window,channels=[];
 const previous=Object.fromEntries(['window','localStorage','indexedDB','BroadcastChannel'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
 Object.assign(globalThis,{window:w,localStorage:w.localStorage,indexedDB,BroadcastChannel:class{constructor(){channels.push(this);}postMessage(){}close(){}}});
 w.localStorage.setItem('lumina_device_settings',JSON.stringify({fontSize:24,uiLanguageChosen:true}));
 try{
  const store=await import('../dist/store.js?visual-settings-persist');assert.equal(store.preferences.iconPack,'katakecil');assert.equal(store.preferences.loadingStyle,'wordmark');
  assert.equal(store.preferences.readerAmbientGlow,false);store.updatePreferences({iconPack:'lucide',loadingStyle:'dots',readerAmbientGlow:true});assert.equal(JSON.parse(w.localStorage.getItem('lumina_device_settings')).iconPack,'lucide');
  const reload=await import('../dist/store.js?visual-settings-reload');assert.equal(reload.preferences.iconPack,'lucide');assert.equal(reload.preferences.loadingStyle,'dots');assert.equal(reload.preferences.readerAmbientGlow,true);
  store.resetReadingPreferences();assert.equal(store.preferences.iconPack,'lucide');assert.equal(store.preferences.loadingStyle,'dots');assert.equal(store.preferences.fontSize,store.DEFAULTS.fontSize);assert.equal(store.preferences.readerAmbientGlow,true);
  await store.restoreBackup({annotations:[],progress:[],preferences:{fontSize:22}},{restorePreferences:true});assert.equal(store.preferences.iconPack,'lucide');assert.equal(store.preferences.loadingStyle,'dots');
  channels[0].onmessage({data:{kind:'preferences',payload:{...store.preferences,iconPack:'untrusted',loadingStyle:17,readerAmbientGlow:'true'}}});assert.equal(store.preferences.iconPack,'katakecil');assert.equal(store.preferences.loadingStyle,'wordmark');assert.equal(store.preferences.readerAmbientGlow,false);
  const incoming={...store.preferences,iconPack:'lucide',loadingStyle:'pulse',readerAmbientGlow:true};w.localStorage.setItem('lumina_device_settings',JSON.stringify(incoming));w.dispatchEvent(new w.StorageEvent('storage',{key:'lumina_device_settings',newValue:JSON.stringify(incoming)}));assert.equal(store.preferences.iconPack,'lucide');assert.equal(store.preferences.loadingStyle,'pulse');assert.equal(store.preferences.readerAmbientGlow,true);
 }finally{w.close();for(const [key,descriptor] of Object.entries(previous)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});

test('backup roundtrips visual choices, accepts legacy fields and rejects invalid enum types/values',()=>{
 const backup=createBackup({preferences:{iconPack:'lucide',loadingStyle:'pulse'},annotations:[],progress:{}}),restored=parseBackup(JSON.stringify(backup));
 assert.equal(restored.preferences.iconPack,'lucide');assert.equal(restored.preferences.loadingStyle,'pulse');assert.equal(backup.schemaVersion,2);
 const legacy=parseBackup(JSON.stringify(createBackup({preferences:{fontSize:23},annotations:[],progress:{}})));assert.equal(legacy.preferences.iconPack,undefined);assert.equal(legacy.preferences.loadingStyle,undefined);
 for(const preferences of [{iconPack:'other'},{iconPack:1},{iconPack:true},{loadingStyle:'other'},{loadingStyle:null},{loadingStyle:[]}])assert.throws(()=>createBackup({preferences,annotations:[],progress:{}}),/Invalid/);
});

test('reader glow backup preserves booleans, accepts old backups and rejects malformed values',()=>{
 for(const value of [true,false]){
  const data=createBackup({preferences:{readerAmbientGlow:value},annotations:[],progress:{}});
  assert.equal(parseBackup(JSON.stringify(data)).preferences.readerAmbientGlow,value);
 }
 for(const value of ['true',1,null,{}])assert.throws(()=>createBackup({preferences:{readerAmbientGlow:value},annotations:[],progress:{}}),/Invalid/);
 assert.equal(parseBackup(JSON.stringify(createBackup({preferences:{},annotations:[],progress:{}}))).preferences.readerAmbientGlow,undefined);
});
