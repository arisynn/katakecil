import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {icon,applyIconPack} from '../dist/ui.js';
import {KATAKECIL_ICONS} from '../dist/katakecil-icons.js';
import {KATAKECIL_NEW_OUTLINE,KATAKECIL_NEW_SOLID} from '../dist/katakecil-new-icons.js';
import {normalizeVisualPreferences,VISUAL_DEFAULTS} from '../dist/visual-preferences.js';
import {createBackup,parseBackup} from '../dist/device-backup.js';
import {createVisualSettings} from '../dist/loading-previews.js';

test('all 52 outline/solid pairs preserve the supplied SVG geometry and root inheritance',async()=>{
 assert.deepEqual(Object.keys(KATAKECIL_NEW_OUTLINE),Object.keys(KATAKECIL_ICONS));assert.deepEqual(Object.keys(KATAKECIL_NEW_SOLID),Object.keys(KATAKECIL_ICONS));
 for(const name of Object.keys(KATAKECIL_ICONS))for(const variant of ['outline','solid']){
  const svg=await readFile(new URL('../dist/assets/icons/katakecil-new/'+variant+'/'+name+'.svg',import.meta.url),'utf8');
  const source=new JSDOM(svg,{contentType:'image/svg+xml'}),rendered=new JSDOM(icon(name,'','katakecil-new'));
  try{
   const expected=source.window.document.documentElement,group=rendered.window.document.querySelector('[data-icon-state='+variant+']>g');
   assert.equal(group.getAttribute('fill'),expected.getAttribute('fill'),name);assert.equal(group.getAttribute('stroke'),expected.getAttribute('stroke')||'none',name);assert.equal(group.getAttribute('stroke-width'),expected.getAttribute('stroke-width')||'1',name);
   assert.equal(group.children.length,expected.children.length,name);assert.ok([...group.children].every((node,i)=>node.isEqualNode(expected.children[i])),name+' '+variant);
  }finally{source.window.close();rendered.window.close();}
 }
});

test('new pack selection preserves SVG nodes, button state, listeners and explicit previews',()=>{
 applyIconPack('lucide');const dom=new JSDOM('<button aria-pressed="true">'+icon('bookmark')+'</button>'+icon('bookOpen','preview','lucide'));
 try{
  const doc=dom.window.document,svg=doc.querySelector('button svg'),button=svg.parentElement,preview=doc.querySelector('.preview'),before=preview.outerHTML;let clicks=0;
  svg.setAttribute('aria-label','Kept');svg.addEventListener('click',()=>clicks++);applyIconPack('katakecil-new',doc);
  assert.equal(doc.querySelector('button svg'),svg);assert.equal(svg.querySelectorAll('[data-icon-state]').length,2);assert.equal(svg.dataset.iconPack,'katakecil-new');assert.equal(svg.getAttribute('aria-label'),'Kept');assert.equal(button.getAttribute('aria-pressed'),'true');
  svg.dispatchEvent(new dom.window.Event('click'));assert.equal(clicks,1);const outline=svg.firstElementChild;applyIconPack('katakecil-new',doc);assert.equal(svg.firstElementChild,outline);assert.equal(preview.outerHTML,before);
  applyIconPack('katakecil',doc);assert.equal(svg.querySelector('[data-icon-state]'),null);assert.equal(svg.style.strokeWidth,'1.85');
 }finally{applyIconPack('katakecil');dom.window.close();}
});

test('new pack is an explicit preference and survives backup without changing existing defaults',()=>{
 assert.equal(VISUAL_DEFAULTS.iconPack,'katakecil');for(const iconPack of ['katakecil','lucide','katakecil-new'])assert.equal(normalizeVisualPreferences({iconPack}).iconPack,iconPack);
 const backup=createBackup({preferences:{iconPack:'katakecil-new'},annotations:[],progress:{}});assert.equal(parseBackup(JSON.stringify(backup)).preferences.iconPack,'katakecil-new');
});

test('picker exposes the new family as a candidate and applies it only on Use',()=>{
 applyIconPack('katakecil');const dom=new JSDOM('<main>'+icon('bookOpen','live')+'</main><div id="overlay"></div>'),doc=dom.window.document;let prefs={iconPack:'katakecil',loadingStyle:'pulse'},writes=[];
 const sheet=createVisualSettings({document:doc,prefs:()=>prefs,heading:title=>'<h2>'+title+'</h2>',show:html=>doc.querySelector('#overlay').innerHTML='<section class="dialog">'+html+'</section>',save:change=>{writes.push(change);prefs={...prefs,...change};},apply:()=>applyIconPack(prefs.iconPack,doc)});
 const action=(name,value,key)=>sheet.action({dataset:{action:name,value,visualKey:key}});
 try{
  action('loading-previews');assert.equal(doc.querySelectorAll('[data-visual-key=iconPack]').length,3);action('visual-candidate','katakecil-new','iconPack');assert.deepEqual(writes,[]);assert.equal(doc.querySelector('.live').dataset.iconPack,'katakecil');
  action('visual-use');assert.deepEqual(writes,[{iconPack:'katakecil-new'}]);assert.equal(doc.querySelector('.live').dataset.iconPack,'katakecil-new');assert.equal(prefs.loadingStyle,'pulse');assert.equal(doc.querySelector('[data-value=katakecil-new]').getAttribute('aria-pressed'),'true');
 }finally{applyIconPack('katakecil');dom.window.close();}
});
