import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {installBackNavigation} from '../dist/platform.js';
const wait=()=>new Promise(resolve=>setTimeout(resolve,35));
test('browser Back dismisses picker, dialog and reader in order, then leaves no app history guard',async()=>{
 const dom=new JSDOM('',{url:'https://reader.example/'}),w=dom.window;
 const layers=['reader'],visited=[];
 const nav=installBackNavigation({window:w,canGoBack:()=>layers.length>0,back:()=>visited.push(layers.pop())});
 nav.sync();assert.equal(w.history.length,2);
 layers.push('dialog','picker');nav.sync();assert.equal(w.history.length,2);
 w.history.back();await wait();assert.deepEqual(visited,['picker']);
 w.history.back();await wait();assert.deepEqual(visited,['picker','dialog']);
 w.history.back();await wait();assert.deepEqual(visited,['picker','dialog','reader']);
 assert.equal(w.history.state,null);nav.destroy();w.close();
});
test('returning to Library by a button consumes the guard without running another back action',async()=>{
 const dom=new JSDOM('',{url:'https://reader.example/'}),w=dom.window;let open=true,calls=0;
 const nav=installBackNavigation({window:w,canGoBack:()=>open,back:()=>calls++});
 nav.sync();open=false;nav.sync();await wait();assert.equal(calls,0);assert.equal(w.history.state,null);
 open=true;nav.sync();nav.back();assert.equal(calls,1);nav.destroy();w.close();
});
test('native Back uses the same layer handler without inserting browser history',()=>{
 const dom=new JSDOM('',{url:'https://localhost/'}),w=dom.window;let calls=0;
 const nav=installBackNavigation({window:w,native:true,canGoBack:()=>true,back:()=>calls++});
 nav.sync();nav.back();assert.equal(calls,1);assert.equal(w.history.length,1);nav.destroy();w.close();
});
test('a reload at a guarded entry removes its old app entry without dismissing newly mounted UI',async()=>{
 const dom=new JSDOM('',{url:'https://reader.example/'}),w=dom.window;let calls=0;
 w.history.pushState({katakecilBack:true},'');
 const nav=installBackNavigation({window:w,canGoBack:()=>false,back:()=>calls++});
 await wait();assert.equal(w.history.state,null);assert.equal(calls,0);nav.destroy();w.close();
});
