import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeAnchor,resolveAnchor,migrateLegacyAnchor,findMatches,readingStats,sentences,readerSettings,contrast,spreadEnabled,findPage,normalizePublishedCatalog,fetchPublishedBook,ReadAloud,ReadingWakeLock,dictionaryLookup,translateSelection} from '../dist/advanced-reader.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const chapter={href:'section-one.xhtml',text:'Rain on the roof. A quiet room. Rain on the roof. Another day.'};

test('open-source quote anchors use context, survive changed offsets, and stay in their episode',()=>{
 const start=chapter.text.lastIndexOf('Rain'),anchor=makeAnchor(chapter,start,start+17);
 assert.equal(anchor.exact,'Rain on the roof.');assert.ok(anchor.prefix);assert.ok(anchor.suffix);
 assert.deepEqual(resolveAnchor([{...chapter,text:'A new foreword. '+chapter.text}],anchor),{chapterIndex:0,start:start+16,end:start+33});
 assert.equal(resolveAnchor([{...chapter,href:'another-episode'}],anchor),null);
 const duplicated={...chapter,text:'same '.repeat(80)},repeated=makeAnchor(duplicated,100,104);assert.equal(resolveAnchor([duplicated],repeated),null);
 assert.equal(resolveAnchor([{...chapter,text:chapter.text.replaceAll('Rain','Hail')}],anchor),null,'fuzzy matches are never silently highlighted');
 assert.throws(()=>makeAnchor(chapter,4,4));assert.throws(()=>makeAnchor({text:'x'.repeat(5000)},0,4500));
});

test('one-time old EPUB anchor migration requires a unique exact contextual quotation',()=>{
 const anchor=makeAnchor(chapter,18,31),published={...chapter,href:'section-new-uuid.xhtml'};
 assert.deepEqual(migrateLegacyAnchor([published],anchor),{chapterIndex:0,start:18,end:31});
 assert.equal(migrateLegacyAnchor([published,published],anchor),null);
 assert.equal(migrateLegacyAnchor([{...published,text:'Other contents.'}],anchor),null);
});

test('literal search handles regex punctuation, Unicode offsets, sentences, and bounded result lists',()=>{
 assert.deepEqual(findMatches('A+B, a+b, aab','a+b').matches,[{start:0,end:3},{start:5,end:8}]);
 const result=findMatches('🙂 Café. CAFÉ.','café');assert.deepEqual(result.matches,[{start:3,end:7},{start:9,end:13}]);
 assert.equal(findMatches('A quiet room. The quiet room.','quiet room.').total,2);
 const many=findMatches('x '.repeat(2000),'x',50);assert.equal(many.total,2000);assert.equal(many.matches.length,50);assert.equal(many.truncated,true);
 assert.equal(findMatches('x','').total,0);assert.equal(findMatches('x','a'.repeat(201)).total,0);
});

test('reading settings clamp invalid layout values and gate spreads at adequate screen widths',()=>{
 const d=readerSettings({fontSize:99,lineHeight:0,marginHorizontal:-1,brightness:0,fontWeight:'oops',customTextColor:'url(evil)',readingMode:'bad'});
 assert.equal(d.fontSize,32);assert.equal(d.lineHeight,1.2);assert.equal(d.marginHorizontal,12);assert.equal(d.fontWeight,400);assert.equal(d.brightness,50);assert.equal(d.readingMode,'pages');assert.equal(d.customTextColor,'#28302b');
 assert.ok(contrast('#28302b','#faf9f5')>4.5);assert.equal(contrast('#ffffff','#ffffff'),1);
 for(const width of [320,375,390,430,768,999])assert.equal(spreadEnabled({spreadMode:'double',readingMode:'pages'},width),false);
 for(const width of [1000,1024,1440])assert.equal(spreadEnabled({spreadMode:'double',readingMode:'pages'},width),true);
 assert.equal(spreadEnabled({spreadMode:'double',readingMode:'scroll'},1440),false);
 assert.equal(findPage([{chapterIndex:2,start:0,end:100},{chapterIndex:2,start:100,end:200}],2,130),1);assert.equal(findPage([],1,0),-1);
});

test('word counts and bounded speech segments use source-language text without rewriting it',()=>{
 assert.deepEqual(readingStats('One two three.','en'),{words:3,minutes:1});
 assert.equal(readingStats('','id').words,0);
 const text='First sentence. '+('A long sentence 🙂 '.repeat(45))+'Last sentence.';
 const chunks=sentences(text,'en');assert.ok(chunks.length>3);assert.ok(chunks.every(s=>s.text.length<=240));
 for(const chunk of chunks){assert.equal(text.slice(chunk.start,chunk.end),chunk.text);assert.ok(!/[\uD800-\uDBFF]$/.test(chunk.text));}
});

const uuid='00000000-0000-4000-8000-000000000001';
const metadata={id:'book-one',title:'Published book',author:'Owner',revision:'a'.repeat(64),section_ids:[uuid],cover_url:'javascript:alert(1)'};
test('secure source ignores source URLs, excludes empty publications and rejects malformed identities',()=>{
 const books=normalizePublishedCatalog({books:[{...metadata,url:'https://evil.example/manuscript.epub'},{...metadata,id:'empty-book',section_ids:[]}]});
 assert.equal(books.length,1);assert.equal(books[0].cover,'');assert.ok(books[0].url.startsWith('https://hrbcwymdqigtfmpmsdsi.supabase.co/functions/v1/katakecil-reader?'));
 assert.equal(new URL(books[0].url).searchParams.get('revision'),metadata.revision);
 assert.throws(()=>normalizePublishedCatalog({books:[metadata,metadata]}));
 assert.throws(()=>normalizePublishedCatalog({books:[{...metadata,section_ids:[uuid,uuid]}]}));
 assert.throws(()=>normalizePublishedCatalog({books:[{...metadata,id:'../draft'}]}));
});

test('published fetch fails closed on stale revisions, unavailable content, wrong MIME and oversized responses',async()=>{
 const book=normalizePublishedCatalog({books:[metadata]})[0];let options;
 const bytes=await fetchPublishedBook(book,async(url,init)=>{options=init;return new Response('epub',{headers:{'Content-Type':'application/epub+zip','X-KataKecil-Revision':book.version}});});assert.equal(bytes.byteLength,4);assert.equal(options.credentials,'omit');assert.equal(options.cache,'no-store');assert.equal(options.redirect,'error');
 for(const response of [new Response('draft',{status:404}),new Response('changed',{status:409}),new Response('bad',{headers:{'Content-Type':'application/epub+zip','X-KataKecil-Revision':'b'.repeat(64)}}),new Response('bad',{headers:{'Content-Type':'text/html','X-KataKecil-Revision':book.version}}),new Response('large',{headers:{'Content-Type':'application/epub+zip','X-KataKecil-Revision':book.version,'Content-Length':String(31*1024*1024)}})])await assert.rejects(()=>fetchPublishedBook(book,async()=>response));
});

test('translation sends only explicit selected text and rejects oversized selections before a request',async()=>{
 let calls=[];const fetcher=async(url,options)=>{calls.push({url:new URL(url),options});return Response.json({responseStatus:200,responseData:{translatedText:'Hello.'}});};
 const signal=new AbortController().signal;
 assert.equal((await translateSelection('Halo.','id','en',signal,fetcher)).text,'Hello.');assert.equal(calls[0].url.searchParams.get('q'),'Halo.');assert.equal(calls[0].options.credentials,'omit');
 await assert.rejects(()=>translateSelection('x'.repeat(451),'id','en',signal,fetcher));await assert.rejects(()=>translateSelection('Hi','en','en',signal,fetcher));assert.equal(calls.length,1);
 await assert.rejects(()=>translateSelection('Hi','en','id',signal,async()=>Response.json({responseStatus:429})),/limit/);
});

test('dictionary uses one selected word, renders service errors and supports dependency injection',async()=>{
 let url;const result=await dictionaryLookup('rain','en',new AbortController().signal,async u=>{url=u;return Response.json([{meanings:[{partOfSpeech:'noun',definitions:[{definition:'Water falling from clouds.'}]}]}]);});
 assert.ok(url.endsWith('/en/rain'));assert.match(result.text,/Water falling/);
 await assert.rejects(()=>dictionaryLookup('a whole sentence','en',new AbortController().signal));
 await assert.rejects(()=>dictionaryLookup('rain','fr',new AbortController().signal));
 await assert.rejects(()=>dictionaryLookup('rain','en',new AbortController().signal,async()=>new Response('',{status:429})));
});

function speechHarness(){
 const calls=[],pending=[];const voice={voiceURI:'local-en',name:'Local',lang:'en-US',localService:true};
 const driver={init:async()=>true,voices:()=>[voice],speak:options=>new Promise((resolve,reject)=>{calls.push(options);options.start?.();pending.push({resolve,reject});}),pause:()=>calls.push('pause'),resume:()=>calls.push('resume'),cancel:()=>calls.push('cancel')};
 const events=[];const speech=new ReadAloud({change:()=>events.push(speech.state),paragraph:(p,e)=>events.push({paragraph:p,end:e}),position:p=>events.push({position:p}),error:e=>events.push({error:e})},driver);
 return{speech,calls,pending,events};
}
test('TTS speaks whole paragraphs, resumes at native checkpoints and ignores stale callbacks',async()=>{
 const {speech,calls,pending,events}=speechHarness();await speech.play([{text:'First sentence. Next sentence.\n\nSecond paragraph.'}],{chapterIndex:0,charOffset:0},{language:'en',rate:1});
 const first=calls.find(c=>typeof c==='object');assert.equal(first.text,'First sentence. Next sentence.');assert.equal(speech.state,'playing');first.boundary({name:'word',charIndex:6,charLength:8});assert.equal(speech.position.charOffset,6);assert.ok(events.some(e=>e.position?.charOffset===6));assert.equal(events.filter(e=>e.paragraph).length,1);
 speech.pause();assert.equal(speech.state,'paused');speech.resume();assert.equal(speech.state,'playing');assert.ok(calls.filter(c=>typeof c==='object').at(-1).text.startsWith('sentence. Next'));
 speech.stop();first.boundary({name:'word',charIndex:0});pending[0].resolve();await tick();assert.equal(speech.state,'idle');assert.equal(speech.position.charOffset,6);
});

test('TTS automatically advances within the available published chapter list and completes',async()=>{
 const {speech,pending,events}=speechHarness();await speech.play([{text:'First.'},{text:'Second.'}],{chapterIndex:0,charOffset:0},{language:'en',rate:1});pending[0].resolve();await tick();assert.equal(speech.position.chapterIndex,1);assert.ok(events.some(e=>e.paragraph?.chapterIndex===1));pending[1].resolve();await tick();assert.equal(speech.state,'idle');
 const missing=speechHarness();await assert.rejects(()=>missing.speech.play([{text:'Teks.'}],{chapterIndex:0,charOffset:0},{language:'id',rate:1}),/No voice/);
});

test('wake lock releases on exit, rejects unsupported browsers and closes asynchronous request races',async()=>{
 let resolve,releaseCount=0;const sentinel={released:false,release:async()=>{releaseCount++;sentinel.released=true;},addEventListener(){}};
 const wake=new ReadingWakeLock(()=>({request:()=>new Promise(r=>resolve=r)}),()=>true);const acquiring=wake.set(true);await wake.set(false);resolve(sentinel);await acquiring;assert.equal(wake.active,false);assert.equal(releaseCount,1);
 await assert.rejects(()=>new ReadingWakeLock(()=>undefined,()=>true).set(true),/not supported/);
 let visible=true;const second={...sentinel,released:false,release:async()=>{second.released=true;}};const lifecycle=new ReadingWakeLock(()=>({request:async()=>second}),()=>visible);await lifecycle.set(true);assert.equal(lifecycle.active,true);visible=false;await lifecycle.set(true);assert.equal(lifecycle.active,false);
});

test('paragraph layout wrappers retain source offsets and separators without extra text',async()=>{
 const {JSDOM}=await import('jsdom');const {paragraphMarkup}=await import('../dist/reader-experience.js');
 const source='First & <word>.\n\nSecond 🙂 paragraph.\n\n';
 for(let start=0;start<source.length;start+=3){const text=source.slice(start);const dom=new JSDOM('<div>'+paragraphMarkup(text,start,source)+'</div>');assert.equal(dom.window.document.body.textContent,text);dom.window.document.querySelectorAll('.paragraph-break').forEach(n=>n.style.display='none');const sourceRange=dom.window.document.createRange();sourceRange.selectNodeContents(dom.window.document.querySelector('div'));assert.equal(sourceRange.toString(),text,'hidden visual separators retain source offsets');for(const paragraph of dom.window.document.querySelectorAll('.reader-paragraph')){const offset=Number(paragraph.dataset.offset);assert.ok(offset>=start);assert.equal(paragraph.classList.contains('paragraph-start'),offset===0||source.slice(offset-2,offset)==='\n\n','only actual paragraph starts receive indentation, including across page boundaries');}}
});

test('Indonesian dictionary strips resource-bearing markup and returns cited definitions',async()=>{
 const {JSDOM}=await import('jsdom');const dom=new JSDOM('');globalThis.DOMParser=dom.window.DOMParser;
 const result=await dictionaryLookup('hujan','id',new AbortController().signal,async()=>Response.json({parse:{text:{'*':'<script>bad()</script><ol><li><img src="https://tracker.invalid">Air yang turun dari awan.</li><li><b>Curahan</b> air.</li></ol>'}}}));
 assert.match(result.text,/Air yang turun/);assert.ok(!result.text.includes('bad()'));assert.ok(result.url.endsWith('/hujan'));assert.equal(result.license,'CC BY-SA 4.0');
});

test('chapter content hashes keep repeated quotations at exact offsets after layout changes',async()=>{
 const {prepareChapters}=await import('../dist/advanced-reader.js');
 const chapters=await prepareChapters([{href:'repeated.xhtml',text:'The same paragraph. '.repeat(80)}]);
 const anchor=makeAnchor(chapters[0],200,219);assert.ok(anchor.sourceHash);assert.deepEqual(resolveAnchor(chapters,anchor),{chapterIndex:0,start:200,end:219});
 const changed=await prepareChapters([{...chapters[0],text:'New paragraph. '+chapters[0].text}]);assert.equal(resolveAnchor(changed,anchor),null,'changed repeated passages require review');
});

test('concurrent speech initialization shares one device voice request',async()=>{
 let requests=0,finish;const voice={voiceURI:'local-en',name:'Local',lang:'en-US',localService:true};
 const driver={init:()=>{requests++;return new Promise(r=>finish=r);},voices:()=>[voice],speak:async()=>{},pause(){},resume(){},cancel(){}};
 const speech=new ReadAloud({change(){},paragraph(){},error(){}},driver);
 const one=speech.initialize(),two=speech.initialize();assert.equal(requests,1);finish(true);await Promise.all([one,two]);assert.equal(speech.state,'idle');
});

test('TTS speed changes apply during playback without losing the last spoken position',async()=>{
 const {speech,calls}=speechHarness();await speech.play([{text:'First sentence. Next sentence.'}],{chapterIndex:0,charOffset:0},{language:'en',rate:1});
 calls.find(c=>typeof c==='object').boundary({name:'word',charIndex:0,charLength:5});const before=calls.filter(c=>typeof c==='object').at(-1);before.boundary({name:'word',charIndex:0,charLength:5});speech.setRate(1.5);
 const latest=calls.filter(c=>typeof c==='object').at(-1);assert.equal(latest.rate,1.5);assert.ok(latest.text.startsWith('First'));assert.equal(speech.position.charOffset,0);assert.equal(speech.state,'playing');speech.stop();
});

test('voices without boundaries read complete paragraphs without a word fallback',async()=>{
 const {speech,calls,pending,events}=speechHarness();await speech.play([{text:'"Hello," rain fell. Next sentence.\n\nAnother paragraph.'}],{chapterIndex:0,charOffset:0},{language:'en',rate:1});
 assert.equal(calls.filter(c=>typeof c==='object')[0].text,'"Hello," rain fell. Next sentence.');assert.equal(speech.tracking,'paragraph');assert.equal(events.filter(e=>e.paragraph).length,1);pending[0].resolve();await tick();assert.equal(calls.filter(c=>typeof c==='object')[1].text,'Another paragraph.');assert.equal(events.filter(e=>e.paragraph).length,2);speech.stop();
});

test('long paragraph chunks respect the native text limit and retain one paragraph range',async()=>{
 const {speech,calls,pending,events}=speechHarness(),text='A sentence with words. '.repeat(240);await speech.play([{text}],{chapterIndex:0,charOffset:0},{language:'en',rate:1});const first=calls.find(c=>typeof c==='object');assert.ok(first.text.length<=4000);pending[0].resolve();await tick();const chunks=calls.filter(c=>typeof c==='object');assert.equal(chunks.map(c=>c.text).join(''),text.trimEnd());assert.ok(events.filter(e=>e.paragraph).every(e=>e.paragraph.charOffset===0&&e.end===text.trimEnd().length));speech.stop();
});

test('native word events update checkpoints without splitting paragraph utterances',async()=>{
 const {speech,calls,events}=speechHarness();await speech.play([{text:'Hello rain falls softly.'}],{chapterIndex:0,charOffset:0},{language:'en',rate:1});const first=calls.find(c=>typeof c==='object');first.boundary({name:'word',charIndex:11,charLength:5});assert.equal(first.text,'Hello rain falls softly.');assert.equal(calls.filter(c=>typeof c==='object').length,1);assert.equal(speech.tracking,'paragraph');assert.ok(events.some(e=>e.position?.charOffset===11));assert.equal(events.filter(e=>e.paragraph).length,1);speech.stop();
});

test('global theme migration preserves custom typography and moves the old reader palette to the whole app',async()=>{
 const {migrateReaderPreferences,globalPalette}=await import('../dist/advanced-reader.js');const migrated=migrateReaderPreferences({readerTheme:'paper',themeMode:'light',lineHeight:1.8,paragraphSpacing:12,textAlign:'left'});assert.equal(migrated.themeMode,'paper');assert.equal(migrated.readerTheme,'follow');assert.equal(migrated.lineHeight,1.6);assert.equal(migrated.paragraphSpacing,6);assert.equal(migrated.textAlign,'justify');
 const custom=migrateReaderPreferences({readerTheme:'follow',themeMode:'dark',lineHeight:1.5,paragraphSpacing:7,textAlign:'center'});assert.equal(custom.lineHeight,undefined);assert.equal(custom.paragraphSpacing,undefined);assert.equal(custom.textAlign,undefined);assert.equal(custom.themeMode,'dark');assert.equal(globalPalette({...custom,themeMode:'dark'}).dark,true);assert.equal(globalPalette({themeMode:'paper'}).variables['--bg'],globalPalette({themeMode:'paper'}).variables['--paper']);assert.equal(globalPalette({themeMode:'custom',customTextColor:'#ffffff',customBackgroundColor:'#ffffff'}).background,'#faf9f5');
});
