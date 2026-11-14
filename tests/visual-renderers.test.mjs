import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {VISUAL_DEFAULTS,normalizeVisualPreferences,readVisualPreferences} from '../dist/visual-preferences.js';
import {icon,applyIconPack} from '../dist/ui.js';
import {loadingLogo,applyLoadingStyle} from '../dist/loading-logo.js';
import {LUCIDE_ICONS,LUCIDE_ICON_NAMES,LUCIDE_VERSION} from '../dist/vendor/lucide-icons.js';

test('visual preferences safely upgrade legacy or blocked storage and reject unknown choices',()=>{
 assert.deepEqual(normalizeVisualPreferences({glassBlur:34}),VISUAL_DEFAULTS);
 for(const input of [null,{}, {iconPack:false,loadingStyle:12},{iconPack:'remote',loadingStyle:'shimmer'}])assert.deepEqual(normalizeVisualPreferences(input),VISUAL_DEFAULTS);
 assert.deepEqual(normalizeVisualPreferences({iconPack:'lucide',loadingStyle:'dots'}),{iconPack:'lucide',loadingStyle:'dots'});
 assert.deepEqual(readVisualPreferences({getItem(){throw Error('Blocked');}}),VISUAL_DEFAULTS);
 assert.deepEqual(readVisualPreferences({getItem:()=>'{broken'}),VISUAL_DEFAULTS);
 assert.deepEqual(readVisualPreferences({getItem:()=>'{"iconPack":"lucide","loadingStyle":"pulse"}'}),{iconPack:'lucide',loadingStyle:'pulse'});
});

test('Lucide glyphs come from the pinned official SVGs and cover the complete app vocabulary',async()=>{
 const pkg=JSON.parse(await readFile(new URL('../package.json',import.meta.url),'utf8'));
 assert.equal(pkg.devDependencies['lucide-static'],LUCIDE_VERSION);assert.equal(Object.keys(LUCIDE_ICONS).length,52);
 assert.deepEqual(Object.keys(LUCIDE_ICONS),Object.keys(LUCIDE_ICON_NAMES));
 for(const name of ['systemTheme','refresh','sliders','bookOpen','speaker']){
  const svg=await readFile(new URL('../node_modules/lucide-static/icons/'+LUCIDE_ICON_NAMES[name]+'.svg',import.meta.url),'utf8');
  const expected=new JSDOM(svg,{contentType:'image/svg+xml'}).window.document.documentElement;
  const rendered=new JSDOM(icon(name,'','lucide')).window.document.querySelector('svg');
  assert.equal(rendered.children.length,expected.children.length,name);assert.ok([...rendered.children].every((el,i)=>el.isEqualNode(expected.children[i])),name);
 }
});

test('switching icon packs preserves live SVG identity, attributes and listeners while explicit previews stay fixed',()=>{
 applyIconPack('katakecil');
 const dom=new JSDOM('<body><button>'+icon('refresh','live-icon')+'</button>'+icon('refresh','preview','katakecil')+icon('refresh','preview','lucide')+'</body>'),doc=dom.window.document;
 try{
  const live=doc.querySelector('.live-icon'),preview=[...doc.querySelectorAll('[data-icon-preview]')],before=preview.map(el=>el.outerHTML);let clicks=0;
  live.setAttribute('aria-label','Refresh collection');live.setAttribute('width','27');live.dataset.purpose='kept';live.style.color='red';live.addEventListener('click',()=>clicks++);
  applyIconPack('lucide',doc);
  assert.equal(doc.querySelector('.live-icon'),live);assert.equal(live.dataset.iconPack,'lucide');assert.equal(live.getAttribute('aria-label'),'Refresh collection');assert.equal(live.getAttribute('width'),'27');assert.equal(live.dataset.purpose,'kept');assert.equal(live.style.color,'red');assert.equal(live.style.strokeWidth,'2');
  live.dispatchEvent(new dom.window.Event('click'));assert.equal(clicks,1);assert.deepEqual(preview.map(el=>el.outerHTML),before);
  const graphics=live.firstElementChild;applyIconPack('lucide',doc);assert.equal(live.firstElementChild,graphics,'same pack does not replace graphics');assert.match(icon('search'),/data-icon-pack="lucide"/);
  applyIconPack('katakecil',live);assert.equal(live.dataset.iconPack,'katakecil');assert.equal(live.style.strokeWidth,'1.85');assert.deepEqual(preview.map(el=>el.outerHTML),before);
 }finally{applyIconPack('katakecil');dom.window.close();}
});

test('loader switching preserves its live container and default artwork, never replacing explicit previews',()=>{
 applyLoadingStyle('wordmark');
 const dom=new JSDOM('<body><div class="active">'+loadingLogo()+'</div>'+loadingLogo('wordmark')+loadingLogo('pulse')+loadingLogo('dots')+'</body>'),doc=dom.window.document;
 try{
  const live=doc.querySelector('.active .loading-brand'),previews=[...doc.querySelectorAll('[data-loading-preview]')],before=previews.map(el=>el.outerHTML);
  assert.equal(live.querySelectorAll('.loading-wordmark-piece').length,9);assert.equal(live.querySelectorAll('.loading-dots i').length,3);live.dataset.purpose='kept';
  applyLoadingStyle('pulse',doc);assert.equal(doc.querySelector('.active .loading-brand'),live);assert.equal(live.dataset.purpose,'kept');assert.equal(live.querySelectorAll('.loading-wordmark-pulse').length,1);assert.equal(live.querySelector('.loading-wordmark').getAttribute('aria-label'),'KataKecil');
  const piece=live.firstElementChild;applyLoadingStyle('pulse',doc);assert.equal(live.firstElementChild,piece,'same style does not restart the animation');
  applyLoadingStyle('dots',live);assert.equal(live.querySelectorAll('.loading-dots i').length,3);assert.equal(live.querySelector('.loading-wordmark'),null);assert.match(loadingLogo(),/data-loading-style="dots"/);assert.deepEqual(previews.map(el=>el.outerHTML),before);
  applyLoadingStyle('wordmark',doc);assert.equal(live.querySelectorAll('.loading-wordmark-piece').length,9);assert.equal(live.querySelectorAll('.loading-dots i').length,3);
 }finally{applyLoadingStyle('wordmark');dom.window.close();}
});

test('saved visual choices initialize renderers before any Store or document exists',async()=>{
 const original=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 try{
  Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>'{"iconPack":"lucide","loadingStyle":"pulse"}'}});
  const icons=await import('../dist/ui.js?initial-visual-preferences'),loaders=await import('../dist/loading-logo.js?initial-visual-preferences');
  assert.match(icons.icon('systemTheme'),/data-icon-pack="lucide"/);assert.match(loaders.loadingLogo(),/data-loading-style="pulse"/);
 }finally{if(original)Object.defineProperty(globalThis,'localStorage',original);else delete globalThis.localStorage;}
});
