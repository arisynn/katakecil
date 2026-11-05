import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';
import {JSDOM} from 'jsdom';
import {parseEpub} from '../dist/epub.js';
import {privateEditionPath} from '../supabase/functions/katakecil-reader/completed.ts';
import {readCover} from '../supabase/functions/katakecil-reader/cover.ts';
const w=new JSDOM('').window;globalThis.DOMParser=w.DOMParser;
const vendor={exports:{}};runInNewContext(await readFile(new URL('../dist/vendor/jszip.min.js',import.meta.url),'utf8'),{module:vendor,exports:vendor.exports,setTimeout,clearTimeout,setImmediate,Uint8Array,ArrayBuffer,Buffer,Promise});globalThis.JSZip=vendor.exports;
async function fixture(pages,nav){
 const zip=new JSZip();zip.file('mimetype','application/epub+zip');zip.file('META-INF/container.xml','<container><rootfile full-path="OPS/book.opf"/></container>');
 zip.file('OPS/book.opf',`<package xmlns:dc="urn:dc"><metadata><dc:title>Book</dc:title><dc:creator>Writer</dc:creator><dc:language>id</dc:language></metadata><manifest>${pages.map((p,i)=>`<item id="s${i}" href="${p.name}" media-type="application/xhtml+xml"/>`).join('')}<item id="nav" href="nav.xhtml" properties="nav" media-type="application/xhtml+xml"/></manifest><spine>${pages.map((_,i)=>`<itemref idref="s${i}"/>`).join('')}</spine></package>`);
 zip.file('OPS/nav.xhtml',nav);for(const page of pages)zip.file('OPS/'+page.name,'<html><body>'+page.html+'</body></html>');return zip.generateAsync({type:'uint8array'});
}
test('Roman arc dividers and chapter ranges group narrative chapters without synopsis/title/range pages',async()=>{
 const pages=[{name:'section-front.xhtml',label:'Halaman Judul & Sinopsis',html:'<h1>Book</h1><p>Writer</p><h2>Sinopsis</h2><p>Not narrative.</p>'},{name:'arc-one.xhtml',label:'Arc I — Pergi',html:'<p>Arc I</p><h1>Pergi</h1><p>Episode 1 – 2</p>'},{name:'one.xhtml',label:'Pertemuan',html:'<h1>Pertemuan</h1><p>Teks satu.</p>'},{name:'two.xhtml',label:'Percakapan',html:'<h1>Percakapan</h1><p>Teks dua.</p>'},{name:'arc-two.xhtml',label:'Arc II — Kembali',html:'<p>Arc II</p><h1>Kembali</h1><p>Episode 3 – 3</p>'},{name:'three.xhtml',label:'Rumah',html:'<h1>Rumah</h1><p>Teks tiga.</p>'}];
 const book=await parseEpub(await fixture(pages,'<nav epub:type="toc"><ol>'+pages.map(p=>`<li><a href="${p.name}">${p.label}</a></li>`).join('')+'</ol></nav>'));
 assert.deepEqual(book.chapters.map(c=>c.title),['Pertemuan','Percakapan','Rumah']);assert.deepEqual(book.chapters.map(c=>c.text),['Teks satu.','Teks dua.','Teks tiga.']);assert.deepEqual(book.chapters.map(c=>c.chapterLabel),['BAB 1','BAB 2','BAB 3']);assert.deepEqual(book.chapters.map(c=>c.arc.label),['ARC I','ARC I','ARC II']);assert.equal(book.chapters[2].arc.title,'Kembali');
});
test('hierarchical EPUB navigation supplies parent arcs and ignores landmark links',async()=>{
 const book=await parseEpub(await fixture([{name:'one.xhtml',html:'<h1>Pertemuan</h1><p>Teks pertama.</p>'},{name:'two.xhtml',html:'<h1>Pulang</h1><p>Teks kedua.</p>'}],'<nav epub:type="landmarks"><a href="one.xhtml">Wrong landmark title</a></nav><nav epub:type="toc"><ol><li><span>Part I — Awal</span><ol><li><a href="one.xhtml">Pertemuan</a></li></ol></li><li><span>Part II — Akhir</span><ol><li><a href="two.xhtml">Pulang</a></li></ol></li></ol></nav>'));
 assert.deepEqual(book.chapters.map(c=>c.arc.label),['ARC I','ARC II']);assert.deepEqual(book.chapters.map(c=>c.chapterLabel),['BAB 1','BAB 2']);assert.equal(book.chapters[0].navigationTitle,'Pertemuan');
});
test('private ready editions are scoped to approved completed books with an exact immutable revision',()=>{
 const book={id:'apa-itu-rumah',status:'completed',revision:'a'.repeat(64),next_release_at:null};assert.match(privateEditionPath(book),/^reader-editions\/apa-itu-rumah\/[a-f0-9]{64}\.epub$/);
 for(const change of [{id:'garis-yang-kita-teruskan-karisyono-final-45-bab'},{status:'ongoing'},{next_release_at:'2027-01-01'},{revision:'../private'}])assert.equal(privateEditionPath({...book,...change}),null);
});
test('EPUB cover fetching rejects arbitrary hosts, private Storage paths and oversized data',async()=>{
 const project='https://project.supabase.co',unexpected=()=>assert.fail('unapproved URL fetched');
 for(const url of ['https://example.com/image.png',project+'/storage/v1/object/kk-sources/private.epub','http://katakecil.vercel.app/assets/covers/image.png'])assert.equal(await readCover(url,project,unexpected),null);
 const image=await readCover('data:image/png;base64,AQID',project,unexpected);assert.deepEqual([...image.bytes],[1,2,3]);assert.equal(image.extension,'png');
});
