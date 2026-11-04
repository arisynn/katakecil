// Read-only local verification of publication snapshots downloaded into a temporary directory.
import {readFile} from 'node:fs/promises';
import {JSDOM} from 'jsdom';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import path from 'node:path';
import assert from 'node:assert/strict';
const dir=process.argv[2];if(!dir)throw Error('Supply a local temporary directory containing manifest.json and EPUB snapshots.');
const dom=new JSDOM('');globalThis.DOMParser=dom.window.DOMParser;
const m={exports:{}};runInNewContext(await readFile('dist/vendor/jszip.min.js','utf8'),{module:m,exports:m.exports,require:createRequire(import.meta.url),setTimeout,clearTimeout,setImmediate,Buffer,Uint8Array,ArrayBuffer,Promise});globalThis.JSZip=m.exports;
const {parseEpub}=await import('../dist/epub.js');const {paginateToFit}=await import('../dist/pagination.js');
const report=[];
for(const book of JSON.parse(await readFile(path.join(dir,'manifest.json'),'utf8'))){
 const parsed=await parseEpub(await readFile(path.join(dir,book.id+'.epub')));assert.ok(parsed.chapters.length);
 assert.ok(parsed.chapters.every(c=>book.sectionIds.some(id=>c.href.split('/').at(-1)==='section-'+id+'.xhtml')),'Only IDs from the published catalog enter the reader');
 const pages=await paginateToFit(parsed.chapters,text=>text.length<=1400);
 for(const [i,ch] of parsed.chapters.entries())assert.equal(pages.filter(p=>p.chapterIndex===i).map(p=>p.text).join(''),ch.text);
 report.push({id:book.id,publishedSections:book.sectionIds.length,readableChapters:parsed.chapters.length,characters:parsed.chapters.reduce((n,c)=>n+c.text.length,0),pagesAt1400Characters:pages.length,revisionHeaderVerified:book.verifiedHeader});
}
console.log(JSON.stringify(report,null,2));
