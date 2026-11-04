import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
let instance=0;
async function preferences(saved){
 const w=new JSDOM('',{url:'https://katakecil.test/'}).window;
 globalThis.window=w;globalThis.localStorage=w.localStorage;
 globalThis.BroadcastChannel=class {postMessage(){} close(){}};
 if(saved)w.localStorage.setItem('lumina_device_settings',JSON.stringify(saved));
 w.localStorage.setItem('lumina_annotations','[{"id":"keep-note"}]');
 const store=await import('../dist/store.js?default-test='+instance++);
 return{store,w};
}
test('English defaults apply to new devices and migrate an old automatic Indonesian preference',async()=>{
 const fresh=await preferences();assert.equal(fresh.store.preferences.uiLanguage,'en');
 const old=await preferences({deviceId:'existing-device',schemaVersion:2,uiLanguage:'id',fontSize:23,accentColor:'#4269a5'});
 assert.equal(old.store.preferences.uiLanguage,'en');assert.equal(old.store.deviceId,'existing-device');assert.equal(old.store.preferences.fontSize,23);assert.equal(old.store.preferences.accentColor,'#4269a5');assert.equal(old.w.localStorage.getItem('lumina_annotations'),'[{"id":"keep-note"}]');assert.equal(JSON.parse(old.w.localStorage.getItem('lumina_device_settings')).uiLanguageDefaultVersion,1);
});
test('an explicitly selected Indonesian language remains selected after reload',async()=>{
 const result=await preferences({schemaVersion:2,uiLanguage:'id',uiLanguageChosen:true,uiLanguageDefaultVersion:1});
 assert.equal(result.store.preferences.uiLanguage,'id');
 const invalid=await preferences({schemaVersion:2,uiLanguage:'invalid',uiLanguageDefaultVersion:1});assert.equal(invalid.store.preferences.uiLanguage,'en');
});
