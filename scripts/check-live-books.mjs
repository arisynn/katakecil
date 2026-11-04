import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {createRequire} from 'node:module';
import {JSDOM} from 'jsdom';
import {parseEpub} from '../dist/epub.js';
const w=new JSDOM('').window;globalThis.DOMParser=w.DOMParser;
const zip={exports:{}};runInNewContext(await readFile(new URL('../dist/vendor/jszip.min.js',import.meta.url),'utf8'),{module:zip,exports:zip.exports,require:createRequire(import.meta.url),setTimeout,clearTimeout,setImmediate,Buffer,Uint8Array,ArrayBuffer,Promise});globalThis.JSZip=zip.exports;
const catalog=JSON.parse(await readFile('/tmp/lumina-live-catalog.json','utf8'));
for(const entry of catalog.books){const buffer=await readFile('/tmp/lumina-'+entry.id+'.epub');const book=await parseEpub(buffer,entry.title);console.log(JSON.stringify({title:book.title,chapters:book.chapters.length,characters:book.chapters.reduce((n,c)=>n+c.text.length,0),firstChapter:book.chapters[0].title,chapterLabel:book.chapters[0].chapterLabel}));}
