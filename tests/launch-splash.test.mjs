import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createLaunchSplash,dismissLaunchSplash} from '../dist/launch-splash.js';
import {applyLoadingStyle} from '../dist/loading-logo.js?v=8';

function scene(){
 const w=new JSDOM('<body><main id="app"><article class="page-text">Keep this reading place.</article></main></body>',{pretendToBeVisual:true}).window;
 const previous=Object.getOwnPropertyDescriptor(globalThis,'document');globalThis.document=w.document;
 return{w,doc:w.document,close(){w.close();if(previous)Object.defineProperty(globalThis,'document',previous);else delete globalThis.document;}};
}
function transition(w,target,type='transitionend',propertyName='opacity'){
 const event=new w.Event(type,{bubbles:true});Object.defineProperty(event,'propertyName',{value:propertyName});target.dispatchEvent(event);
}

test('splash localizes its status and always uses the explicit turning-pages brand',()=>{
 const s=scene();
 try{
  applyLoadingStyle('dots',s.doc);
  for(const [language,label,tagline] of [['en','Loading KataKecil','A little room for great stories'],['id-ID','Memuat KataKecil','Ruang kecil untuk cerita besar']]){
   const splash=createLaunchSplash({language});assert.equal(splash.id,'launch-loading');assert.equal(splash.getAttribute('role'),'status');assert.equal(splash.getAttribute('aria-label'),label);assert.equal(splash.querySelector('.launch-splash-tagline').textContent,tagline);
   const logo=splash.querySelector('.loading-brand');assert.equal(logo.dataset.loadingStyle,'pulse');assert.equal(logo.dataset.loadingPreview,'true');assert.equal(logo.querySelectorAll('.loading-turning-page').length,3);assert.equal(logo.querySelectorAll('.loading-letter').length,9);assert.equal(logo.querySelector('.loading-pages-wordmark').textContent,'katakecil');
   s.doc.body.append(splash);applyLoadingStyle('wordmark',s.doc);assert.equal(logo.dataset.loadingStyle,'pulse','launch artwork is independent of the in-app loader setting');splash.remove();
  }
 }finally{applyLoadingStyle('pulse',s.doc);s.close();}
});

test('immediate dismissal removes only the splash and preserves the host reader node',async()=>{
 const s=scene();
 try{
  const text=s.doc.querySelector('.page-text'),splash=createLaunchSplash();s.doc.body.append(splash);
  await dismissLaunchSplash(splash,{immediate:true});assert.equal(s.doc.querySelector('#launch-loading'),null);assert.equal(s.doc.querySelector('.page-text'),text);assert.equal(text.textContent,'Keep this reading place.');
  await dismissLaunchSplash(null);await dismissLaunchSplash(createLaunchSplash());
 }finally{s.close();}
});

test('normal dismissal waits for the root opacity transition, ignoring descendants and other properties',async()=>{
 const s=scene();
 try{
  const splash=createLaunchSplash();s.doc.body.append(splash);let done=false;const pending=dismissLaunchSplash(splash).then(()=>done=true);
  assert.ok(splash.classList.contains('is-leaving'));transition(s.w,splash.querySelector('.launch-splash-scene'));transition(s.w,splash,'transitionend','transform');await Promise.resolve();assert.equal(done,false);assert.equal(splash.isConnected,true);
  transition(s.w,splash);await pending;assert.equal(splash.isConnected,false);assert.equal(done,true);
 }finally{s.close();}
});

test('cancelled transitions and repeated dismissal requests resolve without a stranded overlay',async()=>{
 const s=scene();
 try{
  const splash=createLaunchSplash();s.doc.body.append(splash);const first=dismissLaunchSplash(splash),second=dismissLaunchSplash(splash);transition(s.w,splash,'transitioncancel');await Promise.all([first,second]);assert.equal(splash.isConnected,false);
  const another=createLaunchSplash();s.doc.body.append(another);const pending=dismissLaunchSplash(another);await dismissLaunchSplash(another,{immediate:true});await pending;assert.equal(s.doc.querySelector('.launch-loading'),null);
 }finally{s.close();}
});

test('dismissal has a bounded fallback when the browser emits no transition event',{timeout:1500},async()=>{
 const s=scene();
 try{
  const splash=createLaunchSplash();s.doc.body.append(splash);const pending=dismissLaunchSplash(splash);assert.equal(splash.isConnected,true);await pending;assert.equal(splash.isConnected,false);
 }finally{s.close();}
});

test('reduced motion and hidden documents dismiss immediately',async()=>{
 const s=scene();
 try{
  s.w.matchMedia=()=>({matches:true});let splash=createLaunchSplash();s.doc.body.append(splash);await dismissLaunchSplash(splash);assert.equal(splash.isConnected,false);assert.equal(splash.classList.contains('is-leaving'),false);
  s.w.matchMedia=()=>({matches:false});Object.defineProperty(s.doc,'hidden',{configurable:true,value:true});splash=createLaunchSplash();s.doc.body.append(splash);await dismissLaunchSplash(splash);assert.equal(splash.isConnected,false);assert.equal(splash.classList.contains('is-leaving'),false);
 }finally{s.close();}
});
