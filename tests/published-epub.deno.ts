import {makeEpub} from '../supabase/functions/katakecil-reader/epub.ts';
import {unzipSync,strFromU8} from 'fflate';
function assert(value:unknown,message:string){if(!value)throw Error(message);}
Deno.test('published EPUB embeds the selected cover and semantic title page while removing executable/external content',()=>{
 const id='00000000-0000-4000-8000-000000000001';
 const bytes=makeEpub({id:'test',title:'Title',author:'Writer',language:'id'},[{id,title:'Halaman Judul',content_html:'<section class="title-panel" epub:type="titlepage"><h1>Title</h1><p>Writer</p></section><script>alert(1)</script><img src="https://private.invalid/hidden"/><p onclick="alert(2)">Readable.</p>'},{id:'00000000-0000-4000-8000-000000000002',title:'Title',content_html:'<img src="data:image/png;base64,AQID"/>'}],{bytes:new Uint8Array([1,2,3]),mime:'image/webp',extension:'webp'});
 const files=unzipSync(bytes),opf=strFromU8(files['OEBPS/content.opf']),page=strFromU8(files['OEBPS/section-'+id+'.xhtml']);
 assert(!strFromU8(files['OEBPS/section-00000000-0000-4000-8000-000000000002.xhtml']).includes('base64'),'cover duplicated inside a section');assert(opf.includes('linear="no"'),'duplicate cover page still in linear reading');
 assert(opf.includes('properties="cover-image"'),'EPUB cover metadata missing');assert(files['OEBPS/cover.webp'].join(',')==='1,2,3','wrong cover bytes');assert(page.includes('epub:type="titlepage"')&&page.includes('class="title-panel"'),'title page semantics lost');assert(!/alert|onclick|private\.invalid|<script/.test(page),'unsafe source escaped sanitization');assert(page.includes('Readable.'),'published paragraph lost');
});
