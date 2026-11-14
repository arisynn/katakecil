import {test} from 'node:test';
import assert from 'node:assert/strict';
import {JSDOM} from 'jsdom';
import {createReaderExperience} from '../dist/reader-experience.js';
import {readerDefaults,globalPalette} from '../dist/advanced-reader.js';
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function scene(speechDriver){
 const dom=new JSDOM('<html lang="en"><body><main class="reader-shell" data-mode="controls"><article class="reading-page"><div class="page-inner"><div class="page-text" data-chapter-index="0" data-start="0">Hello</div></div></article></main><div id="overlay-root"></div></body></html>',{url:'https://katakecil.test/',pretendToBeVisual:true}),w=dom.window;
 Object.assign(globalThis,{window:w,document:w.document,innerWidth:390,innerHeight:760,requestAnimationFrame:w.requestAnimationFrame.bind(w)});
 const prefs={...readerDefaults,uiLanguage:'en',fontFamily:'Lora',fontSize:19,lineHeight:1.6,spreadMode:'single',pageAnimation:'fade',themeMode:'light'};
 const book={id:'story-one',language:'en',chapters:[{href:'section-one.xhtml',title:'A quiet moment',text:'Hello rain.'}]},pages=[{chapterIndex:0,start:0,end:5,text:'Hello'},{chapterIndex:0,start:5,end:11,text:' rain.'}];let index=0,features;const reflows=[],speechSaves=[];
 const ctx={prefs:()=>prefs,book:()=>book,pages:()=>pages,index:()=>index,annotations:()=>[],progress:()=>null,saveAnnotation(){},savePreferences:change=>Object.assign(prefs,change),saveSpeech:value=>speechSaves.push(value),speechDriver,
  apply(){const palette=globalPalette(prefs);w.document.body.dataset.theme=palette.dark?'dark':'light';for(const [key,value] of Object.entries(palette.variables))w.document.body.style.setProperty(key,value);features.apply();},
  mode:mode=>w.document.querySelector('.reader-shell').dataset.mode=mode,heading:title=>'<h2 id="dialog-title">'+title+'</h2>',
  show:html=>w.document.querySelector('#overlay-root').innerHTML='<div class="overlay-backdrop"><section class="dialog">'+html+'</section></div>',close(){features.closePanel();w.document.querySelector('#overlay-root').innerHTML='';},
  reflow:async anchor=>reflows.push({...anchor}),paint(){},persist(){},toast(){},selection:()=>null,clearSelection(){},download(){},syncIndex:i=>index=i,
  goPage:i=>{index=i;const root=w.document.querySelector('.page-text');root.textContent=pages[i].text;root.dataset.start=pages[i].start;features.afterRender();},
 };
 features=createReaderExperience(ctx);ctx.apply();
 w.document.addEventListener('input',event=>features.input(event.target));w.document.addEventListener('change',event=>features.change(event.target));w.document.addEventListener('click',event=>{const button=event.target.closest('[data-action]');if(button)features.action(button);});
 return{dom,w,features,prefs,reflows,speechSaves,ctx,get index(){return index;}};
}
test('slider preview hides the sheet, retains its input, applies CSS live and commits the original anchor on release',async()=>{
 const s=scene();s.features.setPosition({chapterIndex:0,start:3});s.features.appearance('text');const input=s.w.document.querySelector('[data-reader-pref=fontSize]');
 input.dispatchEvent(new s.w.MouseEvent('pointerdown',{bubbles:true}));assert.equal(s.w.document.querySelector('.reader-peek-control input'),input);assert.equal(s.w.document.querySelector('.reader-shell').dataset.mode,'reading');assert.ok(s.w.document.querySelector('.overlay-backdrop').classList.contains('appearance-peeking'));assert.equal(input.closest('.dialog'),s.w.document.querySelector('.dialog'),'the input stays in its original dialog during touch drag');
 input.value='26';input.dispatchEvent(new s.w.Event('input',{bubbles:true}));assert.equal(s.prefs.fontSize,19,'preview has not committed storage');assert.equal(s.w.document.documentElement.style.getPropertyValue('--reader-size'),'26px');
 input.dispatchEvent(new s.w.Event('change',{bubbles:true}));input.dispatchEvent(new s.w.MouseEvent('pointerup',{bubbles:true}));
 assert.equal(s.prefs.fontSize,26);assert.deepEqual(s.reflows.at(-1),{chapterIndex:0,start:3});assert.equal(s.w.document.querySelector('.reader-peek-control'),null);assert.equal(s.w.document.querySelector('[data-reader-pref=fontSize]'),input);assert.equal(s.w.document.querySelector('.reader-shell').dataset.mode,'controls');assert.equal(s.w.document.querySelector('.overlay-backdrop').classList.contains('appearance-peeking'),false);s.features.leave();s.w.close();
});
test('closing a slider preview cancels unsaved style and global theme changes affect the app and reader together',()=>{
 const s=scene();s.features.appearance('text');const input=s.w.document.querySelector('[data-reader-pref=fontSize]');input.dispatchEvent(new s.w.MouseEvent('pointerdown',{bubbles:true}));input.value='30';input.dispatchEvent(new s.w.Event('input',{bubbles:true}));s.features.closePanel();assert.equal(s.prefs.fontSize,19);assert.equal(s.w.document.documentElement.style.getPropertyValue('--reader-size'),'19px');assert.equal(input.value,'19');assert.equal(s.w.document.querySelector('.reader-peek-control'),null);
 s.features.themeDialog();s.w.document.querySelector('[data-action=app-theme-preset][data-value=paper]').click();assert.equal(s.prefs.themeMode,'paper');assert.equal(s.prefs.readerTheme,'follow');assert.equal(s.w.document.body.style.getPropertyValue('--bg'),'#f1f0e9');assert.equal(s.w.document.documentElement.style.getPropertyValue('--reader-paper'),'#f1f0e9');s.features.leave();s.w.close();
});
test('read-aloud speaks a paragraph once and paints its visible range across pages',async()=>{
 const pending=[],spoken=[],options=[];const driver={init:async()=>true,voices:()=>[{voiceURI:'local-en',name:'Local English',lang:'en-US',localService:true}],speak:o=>{options.push(o);spoken.push(o.text);o.start();return new Promise(resolve=>pending.push(resolve));},pause(){},resume(){},cancel(){}};
 const s=scene(driver),registry=new Map();s.w.CSS={highlights:registry};s.w.Highlight=class{constructor(...ranges){this.ranges=ranges;}};
 s.features.action({dataset:{action:'reader-speech'}});await wait(20);s.features.action({dataset:{action:'tts-play'}});await wait(10);assert.equal(s.w.document.querySelector('.dialog'),null);assert.equal(s.w.document.querySelector('.reader-shell').dataset.mode,'reading');assert.deepEqual(spoken,['Hello rain.']);assert.equal(registry.get('katakecil-tts-paragraph').ranges[0].toString(),'Hello');assert.equal(s.w.getSelection().rangeCount,0);
 options[0].boundary({name:'word',charIndex:6,charLength:4});assert.equal(spoken.length,1);assert.equal(s.index,1);assert.equal(registry.get('katakecil-tts-paragraph').ranges[0].toString(),' rain.');s.features.action({dataset:{action:'tts-pause'}});assert.equal(registry.get('katakecil-tts-paragraph').ranges[0].toString(),' rain.');s.features.action({dataset:{action:'tts-stop'}});assert.equal(registry.has('katakecil-tts-paragraph'),false);assert.ok(s.speechSaves.some(p=>p.charOffset===6));s.features.leave();s.w.close();
});

test('release ends preview immediately without waiting for pagination or a native change event',async()=>{
 const s=scene(),pending=[];s.ctx.reflow=()=>new Promise(resolve=>pending.push(resolve));s.features.appearance('text');const input=s.w.document.querySelector('[data-reader-pref=fontSize]');
 const event=name=>input.dispatchEvent(name.startsWith('pointer')?new s.w.MouseEvent(name,{bubbles:true}):new s.w.Event(name,{bubbles:true}));
 event('pointerdown');input.value='24';event('input');event('pointerup');
 assert.equal(s.w.document.body.classList.contains('reader-previewing'),false,'pointerup restores the sheet synchronously');assert.equal(s.prefs.fontSize,24);assert.equal(pending.length,1);
 event('change');assert.equal(pending.length,1,'the later native change must not launch a duplicate layout');
 event('pointerdown');input.value='25';event('input');pending[0]();await Promise.resolve();await Promise.resolve();assert.ok(s.w.document.body.classList.contains('reader-previewing'),'old pagination cannot interrupt a new drag');
 event('pointerup');assert.equal(s.prefs.fontSize,25);assert.equal(s.w.document.body.classList.contains('reader-previewing'),false);pending[1]();s.features.leave();s.w.close();
});
test('appearance tabs retain the same sheet, header, tabs and panel container',()=>{
 const s=scene();let openings=0;const show=s.ctx.show;s.ctx.show=html=>{openings++;show(html);};s.features.appearance('text');
 const doc=s.w.document,dialog=doc.querySelector('.dialog'),backdrop=doc.querySelector('.overlay-backdrop'),heading=doc.querySelector('#dialog-title'),tabs=doc.querySelector('.appearance-tabs'),body=doc.querySelector('#appearance-body');
 for(const tab of ['layout','theme','text']){doc.querySelector('[data-action=appearance-tab][data-value='+tab+']').click();assert.equal(doc.querySelector('.dialog'),dialog);assert.equal(doc.querySelector('.overlay-backdrop'),backdrop);assert.equal(doc.querySelector('#dialog-title'),heading);assert.equal(doc.querySelector('.appearance-tabs'),tabs);assert.equal(doc.querySelector('#appearance-body'),body);assert.equal(tabs.querySelector('[aria-selected=true]').dataset.value,tab);assert.equal(doc.activeElement,tabs.querySelector('[data-value='+tab+']'));}
 s.prefs.uiLanguage='id';s.features.appearance('layout');assert.equal(doc.querySelector('#dialog-title'),heading);assert.match(heading.textContent,/Tampilan baca/);assert.equal(tabs.querySelector('[data-value=text] span').textContent,'Teks');assert.equal(openings,1,'only entering the appearance menu opens a sheet');s.features.leave();s.w.close();
});
test('book tabs and theme preset changes update the existing bottom sheet',()=>{
 const s=scene();s.features.contents('contents');let dialog=s.w.document.querySelector('.dialog'),backdrop=s.w.document.querySelector('.overlay-backdrop');const nav=dialog.querySelector('.reader-tabs'),body=dialog.querySelector('#drawer-content');
 for(const tab of ['highlights','notes','bookmarks']){s.features.action({dataset:{action:'reader-tab',value:tab}});assert.equal(s.w.document.querySelector('.dialog'),dialog);assert.equal(s.w.document.querySelector('.overlay-backdrop'),backdrop);assert.equal(dialog.querySelector('.reader-tabs'),nav);assert.equal(dialog.querySelector('#drawer-content'),body);}
 s.features.themeDialog();dialog=s.w.document.querySelector('.dialog');backdrop=s.w.document.querySelector('.overlay-backdrop');s.w.document.querySelector('[data-action=app-theme-preset][data-value=paper]').click();assert.equal(s.w.document.querySelector('.dialog'),dialog);assert.equal(s.w.document.querySelector('.overlay-backdrop'),backdrop);s.features.leave();s.w.close();
});

test('arc accordions open the current arc and retain expansion across book tabs',()=>{
 const s=scene(),arc1={id:'arc-one',label:'ARC 1',title:'Pertemuan'},arc2={id:'arc-two',label:'ARC 2',title:'Percakapan'};
 const chapters=[{href:'one',title:'Satu',text:'Hello',arc:arc1},{href:'two',title:'Dua',text:'Second',arc:arc1},{href:'three',title:'Tiga',text:'Third',arc:arc2}];s.ctx.book().chapters=chapters;s.features.contents();const doc=s.w.document,dialog=doc.querySelector('.dialog');let arcs=[...doc.querySelectorAll('.toc-arc')];assert.equal(arcs.length,2);assert.equal(arcs[0].open,true);assert.equal(arcs[1].open,false);assert.deepEqual([...doc.querySelectorAll('.toc-item')].map(el=>el.dataset.index),['0','1','2']);
 arcs[0].open=false;arcs[0].dispatchEvent(new s.w.Event('toggle'));arcs[1].open=true;arcs[1].dispatchEvent(new s.w.Event('toggle'));s.features.contents('notes');s.features.contents('contents');arcs=[...doc.querySelectorAll('.toc-arc')];assert.equal(doc.querySelector('.dialog'),dialog);assert.equal(arcs[0].open,false);assert.equal(arcs[1].open,true);
 chapters.forEach(c=>delete c.arc);s.features.contents();assert.equal(doc.querySelectorAll('.toc-arc').length,0);assert.equal(doc.querySelectorAll('.toc-item').length,3);s.features.leave();s.w.close();
});

test('comfort defaults uses app confirmation, cancels safely and confirms only once',async()=>{
 const s=scene();Object.assign(s.prefs,{fontSize:30,themeMode:'dark',readingMode:'scroll'});let calls=0;s.ctx.resetReadingPreferences=()=>{calls++;Object.assign(s.prefs,{fontSize:19,readingMode:'pages'});};s.w.confirm=()=>assert.fail('Native confirmation must never open');s.features.setPosition({chapterIndex:0,start:3});s.features.appearance();const before=JSON.stringify(s.prefs);
 s.features.action({dataset:{action:'comfort-reset'}});assert.ok(s.w.document.querySelector('[data-action=comfort-reset-confirm]'));assert.equal(calls,0);assert.equal(JSON.stringify(s.prefs),before);s.features.action({dataset:{action:'comfort-reset-cancel'}});assert.equal(JSON.stringify(s.prefs),before);assert.ok(s.w.document.querySelector('.appearance-tabs'));
 s.features.action({dataset:{action:'comfort-reset'}});s.features.action({dataset:{action:'comfort-reset-confirm'}});s.features.action({dataset:{action:'comfort-reset-confirm'}});await wait(20);assert.equal(calls,1);assert.equal(s.prefs.fontSize,19);assert.equal(s.prefs.themeMode,'dark');assert.equal(s.prefs.readingMode,'pages');assert.equal(s.w.document.querySelector('.appearance-hint'),null);assert.deepEqual(s.reflows.at(-1),{chapterIndex:0,start:3});assert.ok(s.w.document.querySelector('.appearance-tabs'));s.features.leave();s.w.close();
});

test('Custom opens a separate editor, Back cancels and Apply returns to the theme menu',()=>{
 const s=scene(),doc=s.w.document;s.features.appearance('theme');const initial=s.prefs.themeMode;assert.equal(doc.querySelector('.custom-theme-editor'),null);s.features.action({dataset:{action:'app-theme-preset',value:'custom'}});assert.ok(doc.querySelector('.custom-theme-popup'));assert.equal(doc.querySelector('details.custom-theme-editor'),null);assert.equal(s.prefs.themeMode,initial);s.features.action({dataset:{action:'custom-theme-back'}});assert.ok(doc.querySelector('.appearance-tabs'));assert.equal(s.prefs.themeMode,initial);s.features.action({dataset:{action:'app-theme-preset',value:'custom'}});doc.querySelector('#reader-ink').value='#123456';s.features.input(doc.querySelector('#reader-ink'));s.features.action({dataset:{action:'apply-reader-theme'}});assert.equal(s.prefs.themeMode,'custom');assert.equal(s.prefs.customTextColor,'#123456');assert.ok(doc.querySelector('.appearance-tabs'));s.features.leave();s.w.close();
});

test('reading page glow defaults off, toggles in both theme panels and never repaginates',()=>{
 const s=scene(),doc=s.w.document;s.features.setPosition({chapterIndex:0,start:3});const text=doc.querySelector('.page-text');
 try{
  s.features.themeDialog();let input=doc.querySelector('#reader-ambient-glow');assert.equal(input.checked,false);assert.equal(input.hasAttribute('data-reader-pref'),false);
  input.checked=true;input.dispatchEvent(new s.w.Event('change',{bubbles:true}));assert.equal(s.prefs.readerAmbientGlow,true);
  s.features.appearance('theme');input=doc.querySelector('#reader-ambient-glow');assert.equal(input.checked,true);
  input.checked=false;input.dispatchEvent(new s.w.Event('change',{bubbles:true}));assert.equal(s.prefs.readerAmbientGlow,false);
  assert.deepEqual(s.reflows,[]);assert.equal(doc.querySelector('.page-text'),text);assert.deepEqual(s.features.position(),{chapterIndex:0,start:3});
 }finally{s.features.leave();s.w.close();}
});
