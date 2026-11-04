// Source-level comparison using the owner's downloaded EPUBs; not a browser screenshot test.
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {parseEpub} from '../dist/epub.js';
import {paginateToFit} from '../dist/pagination.js';
import {execFileSync} from 'node:child_process';
const baseline=execFileSync('git',['show','4393315c0b483b0894c9bfb4f565335cb132de1a:dist/pagination.js'],{encoding:'utf8'});
const {paginateToFit:beforePagination}=await import('data:text/javascript;base64,'+Buffer.from(baseline).toString('base64'));
const window=new JSDOM('').window;globalThis.DOMParser=window.DOMParser;
const zip={exports:{}};runInNewContext(await readFile(new URL('../dist/vendor/jszip.min.js',import.meta.url),'utf8'),{module:zip,exports:zip.exports,require:createRequire(import.meta.url),setTimeout,clearTimeout,setImmediate,Buffer,Uint8Array,ArrayBuffer,Promise});globalThis.JSZip=zip.exports;
for(const id of ['masa-panen-google-play-ready-1','garis-yang-kita-teruskan-karisyono-final-45-bab']){
 const book=await parseEpub(await readFile('/tmp/lumina-'+id+'.epub'));
 const before=await beforePagination(book.chapters,text=>text.length<=1200),after=await paginateToFit(book.chapters,text=>text.length<=1200);
 const report=pages=>{const full=pages.filter(page=>page.end<book.chapters[page.chapterIndex].text.length);return {pages:pages.length,averageBodyPageFill:Math.round(full.reduce((sum,page)=>sum+page.text.length/1200,0)/full.length*100),bodyPagesBelow80Percent:full.filter(p=>p.text.length<960).length};};
 console.log(JSON.stringify({title:book.title,firstTitle:book.chapters[0].title,generatedSectionTitles:book.chapters.filter(c=>/^Section\s+\d/i.test(c.title)).length,before:report(before),after:report(after)}));
}
