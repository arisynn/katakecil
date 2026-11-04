import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installGlassTabs} from '../dist/glass-tabs.js';
test('one noninteractive lens tracks existing tabs through state, locale and resize changes',async()=>{
 const w=new JSDOM('<body><nav class="appearance-tabs"><button class="active" aria-selected="true">Text</button><button aria-selected="false">Layout</button><button aria-selected="false">Theme</button></nav></body>',{pretendToBeVisual:true}).window;
 const callbacks=[];w.requestAnimationFrame=fn=>{callbacks.push(fn);return callbacks.length;};w.cancelAnimationFrame=()=>{};let resize;w.ResizeObserver=class{constructor(callback){resize=callback;}observe(){}unobserve(){}disconnect(){}};
 const nav=w.document.querySelector('nav'),buttons=[...nav.children];let width=100;nav.getBoundingClientRect=()=>({left:10,top:20,width:width*3});for(const [i,button]of buttons.entries())button.getBoundingClientRect=()=>({left:10+i*width,top:24,width,height:36});const flush=async()=>{await Promise.resolve();for(let i=0;i<5&&callbacks.length;i++){const batch=callbacks.splice(0);for(const fn of batch)fn();await Promise.resolve();}};
 const controller=installGlassTabs(w.document);await flush();const lens=nav.querySelector('.glass-tab-lens');assert.equal(nav.querySelectorAll('button').length,3);assert.equal(lens.getAttribute('aria-hidden'),'true');assert.equal(nav.style.getPropertyValue('--lens-w'),'100px');assert.equal(nav.style.getPropertyValue('--lens-x'),'0px');
 buttons[0].classList.remove('active');buttons[0].setAttribute('aria-selected','false');buttons[2].classList.add('active');buttons[2].setAttribute('aria-selected','true');await flush();assert.equal(nav.querySelector('.glass-tab-lens'),lens);assert.equal(nav.style.getPropertyValue('--lens-x'),'200px');
 buttons[0].textContent='Teks';w.document.documentElement.lang='id';width=80;resize();await flush();assert.equal(nav.style.getPropertyValue('--lens-w'),'80px');assert.equal(nav.querySelectorAll('.glass-tab-lens').length,1);
 nav.remove();await flush();controller.destroy();assert.equal(nav.querySelector('.glass-tab-lens'),null);w.close();
});
