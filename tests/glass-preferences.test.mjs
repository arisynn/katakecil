import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {GLASS_DEFAULTS,normalizeGlassPreferences,glassTokens,glassContrast} from '../dist/glass-preferences.js';
import {createGlassSettings} from '../dist/glass-settings.js';
import {createBackup,parseBackup} from '../dist/device-backup.js';
import {globalPalette,contrast} from '../dist/advanced-reader.js';

test('glass defaults upgrade the unused opacity setting and normalize local values',()=>{
 assert.deepEqual(normalizeGlassPreferences({glassOpacity:.68}),{glassTransparency:75,glassBlur:20,ambientIntensity:60});
 assert.deepEqual(normalizeGlassPreferences({glassTransparency:150,glassBlur:-5,ambientIntensity:150}),{glassTransparency:100,glassBlur:0,ambientIntensity:100});
 assert.deepEqual(normalizeGlassPreferences({glassTransparency:NaN,glassBlur:'30'}),GLASS_DEFAULTS);
 assert.deepEqual(normalizeGlassPreferences({glassTransparency:41.6,glassBlur:34,ambientIntensity:28.6}),{glassTransparency:42,glassBlur:34,ambientIntensity:29});
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
  const ambient=w.document.querySelector('#ambientIntensity');ambient.value='0';sheet.input(ambient);assert.match(w.document.querySelector('[data-glass-output="ambientIntensity"]').textContent,/0%/);
  sheet.close();assert.equal(prefs.glassTransparency,90);assert.equal(prefs.ambientIntensity,0);assert.equal(saves,1);
  sheet.action({dataset:{action:'glass-settings'}});sheet.action({dataset:{action:'glass-reset'}});assert.equal(prefs.glassTransparency,75);assert.equal(prefs.glassBlur,20);assert.equal(prefs.ambientIntensity,60);assert.equal(prefs.fontSize,23);assert.ok(painted);sheet.close();
 }finally{w.close();}
});
test('backup preserves glass settings and rejects wrong types/ranges, while older backups still import',()=>{
 const roundtrip=parseBackup(JSON.stringify(createBackup({preferences:{glassTransparency:88,glassBlur:34,ambientIntensity:28},progress:{},annotations:[]})));
 assert.equal(roundtrip.preferences.glassTransparency,88);assert.equal(roundtrip.preferences.glassBlur,34);assert.equal(roundtrip.preferences.ambientIntensity,28);
 const old=parseBackup(JSON.stringify(createBackup({preferences:{fontSize:22},progress:{},annotations:[]})));assert.equal(old.preferences.glassTransparency,undefined);
 assert.equal(old.preferences.ambientIntensity,undefined);
 for(const preferences of [{glassTransparency:'75'},{glassBlur:41},{glassTransparency:-1},{ambientIntensity:'60'},{ambientIntensity:101}])assert.throws(()=>createBackup({preferences,progress:{},annotations:[]}));
});
test('Pearl and charcoal UI palettes preserve the original opaque reading colors',()=>{
 const light=globalPalette({themeMode:'light'}),dark=globalPalette({themeMode:'dark'});
 assert.equal(light.background,'#eef2f6');assert.equal(light.text,'#25313b');assert.equal(light.readingBackground,'#faf9f5');assert.equal(light.readingText,'#28302b');
 assert.equal(dark.background,'#11161c');assert.equal(dark.text,'#e6edf3');assert.equal(dark.readingBackground,'#191d1b');assert.equal(dark.readingText,'#dddcd4');
 for(const p of [light,dark]){assert.equal(p.variables['--paper'],p.readingBackground);assert.ok(contrast(p.text,p.background)>=4.5);assert.ok(contrast(p.readingText,p.readingBackground)>=4.5);}
 assert.equal(globalPalette({themeMode:'system'},true).background,dark.background);
});
test('other presets and custom colors keep the same UI and paper base',()=>{
 for(const mode of ['sepia','paper','green','custom']){const p=globalPalette({themeMode:mode,customBackgroundColor:'#123047',customTextColor:'#f2eee2'});assert.equal(p.background,p.readingBackground);assert.equal(p.text,p.readingText);}
 assert.equal(globalPalette({themeMode:'custom',customBackgroundColor:'#123047',customTextColor:'#f2eee2'}).background,'#123047');
});
test('ambient off removes all ambient layers; maximum is bounded and action ink remains readable',()=>{
 for(const mode of ['light','dark']){
  const palette=globalPalette({themeMode:mode}),off=glassTokens({ambientIntensity:0},palette),full=glassTokens({ambientIntensity:100},palette);
  for(const key of ['--ambient-primary-alpha','--ambient-secondary-alpha','--ambient-panel-alpha'])assert.equal(off[key],'0');
  assert.equal(full['--ambient-primary-alpha'],mode==='dark'?'0.18':'0.22');assert.equal(full['--ambient-secondary-alpha'],mode==='dark'?'0.08':'0.1');
  for(const accentColor of ['#000000','#ffffff','#777777','#a15e73']){const t=glassTokens({glassTransparency:0,accentColor},palette);assert.ok(glassContrast(t['--g-action-ink'],accentColor)>=4.5);}
 }
});
