import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {translatePhrase,setUiLanguage,localizeUI,getUiLanguage} from '../dist/i18n.js';
test('UI language switches in place while EPUB headings, prose, and personal notes stay original',()=>{
 const w=new JSDOM('<h1>Pengaturan</h1><button aria-label="Halaman 3 dari 12">Lanjutkan membaca</button><div data-book-content lang="id">Pengaturan dan Catatan adalah bagian cerita.</div><blockquote data-book-content>Catatan</blockquote><p class="note-text" data-book-content>Tampilan</p><textarea placeholder="Tulis di sini…">Catatan</textarea>').window;
 globalThis.document=w.document;const prose=w.document.querySelector('[data-book-content]'),original=prose.textContent,note=w.document.querySelector('textarea');
 setUiLanguage('en');assert.equal(w.document.documentElement.lang,'en');assert.equal(w.document.querySelector('h1').textContent,'Settings');assert.equal(w.document.querySelector('button').textContent,'Continue reading');assert.equal(w.document.querySelector('button').getAttribute('aria-label'),'Page 3 of 12');assert.equal(prose.textContent,original);assert.equal(prose.lang,'id');assert.equal(w.document.querySelector('blockquote').textContent,'Catatan');assert.equal(note.value,'Catatan');assert.equal(note.placeholder,'Write here…');
 setUiLanguage('id');assert.equal(w.document.querySelector('h1').textContent,'Pengaturan');assert.equal(note.placeholder,'Tulis di sini…');assert.equal(prose.textContent,original);setUiLanguage('en');assert.equal(w.document.querySelector('h1').textContent,'Settings');localizeUI(w.document.body);assert.equal(note.value,'Catatan');setUiLanguage('unsupported');assert.equal(getUiLanguage(),'en');
});
test('dynamic app labels retain book titles verbatim and whitespace stays stable',()=>{
 assert.equal(translatePhrase('Baca Pengaturan','en'),'Read Pengaturan');assert.equal(translatePhrase('Buku 2: Catatan','en'),'Book 2: Catatan');assert.equal(translatePhrase('47% dibaca','en'),'47% read');assert.equal(translatePhrase('  Tampilan ','en'),'  Appearance ');assert.equal(translatePhrase('  ','en'),'  ');
 assert.equal(translatePhrase('Encrypted or DRM-protected EPUBs are not supported. Please use a DRM-free edition.','id'),'EPUB terenkripsi atau dengan DRM belum didukung. Gunakan edisi tanpa DRM.');
});
