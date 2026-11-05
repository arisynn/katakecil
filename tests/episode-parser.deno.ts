import {parseEdition} from '../supabase/functions/katakecil-reader/edition.ts';
function assert(value:unknown,message:string){if(!value)throw Error(message);}
Deno.test('server reuses the inert EPUB parser, preserving episode text, headings, arc and source UUIDs',async()=>{
 const ids=Array.from({length:4},(_,i)=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
 const book={id:'fixture',title:'Novel',author:'Writer',language:'id',revision:'a'.repeat(64),section_ids:ids};
 const chapters=await parseEdition(book,[
  {id:ids[0],title:'Halaman Judul',content_html:'<section epub:type="titlepage"><h1>Novel</h1><p>Writer</p></section>'},
  {id:ids[1],title:'Arc I — Mulai',content_html:'<h1>Arc I — Mulai</h1><p>Bab 1–2</p>'},
  {id:ids[2],title:'Pagi',content_html:'<h1>Bab 1 — Pagi</h1><p>Paragraf pertama 🙂.</p><p>Paragraf kedua.</p><script>private()</script><iframe src="https://private.invalid"/>'},
  {id:ids[3],title:'Malam',content_html:'<h1>Bab 2 — Malam</h1><p>Episode berikutnya.</p>'}
 ]);
 assert(chapters.length===2,'front/arc divider became a narrative episode');
 assert(chapters[0].text==='Paragraf pertama 🙂.\n\nParagraf kedua.','normalization changed');
 assert(chapters[0].chapterLabel==='BAB 1'&&chapters[0].title==='Pagi','heading changed');
 assert(chapters[1].arc?.label==='ARC I','arc lost');assert(chapters[0].href==='OEBPS/section-'+ids[2]+'.xhtml','source identity changed');
 assert(/^[a-f0-9]{64}$/.test(chapters[0].contentHash),'source hash missing');
 assert(!JSON.stringify(chapters).includes('private'),'executable/external source included');
});
