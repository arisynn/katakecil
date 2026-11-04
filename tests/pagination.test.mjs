import {test} from 'node:test';
import assert from 'node:assert/strict';
import {paginateToFit} from '../dist/pagination.js';
test('measured pagination preserves full text including short chapters and astral characters',async()=>{
 const chapters=[{text:'Awal yang singkat.'},{text:('Kalimat satu. Kalimat dua. 🌱\n\n').repeat(100)}];
 const pages=await paginateToFit(chapters,(text,index,first)=>text.length<=(first?65:110));
 for(let i=0;i<chapters.length;i++)assert.equal(pages.filter(p=>p.chapterIndex===i).map(p=>p.text).join(''),chapters[i].text);
 for(const page of pages){assert.ok(page.text.length<=(page.start===0?65:110));assert.ok(!/^[\uDC00-\uDFFF]/.test(page.text));assert.ok(!/[\uD800-\uDBFF]$/.test(page.text));}
 assert.equal(pages[0].text,chapters[0].text);
});
test('pagination can be cancelled and reports impossible layouts without clipping text',async()=>{
 assert.equal(await paginateToFit([{text:'test'}],()=>true,undefined,()=>true),null);
 await assert.rejects(()=>paginateToFit([{text:'test'}],()=>false),/teks terlalu besar/);
});

test('a paragraph ending at 61% of a page does not leave the other 39% empty',async()=>{
 const text='A'.repeat(610)+'\n\n'+('next words ').repeat(200);
 const pages=await paginateToFit([{text}],value=>value.length<=1000);
 assert.ok(pages[0].text.length>=970,`First page uses ${pages[0].text.length} of 1000 characters`);
 assert.equal(pages.map(p=>p.text).join(''),text);
});
