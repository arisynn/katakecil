import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {leaveSheet,enterSheet} from '../dist/motion.js';
import {fitSheet} from '../dist/panel-layout.js';
test('sheet removal waits for animations and repeated close requests share one completion',async()=>{
 const dom=new JSDOM('<div id="layer"><section class="dialog"></section></div>'),w=dom.window,layer=w.document.querySelector('#layer'),pending=[];
 w.Element.prototype.animate=()=>{let resolve;const finished=new Promise(r=>resolve=r);pending.push(resolve);return{finished,cancel:resolve};};
 let removed=0;enterSheet(layer);const done=leaveSheet(layer,()=>{removed++;layer.remove();});assert.equal(leaveSheet(layer,()=>assert.fail('duplicate cleanup')),done);assert.equal(removed,0);assert.equal(layer.inert,true);for(const resolve of pending)resolve();await done;assert.equal(removed,1);assert.equal(layer.isConnected,false);w.close();
});
test('reduced motion removes a sheet immediately',async()=>{
 const dom=new JSDOM('<div id="layer"></div>'),w=dom.window,layer=w.document.querySelector('div');w.matchMedia=()=>({matches:true});layer.animate=()=>assert.fail('reduced motion must not animate');let removed=false;await leaveSheet(layer,()=>{removed=true;});assert.equal(removed,true);w.close();
});
test('short overflow borrows space while long content and keyboard constraints keep a scroll body',()=>{
 const dom=new JSDOM('<div style="padding:12px"><section class="dialog"><div class="dialog-body"></div></section></div>'),w=dom.window,sheet=w.document.querySelector('section'),body=sheet.firstChild;w.innerHeight=700;sheet.getBoundingClientRect=()=>({height:430});body.getBoundingClientRect=()=>({height:350});let natural=380;Object.defineProperty(body,'scrollHeight',{get:()=>natural});
 fitSheet(sheet);assert.equal(sheet.style.getPropertyValue('--sheet-content-limit'),'380px');assert.equal(sheet.dataset.scrollable,'false');natural=900;fitSheet(sheet);assert.equal(sheet.style.getPropertyValue('--sheet-content-limit'),'350px');assert.equal(sheet.dataset.scrollable,'true');w.visualViewport={height:340};fitSheet(sheet);assert.equal(sheet.style.getPropertyValue('--sheet-content-limit'),'228px');w.close();
});
