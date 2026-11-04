import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createAppUpdater} from '../dist/app-updates.js';

function fixture(overrides={}){
 const w=new JSDOM('<body><span id="app-update-summary"></span><div id="overlay-root"></div></body>').window;globalThis.document=w.document;
 let checks=0,downloads=0,installs=0,removed=0,progress;const response={currentVersion:'1.0.1-preview.2',versionCode:2,previewChannel:true,update:{version:'1.0.1-preview.3',tag:'v1.0.1-preview.3',size:8*1024*1024,notes:'<script>book()</script>',preview:true}};
 const api={check:async()=>{checks++;return response;},download:async()=>{downloads++;progress({percent:42});return{ready:true};},install:async()=>{installs++;return{permissionRequired:installs===1};},cancel:async()=>{},addListener:async(name,callback)=>{progress=callback;return{remove:async()=>{removed++;}};},...overrides};
 let saved=0,openings=0;const updater=createAppUpdater({enabled:true,api,language:()=>w.document.documentElement.lang||'en',heading:title=>'<h2>'+title+'</h2>',show:html=>{openings++;w.document.querySelector('#overlay-root').innerHTML='<section class="dialog">'+html+'</section>';},saveCheck:date=>saved=date,lastCheck:()=>saved});
 return{w,updater,api,response,get checks(){return checks;},get downloads(){return downloads;},get installs(){return installs;},get removed(){return removed;},get openings(){return openings;}};
}
test('update checks coalesce, include preview information and retain their own sheet',async()=>{
 const s=fixture();s.updater.open();const dialog=s.w.document.querySelector('.dialog');await s.updater.check();assert.equal(s.checks,1);assert.equal(s.openings,1);assert.equal(s.w.document.querySelector('.dialog'),dialog);assert.match(dialog.textContent,/1.0.1-preview.3/);assert.equal(dialog.querySelector('script'),null,'release notes render as text');await s.updater.check({silent:true});assert.equal(s.checks,1,'automatic checks are limited after a successful check');
 s.response.update=null;await s.updater.action('updates-check');assert.match(dialog.textContent,/latest compatible/);assert.equal(s.w.document.querySelector('[data-action=updates-download]'),null);s.w.close();
});
test('download verification precedes Android permission and installation actions',async()=>{
 const s=fixture();s.updater.open();await s.updater.check();await s.updater.action('updates-install');assert.equal(s.installs,0);await Promise.all([s.updater.action('updates-download'),s.updater.action('updates-download')]);assert.equal(s.downloads,1);assert.equal(s.removed,1);assert.match(s.w.document.body.textContent,/verified and ready/);await s.updater.action('updates-install');assert.match(s.w.document.body.textContent,/Allow installs/);await s.updater.action('updates-install');assert.match(s.w.document.body.textContent,/installer has opened/);assert.equal(s.installs,2);s.api.install=async()=>{throw Error('The update file changed. Download it again.');};await s.updater.action('updates-install');assert.ok(s.w.document.querySelector('[data-action=updates-download]'),'a missing/changed cached APK can be downloaded again');await s.updater.action('updates-download');assert.equal(s.downloads,2);assert.equal(s.removed,2);assert.equal(s.openings,1);s.w.close();
});
test('closing an update sheet does not reopen it on download completion',async()=>{
 let finish;const s=fixture({download:()=>new Promise(r=>finish=r)});s.updater.open();await s.updater.check();const task=s.updater.action('updates-download');await Promise.resolve();s.w.document.querySelector('#overlay-root').innerHTML='';finish({ready:true});await task;assert.equal(s.w.document.querySelector('.dialog'),null);assert.match(s.updater.summary(),/Ready to install/);s.updater.open();assert.match(s.w.document.body.textContent,/verified and ready/);s.w.close();
});
test('network and verification failures offer retry without exposing an install button',async()=>{
 const s=fixture({check:async()=>{throw Error('GitHub is limiting update checks.');}});s.updater.open();await s.updater.check();assert.match(s.w.document.body.textContent,/limiting/);assert.equal(s.w.document.querySelector('[data-action=updates-install]'),null);s.api.check=async()=>s.response;await s.updater.check();s.api.download=async()=>{throw Error('Update verification failed.');};await s.updater.action('updates-download');assert.match(s.w.document.body.textContent,/verification failed/);assert.equal(s.w.document.querySelector('[data-action=updates-install]'),null);assert.equal(s.removed,1);s.w.close();
});
test('web clients never call the native updater',async()=>{
 const s=fixture();const disabled=createAppUpdater({enabled:false,api:new Proxy({},{get(){throw Error('native API must not be used');}}),language:()=> 'en'});disabled.open();await disabled.check();await disabled.action('updates-download');await disabled.action('updates-install');assert.equal(s.w.document.querySelector('.dialog'),null);s.w.close();
});
