import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {GLASS_DEFAULTS,normalizeGlassPreferences,glassTokens,glassContrast} from '../dist/glass-preferences.js';
import {createGlassSettings} from '../dist/glass-settings.js';
import {createBackup,parseBackup} from '../dist/device-backup.js';

test('glass defaults upgrade the unused opacity setting and normalize local values',()=>{
 assert.deepEqual(normalizeGlassPreferences({glassOpacity:.68}),{glassTransparency:75,glassBlur:20});
 assert.deepEqual(normalizeGlassPreferences({glassTransparency:150,glassBlur:-5}),{glassTransparency:100,glassBlur:0});
 assert.deepEqual(normalizeGlassPreferences({glassTransparency:NaN,glassBlur:'30'}),GLASS_DEFAULTS);
 assert.deepEqual(normalizeGlassPreferences({glassTransparency:41.6,glassBlur:34}),{glassTransparency:42,glassBlur:34});
});
test('clarity controls background alpha and blur independently, with readable action ink',()=>{
 for(const [background,text,glass] of [['#faf9f5','#28302b','250,249,245'],['#191d1b','#dddcd4','34,38,35']]){
  for(const transparency of [0,75,100]){
   const palette={background,text,variables:{'--glass':glass}},input={glassTransparency:transparency,glassBlur:0,accentColor:'#54756c'},tokens=glassTokens(input,palette);
   assert.equal(tokens['--g-fill-alpha'],String(1-transparency/100));assert.equal(tokens['--g-blur'],'0px');
   if(transparency===100)assert.ok(glassContrast(tokens['--g-action-ink'],background)>=4.5);
   if(transparency===0)assert.ok(glassContrast(tokens['--g-action-ink'],input.accentColor)>=4.5);
  }
 }
});
test('glass sheet previews without replacing its slider, commits on close, and resets only glass',()=>{
 const w=new JSDOM('<body><span id="glass-summary"></span><div id="overlay"></div></body>',{pretendToBeVisual:true}).window;
 let prefs={...GLASS_DEFAULTS,fontSize:23},saves=0,painted;
 const sheet=createGlassSettings({document:w.document,language:()=> 'id',prefs:()=>prefs,save:value=>{prefs={...prefs,...value};saves++;},apply(){},paint:value=>painted=value,heading:title=>'<h2>'+title+'</h2>',show:html=>w.document.querySelector('#overlay').innerHTML=html});
 try{
  sheet.action({dataset:{action:'glass-settings'}});const slider=w.document.querySelector('#glassTransparency');slider.value='90';sheet.input(slider);
  assert.equal(w.document.querySelector('#glassTransparency'),slider);assert.equal(prefs.glassTransparency,75);assert.equal(saves,0);assert.match(w.document.querySelector('[data-glass-output]').textContent,/90%/);
  sheet.close();assert.equal(prefs.glassTransparency,90);assert.equal(saves,1);
  sheet.action({dataset:{action:'glass-settings'}});sheet.action({dataset:{action:'glass-reset'}});assert.equal(prefs.glassTransparency,75);assert.equal(prefs.glassBlur,20);assert.equal(prefs.fontSize,23);assert.ok(painted);sheet.close();
 }finally{w.close();}
});
test('backup preserves glass settings and rejects wrong types/ranges, while older backups still import',()=>{
 const roundtrip=parseBackup(JSON.stringify(createBackup({preferences:{glassTransparency:88,glassBlur:34},progress:{},annotations:[]})));
 assert.equal(roundtrip.preferences.glassTransparency,88);assert.equal(roundtrip.preferences.glassBlur,34);
 const old=parseBackup(JSON.stringify(createBackup({preferences:{fontSize:22},progress:{},annotations:[]})));assert.equal(old.preferences.glassTransparency,undefined);
 for(const preferences of [{glassTransparency:'75'},{glassBlur:41},{glassTransparency:-1}])assert.throws(()=>createBackup({preferences,progress:{},annotations:[]}));
});
