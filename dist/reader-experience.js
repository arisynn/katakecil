import {layoutDialog} from './panel-layout.js?v=1';
import {makeAnchor,resolveAnchor,migrateLegacyAnchor,readerDefaults,readerSettings,palettes,globalPalette,contrast,spreadEnabled,findPage,findMatches,readingStats,ReadAloud,ReadingWakeLock,dictionaryLookup,translateSelection} from './advanced-reader.js?v=11';
import {escapeHTML as esc,icon,$,$$} from './ui.js?v=10';
import {textRange,offsetAtPoint} from './text-selection.js?v=8';


export function paragraphMarkup(text,start=0,source=text,decorate=(value)=>esc(value)){
 const parts=text.split('\n\n');let offset=start;
 return parts.map((part,index)=>{const separator=index<parts.length-1?'\n\n':'';if(!part&&!separator)return'';const paragraphStart=offset===0||source.slice(offset-2,offset)==='\n\n';const result=`<span class="reader-paragraph ${paragraphStart?'paragraph-start':''}" data-offset="${offset}">${decorate(part,offset)}${separator?`<span class="paragraph-break">${decorate(separator,offset+part.length)}</span>`:''}</span>`;offset+=part.length+separator.length;return result;}).join('');
}

// UI glue around the existing pagination, gestures and device store. No new account or backend.
export function createReaderExperience(ctx){
 const tr=(en,id=en)=>ctx.prefs().uiLanguage==='id'?id:en;
 let previewValues={};
 const pref=()=>readerSettings({...ctx.prefs(),...previewValues});
 let appearanceTab='text',peek=null,resetting=false;
 const arcOpen=new Map();
 let panel='',scrollPosition=null,scrollTimer,scrollRestore=false,filters={episode:'all',color:'all'},activeTab='contents';
 let search={query:'',chapterIndex:0,matches:[],total:0,index:-1},lookupSelection=null,lookupRequest=0,lookupAbort=null;
 let pendingSpeechPosition=null,lastSpeechSave=0;
 let draftInk='#28302b',draftPaper='#faf9f5',speechRange=null,speechWord=null;
 const wake=ctx.wakeLock||new ReadingWakeLock();
 const speech=new ReadAloud({change:()=>updateSpeechUI(),sentence:(pos,end)=>speechAt(pos,end,false),word:(pos,end)=>speechAt(pos,end,true),error:message=>ctx.toast(message)},ctx.speechDriver);
 const chapterName=index=>ctx.book()?.chapters[index]?.navigationTitle||ctx.book()?.chapters[index]?.title||tr('Book information','Informasi buku');
 const field=(label,key,type,attributes,value)=>`<label class="reader-setting appearance-field"><span>${label}</span><input data-reader-pref="${key}" type="${type}" ${attributes} value="${esc(value)}"><output data-output="${key}">${esc(value)}</output></label>`;
 const select=(label,key,options,value)=>`<label class="reader-setting"><span>${label}</span><select data-reader-pref="${key}" aria-label="${label}">${options.map(([id,title])=>`<option value="${id}" ${id===String(value)?'selected':''}>${title}</option>`).join('')}</select></label>`;
 const check=(label,key,checked)=>`<label class="reader-setting"><span>${label}</span><input data-reader-pref="${key}" type="checkbox" ${checked?'checked':''}></label>`;
 function position(){const pg=ctx.pages()[ctx.index()];return scrollPosition&&pg&&scrollPosition.chapterIndex===pg.chapterIndex&&(pref().readingMode==='scroll'||scrollPosition.start>=pg.start&&scrollPosition.start<pg.end)?{...scrollPosition}:pg?{chapterIndex:pg.chapterIndex,start:pg.start}:{chapterIndex:0,start:0};}
 function mode(){return pref().readingMode;}
 function spread(){return spreadEnabled(ctx.prefs(),innerWidth);}
 function apply(){
  const s=document.documentElement.style,d=pref();
  const font={Lora:"'Lora',Georgia,serif",'Plus Jakarta Sans':"'Plus Jakarta Sans',system-ui,sans-serif",'DM Sans':'system-ui,sans-serif',Georgia:'Georgia,serif',system:'system-ui,sans-serif',monospace:'ui-monospace,monospace'}[ctx.prefs().fontFamily]||"'Lora',Georgia,serif";
  const palette=globalPalette(ctx.prefs(),document.body.dataset.theme==='dark');
  for(const [name,value] of Object.entries({'reader-font':font,'reader-size':d.fontSize+'px','reader-line':d.lineHeight,'reader-weight':d.fontWeight,'paragraph-space':d.paragraphSpacing+'px','letter-space':d.letterSpacing+'px','paragraph-indent':d.paragraphIndent+'em','reader-align':d.textAlign,'reader-inset-x':d.marginHorizontal+'px','reader-inset-y':Math.min(d.marginVertical,Math.max(8,(innerHeight-220)/2))+'px','reader-width':d.readerWidth+'px','reader-paper':palette.background,'reader-ink':palette.text,'reader-brightness':(100-d.brightness)/100,'content-position':d.contentPosition==='center'?'center':'flex-start'}))s.setProperty('--'+name,String(value));
  const shell=$('.reader-shell');if(shell){shell.dataset.readingMode=mode();shell.dataset.spread=String(spread());shell.dataset.animation=ctx.prefs().pageAnimation||'slide';}
 }
 function enter(){arcOpen.clear();panel='';scrollPosition=null;pendingSpeechPosition=null;lastSpeechSave=0;filters={episode:'all',color:'all'};activeTab='contents';search={query:'',chapterIndex:0,matches:[],total:0,index:-1};apply();void wake.set(!!ctx.prefs().wakeLock).catch(()=>{});if(ctx.setOrientation)void ctx.setOrientation(ctx.prefs().orientation||'auto').catch(()=>{});}
 function leave(){finishPeek();speech.stop();void wake.set(false);clearTimeout(scrollTimer);lookupAbort?.abort();lookupRequest++;lookupSelection=null;scrollPosition=null;panel='';clearSpeechPaint();}
 function closePanel(){finishPeek();panel='';lookupAbort?.abort();lookupRequest++;}
 function anchorMetadata(chapterIndex,start,end){return makeAnchor(ctx.book().chapters[chapterIndex],start,end);}
 function resolveAnnotations(){
  const book=ctx.book();if(!book)return;
  for(const a of ctx.annotations().filter(a=>a.bookId===book.id)){
   if(a.anchor){const found=resolveAnchor(book.chapters,a.anchor)||(a.legacySourceAnchor?migrateLegacyAnchor(book.chapters,a.anchor):null);const changed=!found?!a.needsReview:a.legacySourceAnchor||a.needsReview||a.chapterIndex!==found.chapterIndex||(a.startOffset??a.charOffset)!==found.start;
    if(changed)ctx.saveAnnotation(found?{...a,legacySourceAnchor:false,anchor:makeAnchor(book.chapters[found.chapterIndex],found.start,found.end),chapterIndex:found.chapterIndex,charOffset:found.start,...(a.type==='highlight'?{startOffset:found.start,endOffset:found.end}:{}),needsReview:false}:{...a,needsReview:true});
   }else if(!a.needsReview){
    if(a.type==='highlight'&&a.selectedText&&a.selectedText.length<=4000){const found=migrateLegacyAnchor(book.chapters,{exact:a.selectedText,prefix:'',suffix:'',episodeId:'',start:0,end:a.selectedText.length});ctx.saveAnnotation(found?{...a,chapterIndex:found.chapterIndex,charOffset:found.start,startOffset:found.start,endOffset:found.end,anchor:makeAnchor(book.chapters[found.chapterIndex],found.start,found.end),needsReview:false}:{...a,needsReview:true});}
    else if(book.source==='local'&&book.chapters[a.chapterIndex]){const ch=book.chapters[a.chapterIndex],start=a.charOffset||0;if(ch.text.length>start)ctx.saveAnnotation({...a,anchor:makeAnchor(ch,start,Math.min(ch.text.length,start+80))});}
    else ctx.saveAnnotation({...a,needsReview:true});
   }
  }
 }
 function savedPosition(saved){
  if(saved?.anchor){const found=resolveAnchor(ctx.book().chapters,saved.anchor)||(saved.legacySourceAnchor?migrateLegacyAnchor(ctx.book().chapters,saved.anchor):null);if(found)return{chapterIndex:found.chapterIndex,start:found.start};
   const index=ctx.book().chapters.findIndex(c=>c.href===saved.anchor.episodeId);return {chapterIndex:Math.max(0,index),start:0};}
  return{chapterIndex:saved?.chapterIndex||0,start:saved?.charOffset||0};
 }
 function progressMetadata(){const a=position(),ch=ctx.book()?.chapters[a.chapterIndex];if(!ch?.text.length)return{};return{legacySourceAnchor:false,anchor:makeAnchor(ch,Math.min(a.start,ch.text.length-1),Math.min(ch.text.length,a.start+80)),charOffset:a.start};}
 function renderText(page){
  const book=ctx.book(),text=book.chapters[page.chapterIndex].text;
  const annotations=ctx.annotations().filter(a=>a.bookId===book.id&&!a.needsReview&&a.type==='highlight'&&a.chapterIndex===page.chapterIndex&&a.startOffset<page.end&&a.endOffset>page.start);
  const results=search.chapterIndex===page.chapterIndex?search.matches.filter(m=>m.start<page.end&&m.end>page.start):[];
  const cuts=[...new Set([...annotations.flatMap(a=>[a.startOffset,a.endOffset]),...results.flatMap(m=>[m.start,m.end])])].sort((a,b)=>a-b);
  const decorate=(value,start)=>{const end=start+value.length,boundaries=[start,...cuts.filter(c=>c>start&&c<end),end];return boundaries.slice(0,-1).map((from,i)=>{const to=boundaries[i+1],a=annotations.find(a=>a.startOffset<=from&&a.endOffset>=to),result=results.find(m=>m.start<=from&&m.end>=to);let value=esc(text.slice(from,to));if(a)value=`<mark class="mark-${['amber','emerald','sapphire','rose'].includes(a.color)?a.color:'amber'}" data-annotation="${esc(a.id)}" title="${esc(a.noteText||tr('Open highlight','Buka highlight'))}">${value}</mark>`;if(result)value=`<mark class="search-match ${search.matches[search.index]===result?'is-current':''}">${value}</mark>`;return value;}).join('');};
  return paragraphMarkup(text.slice(page.start,page.end),page.start,text,decorate);
 }
 function measureText(text,chapterIndex,start){return paragraphMarkup(text,start,ctx.book().chapters[chapterIndex].text);}
 function renderedPages(index){const pg=ctx.pages()[index];if(!pg)return[];if(mode()==='scroll'){const ch=ctx.book().chapters[pg.chapterIndex];return[{...pg,start:0,end:ch.text.length,text:ch.text,displayIndex:index}];}return [pg,...(spread()&&ctx.pages()[index+1]?[ctx.pages()[index+1]]:[])].map((p,i)=>({...p,displayIndex:index+i}));}
 function afterRender(){
  const nodes=$$('.page-text');for(const [i,node] of nodes.entries()){const page=renderedPages(ctx.index())[i];if(!page)continue;node.dataset.chapterIndex=page.chapterIndex;node.dataset.start=page.start;}
  if(mode()==='scroll'){
   const root=nodes[0];if(!root)return;const scroller=root.closest('.page-inner');
   const desired=scrollPosition?.chapterIndex===Number(root.dataset.chapterIndex)?scrollPosition.start:ctx.pages()[ctx.index()].start;
   scrollPosition={chapterIndex:Number(root.dataset.chapterIndex),start:desired};scrollRestore=true;
   const range=textRange(root,desired,Math.min(root.textContent.length,desired+1));
   if(range){const r=range.getBoundingClientRect(),box=scroller.getBoundingClientRect();if(desired===0)scroller.scrollTop=0;else scroller.scrollTop+=r.top-box.top;}
   requestAnimationFrame(()=>{scrollRestore=false;});
   scroller.addEventListener('scroll',()=>{if(scrollRestore)return;ctx.clearSelection();clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{
    if(!ctx.book()||!root.isConnected)return;const box=scroller.getBoundingClientRect();let offset=offsetAtPoint(root,box.left+8,box.top+6);
    if(offset===null){const para=$$('.reader-paragraph',root).find(p=>p.getBoundingClientRect().bottom>box.top+3);offset=Number(para?.dataset.offset||0);}
    scrollPosition={chapterIndex:Number(root.dataset.chapterIndex),start:offset};ctx.syncIndex(findPage(ctx.pages(),scrollPosition.chapterIndex,offset));ctx.persist();paintSpeech();
   },100);},{passive:true});
  }
  paintSpeech();
 }
 function jump(anchor,source='user'){
  if(source!=='speech')speech.stop();
  const index=findPage(ctx.pages(),anchor.chapterIndex,anchor.start??anchor.charOffset??0);if(index<0)return false;
  scrollPosition={chapterIndex:anchor.chapterIndex,start:anchor.start??anchor.charOffset??0};ctx.goPage(index,source==='speech'?'speech':'anchor');return true;
 }
 function nextChapter(delta){const a=position(),index=a.chapterIndex+delta;if(index<0||index>=ctx.book().chapters.length)return;jump({chapterIndex:index,start:0});ctx.mode('reading');}
 function showPanel(html,key){
  let dialog=$('.dialog');
  if(dialog?.dataset.readerPanel===key){
   const isAppearance=key==='appearance',bodySelector=isAppearance?'#appearance-body':'#drawer-content',tabsSelector=isAppearance?'.appearance-tabs':'.reader-tabs',selected=isAppearance?appearanceTab:activeTab;
   if((isAppearance||key==='book')&&$(bodySelector)){
    const fragment=document.createElement('template');fragment.innerHTML=html;const next=fragment.content.querySelector(bodySelector),body=$(bodySelector),previous=$(tabsSelector+' button.active')?.dataset.value;
    body.innerHTML=next.innerHTML;body.setAttribute('aria-labelledby',next.getAttribute('aria-labelledby'));const heading=dialog.querySelector('#dialog-title'),nextHeading=fragment.content.querySelector('#dialog-title');if(heading&&nextHeading&&heading.textContent!==nextHeading.textContent)heading.innerHTML=nextHeading.innerHTML;const nav=dialog.querySelector(tabsSelector);nav.setAttribute('aria-label',fragment.content.querySelector(tabsSelector).getAttribute('aria-label'));
    nav.querySelectorAll('button').forEach(button=>{const active=button.dataset.value===selected;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;const label=button.querySelector('span'),nextLabel=fragment.content.querySelector('#'+button.id+' span');if(label.textContent!==nextLabel.textContent)label.textContent=nextLabel.textContent;});
    if(previous!==selected)(dialog.querySelector('.dialog-body')||dialog).scrollTop=0;
   }else dialog.innerHTML=html;
  }else{ctx.show(html);dialog=$('.dialog');}
  if(dialog){layoutDialog(dialog);dialog.dataset.readerPanel=key;}
 }
 function contents(tab=activeTab){
  if(!ctx.book())return;activeTab=tab;panel='contents';ctx.mode('controls');
  const tabs=[['contents',tr('Contents','Daftar isi'),'list'],['highlights',tr('Highlights','Highlight'),'quote'],['notes',tr('Notes','Catatan'),'notes'],['bookmarks',tr('Bookmarks','Bookmark'),'bookmark']];
  showPanel(ctx.heading(tr('This book','Buku ini'))+`<div class="tabs reader-tabs" role="tablist" aria-label="${tr('Book panels','Panel buku')}">${tabs.map(([key,title,glyph])=>`<button class="tab ${key===activeTab?'active':''}" role="tab" id="reader-tab-${key}" aria-controls="drawer-content" aria-selected="${key===activeTab}" tabindex="${key===activeTab?'0':'-1'}" data-action="reader-tab" data-value="${key}">${icon(glyph)}<span>${title}</span></button>`).join('')}</div><div id="drawer-content" role="tabpanel" aria-labelledby="reader-tab-${activeTab}">${contentsBody()}</div>`,'book');
 }
 function contentsBody(){
  const book=ctx.book();if(!book)return'';
  if(activeTab==='contents'){
   const current=position().chapterIndex;
   const chapterRow=(c,i)=>`<button class="toc-item ${current===i?'active':''}" data-action="chapter" data-index="${i}"><span>${String(i+1).padStart(2,'0')}</span><span data-book-content translate="no">${esc(chapterName(i))}</span></button>`;
   const groups=[];
   book.chapters.forEach((chapter,index)=>{const last=groups.at(-1),key=chapter.arc?.id||'';if(last&&last.key===key)last.items.push({chapter,index});else groups.push({key,arc:chapter.arc,items:[{chapter,index}]});});
   return `<nav class="toc-list" aria-label="${tr('Contents','Daftar isi')}">${groups.map(group=>{
    const rows=group.items.map(({chapter,index})=>chapterRow(chapter,index)).join('');
    if(!group.arc)return rows;
    const open=arcOpen.has(group.key)?arcOpen.get(group.key):group.items.some(item=>item.index===current);
    return `<details class="toc-arc" data-arc-id="${esc(group.key)}" ${open?'open':''}><summary><span class="toc-arc-heading" data-book-content translate="no"><small>${esc(group.arc.label)}</small><span>${esc(group.arc.title)}</span></span>${icon('chevron')}</summary><div class="toc-arc-chapters">${rows}</div></details>`;
   }).join('')}</nav>`;
  }
  const entries=ctx.annotations().filter(a=>a.bookId===book.id&&(activeTab==='bookmarks'?a.type==='bookmark':a.type==='highlight'&&(activeTab!=='notes'||a.noteText))&&(filters.episode==='all'||a.chapterIndex===Number(filters.episode))&&(activeTab==='bookmarks'||filters.color==='all'||a.color===filters.color));
  return `<div class="annotation-filters"><label><span class="sr-only">${tr('Episode','Episode')}</span><select id="annotation-episode" aria-label="${tr('Filter by episode','Filter episode')}"><option value="all">${tr('All episodes','Semua episode')}</option>${book.chapters.map((c,i)=>`<option data-book-content translate="no" value="${i}" ${filters.episode===String(i)?'selected':''}>${esc(chapterName(i))}</option>`).join('')}</select></label>${activeTab!=='bookmarks'?`<label><span class="sr-only">${tr('Color','Warna')}</span><select id="annotation-color" aria-label="${tr('Filter by color','Filter warna')}">${[['all',tr('All colors','Semua warna')],['amber',tr('Yellow','Kuning')],['emerald',tr('Green','Hijau')],['sapphire',tr('Blue','Biru')],['rose',tr('Pink','Merah muda')]].map(([id,title])=>`<option value="${id}" ${id===filters.color?'selected':''}>${title}</option>`).join('')}</select></label>`:''}<button class="icon-button" data-action="export-reader" aria-label="${tr('Export annotations','Ekspor anotasi')}">${icon('download')}</button></div>${entries.length?entries.map(a=>`<article class="saved-passage" style="--mark:${{amber:'#e7ca7e',emerald:'#a4c9ae',sapphire:'#acc7e6',rose:'#e4b3c3'}[a.color]||'#acc7e6'}"><small data-book-content translate="no">${esc(a.needsReview?tr('Published location needs review','Lokasi terbit perlu ditinjau'):chapterName(a.chapterIndex))}</small>${a.type==='bookmark'?`<p data-book-content translate="no">${esc(a.label||tr('Saved position','Posisi tersimpan'))}</p>`:`<blockquote data-book-content translate="no">${esc(a.needsReview&&book.source==='supabase'?tr('Original quotation is kept in your annotation export.','Kutipan asli tersimpan dalam ekspor anotasi Anda.'):a.selectedText)}</blockquote>`}${a.needsReview?`<p class="unresolved-note">${tr('The text changed. Review this annotation before jumping.','Teks berubah. Tinjau anotasi sebelum membukanya.')}</p>`:''}${a.noteText?`<p class="note-text" data-book-content translate="no">${esc(a.noteText)}</p>`:''}<div class="passage-actions"><button data-action="jump-annotation" data-id="${esc(a.id)}" ${a.needsReview?'disabled':''}>${tr('Go to passage','Buka bagian')}</button><button class="icon-button" data-action="edit-annotation" data-id="${esc(a.id)}" aria-label="${tr('Edit annotation','Edit anotasi')}">${icon('edit')}</button><button class="icon-button" data-action="${activeTab==='notes'?'delete-note':'delete-annotation'}" data-id="${esc(a.id)}" aria-label="${activeTab==='notes'?tr('Remove note','Hapus catatan'):tr('Delete annotation','Hapus anotasi')}">${icon('trash')}</button></div></article>`).join(''):`<div class="empty-state small"><p>${tr('No saved items match these filters.','Belum ada simpanan untuk filter ini.')}</p></div>`}`;
 }
 function bookmarkDialog(a){panel='bookmark';ctx.show(ctx.heading(tr('Bookmark','Bookmark'))+`<p class="dialog-caption" data-book-content translate="no">${esc(chapterName(a.chapterIndex))}</p><form id="bookmark-label-form" data-id="${esc(a.id)}"><label class="field-label" for="bookmark-label">${tr('Label','Label')}</label><input id="bookmark-label" class="text-input" maxlength="120" value="${esc(a.label||'')}"><div class="dialog-actions"><button class="secondary" type="button" data-action="delete-annotation" data-id="${esc(a.id)}">${tr('Delete','Hapus')}</button><button class="primary" type="submit">${tr('Save','Simpan')}</button></div></form>`);}
 function themeName(key){return({light:tr('Light','Terang'),dark:tr('Dark','Gelap'),system:tr('System','Sistem'),sepia:'Sepia',paper:tr('Paper','Kertas'),green:tr('Green','Hijau'),custom:tr('Custom','Kustom')})[key]||tr('Light','Terang');}
 function themeControls(){
  const d=pref(),selected=ctx.prefs().themeMode||'light';draftInk=d.customTextColor;draftPaper=d.customBackgroundColor;
  return `<p class="theme-global-caption">${tr('One theme for your library, menus and books.','Satu tema untuk Library, menu, dan buku Anda.')}</p><div class="global-theme-grid">${['light','dark','system','sepia','paper','green','custom'].map(key=>{const palette=palettes[key]||{background:key==='system'?'linear-gradient(90deg,#faf9f5 50%,#191d1b 50%)':d.customBackgroundColor,text:d.customTextColor};return `<button class="global-theme-chip ${selected===key?'active':''}" data-action="app-theme-preset" data-value="${key}" aria-pressed="${selected===key}"><i style="background:${palette.background};color:${palette.text}" aria-hidden="true">Aa</i><span>${themeName(key)}</span></button>`;}).join('')}</div><details class="custom-theme-editor" ${selected==='custom'?'open':''}><summary>${tr('Custom colors','Warna kustom')}</summary><div class="custom-theme-colors"><label for="reader-ink">${tr('Text','Teks')}</label><input type="color" id="reader-ink" aria-label="${tr('Text color','Warna teks')}" value="${d.customTextColor}"><label for="reader-paper">${tr('Background','Latar')}</label><input type="color" id="reader-paper" aria-label="${tr('Background color','Warna latar')}" value="${d.customBackgroundColor}"></div><div id="theme-preview" class="theme-preview"><span>KataKecil</span><span id="theme-contrast" role="status"></span></div><button class="secondary" data-action="apply-reader-theme">${tr('Apply colors','Terapkan warna')}</button></details>`;
 }
 function updateThemeSummary(){const label=$('#global-theme-summary');if(label)label.textContent=themeName(ctx.prefs().themeMode||'light');}
 function previewTheme(){const preview=$('#theme-preview');if(!preview)return;preview.style.background=draftPaper;preview.style.color=draftInk;const ratio=contrast(draftInk,draftPaper),valid=ratio>=4.5;$('#theme-contrast').textContent=ratio.toFixed(1)+':1'+(valid?'':' · '+tr('Use stronger contrast','Gunakan kontras lebih tinggi'));$('[data-action="apply-reader-theme"]').disabled=!valid;}
 function themeDialog(){panel='global-theme';showPanel(ctx.heading(tr('Theme','Tema'))+themeControls(),'global-theme');$('.dialog')?.classList.add('compact-settings-dialog');previewTheme();}
 function appearance(tab=appearanceTab){
  speech.pause();panel='appearance';appearanceTab=tab;ctx.mode('controls');const d=pref();
  const range=(name,key,min,max,step,value)=>field(name,key,'range',`min="${min}" max="${max}" step="${step}"`,value);
  const tabs=[['text',tr('Text','Teks'),'type'],['layout',tr('Layout','Tata letak'),'sliders'],['theme',tr('Theme','Tema'),'appearance']];
  let body='';
  if(tab==='text')body=`<div class="appearance-top-row">${select(tr('Font','Huruf'),'fontFamily',[['Lora','Lora'],['Plus Jakarta Sans','Jakarta Sans'],['system',tr('System','Sistem')],['Georgia','Georgia'],['monospace','Monospace']],ctx.prefs().fontFamily)}<button class="comfort-reset" data-action="comfort-reset">${icon('refresh')}<span>${tr('Comfort defaults','Default nyaman')}</span></button></div><div class="appearance-grid">${range(tr('Size','Ukuran'),'fontSize',14,32,1,d.fontSize)}${range(tr('Line height','Tinggi baris'),'lineHeight',1.2,2.4,.1,d.lineHeight)}${range(tr('Weight','Ketebalan'),'fontWeight',400,700,100,d.fontWeight)}${range(tr('Paragraph gap','Jarak paragraf'),'paragraphSpacing',0,32,1,d.paragraphSpacing)}</div>${select(tr('Alignment','Perataan'),'textAlign',[['left',tr('Left','Kiri')],['justify',tr('Justified','Rata kanan kiri')],['center',tr('Center','Tengah')],['right',tr('Right','Kanan')]],d.textAlign)}<details class="appearance-more"><summary>${tr('More text options','Opsi teks lainnya')}</summary><div class="appearance-grid">${range(tr('Letter spacing','Jarak huruf'),'letterSpacing',-.5,3,.1,d.letterSpacing)}${range(tr('First-line indent','Indentasi baris pertama'),'paragraphIndent',0,3,.25,d.paragraphIndent)}</div></details>`;
  else if(tab==='layout')body=`<div class="appearance-select-grid">${select(tr('Reading mode','Mode baca'),'readingMode',[['pages',tr('Pages','Halaman')],['scroll',tr('Scroll','Scroll')]],d.readingMode)}${select(tr('Wide screens','Layar lebar'),'spreadMode',[['single',tr('One page','Satu halaman')],['double',tr('Two pages','Dua halaman')]],ctx.prefs().spreadMode)}${select(tr('Animation','Animasi'),'pageAnimation',[['fade',tr('Fade','Pudar')],['slide',tr('Slide','Geser')],['none',tr('None','Tanpa')]],ctx.prefs().pageAnimation)}${select(tr('Position (pages)','Posisi (halaman)'),'contentPosition',[['top',tr('Top','Atas')],['center',tr('Center','Tengah')]],d.contentPosition)}</div><div class="appearance-grid">${range(tr('Side margin','Margin samping'),'marginHorizontal',12,72,2,d.marginHorizontal)}${range(tr('Vertical margin','Margin vertikal'),'marginVertical',8,80,2,d.marginVertical)}${range(tr('Column width','Lebar kolom'),'readerWidth',320,1100,20,d.readerWidth)}${range(tr('Brightness','Kecerahan'),'brightness',50,100,1,d.brightness)}</div><details class="appearance-more"><summary>${tr('Screen and gestures','Layar dan gestur')}</summary>${select(tr('Orientation','Orientasi'),'orientation',[['auto',tr('Automatic','Otomatis')],['portrait',tr('Portrait','Potret')],['landscape',tr('Landscape','Lanskap')]],ctx.prefs().orientation)}${check(tr('Tap edges to turn pages','Ketuk tepi untuk pindah halaman'),'tapNavigation',d.tapNavigation)}${check(tr('Keep screen awake','Jaga layar menyala'),'wakeLock',ctx.prefs().wakeLock)}</details>`;
  else body=themeControls();
  showPanel(ctx.heading(tr('Reading appearance','Tampilan baca'))+`<nav class="appearance-tabs" role="tablist" aria-label="${tr('Appearance sections','Bagian tampilan')}">${tabs.map(([key,title,symbol])=>`<button id="appearance-tab-${key}" data-action="appearance-tab" data-value="${key}" class="${key===tab?'active':''}" role="tab" aria-selected="${key===tab}" tabindex="${key===tab?'0':'-1'}" aria-controls="appearance-body">${icon(symbol)}<span>${title}</span></button>`).join('')}</nav><div id="appearance-body" class="reader-settings appearance-panel" role="tabpanel" aria-labelledby="appearance-tab-${tab}">${body}</div>`,'appearance');
  $('.dialog')?.classList.add('compact-settings-dialog');if(tab==='theme')previewTheme();
 }
 function confirmDefaults(){
  finishPeek();panel='comfort-confirm';
  showPanel(ctx.heading(tr('Reset text and layout?','Reset teks dan tata letak?'))+`<p class="dialog-caption">${tr('Restore font, spacing, margins, navigation and screen options to their comfort defaults.','Kembalikan huruf, spasi, margin, navigasi, dan opsi layar ke default nyaman.')}</p><p class="settings-caption">${tr('Theme, accent, app language and read-aloud preferences stay as they are.','Tema, aksen, bahasa aplikasi, dan pengaturan baca nyaring tetap seperti sekarang.')}</p><p class="form-error" role="alert" id="reset-settings-error"></p><div class="dialog-actions"><button class="secondary" data-action="comfort-reset-cancel">${tr('Cancel','Batal')}</button><button class="primary" data-action="comfort-reset-confirm">${icon('refresh')}${tr('Reset text and layout','Reset teks dan tata letak')}</button></div>`,'comfort-confirm');
 }
 async function restoreDefaults(){
  if(panel!=='comfort-confirm'||resetting)return;resetting=true;
  const button=$('[data-action="comfort-reset-confirm"]'),anchor=position();if(button)button.disabled=true;
  try{
   ctx.resetReadingPreferences();speech.stop();previewValues={};scrollPosition=anchor;ctx.apply();
   const effects=[wake.set(!!ctx.prefs().wakeLock)];if(ctx.setOrientation)effects.push(ctx.setOrientation(ctx.prefs().orientation||'auto'));
   await Promise.allSettled(effects);await ctx.reflow(anchor);
   if(panel==='comfort-confirm'){appearance('text');ctx.toast(tr('Text and layout restored.','Teks dan tata letak dipulihkan.'));}
  }catch(error){const field=$('#reset-settings-error');if(field)field.textContent=error.message||tr('Unable to reset settings. Try again.','Pengaturan belum dapat direset. Coba lagi.');}
  finally{resetting=false;if(button?.isConnected)button.disabled=false;}
 }
 function beginPeek(input){
  if(panel!=='appearance'||input.type!=='range')return;if(peek)return;
  const field=input.closest('.appearance-field');if(!field)return;
  // Keep the actual range in place so native touch dragging never loses its DOM/capture target.
  peek={input,field,anchor:position()};field.classList.add('reader-peek-control');document.body.classList.add('reader-previewing');$('.overlay-backdrop')?.classList.add('appearance-peeking');ctx.mode('reading');
 }
 function finishPeek(){
  if(!peek)return;const state=peek;peek=null;previewValues={};state.field.classList.remove('reader-peek-control');const value=ctx.prefs()[state.input.dataset.readerPref];state.input.value=value;const output=state.field.querySelector('output');if(output)output.textContent=value;document.body.classList.remove('reader-previewing');$('.overlay-backdrop')?.classList.remove('appearance-peeking');apply();if(ctx.book())ctx.mode('controls');
 }
 function endPeek(){
  const state=peek;if(!state)return;const key=state.input.dataset.readerPref,value=Number(state.input.value);
  // Persist synchronously before removing the preview. Pagination can finish in the background.
  if(ctx.prefs()[key]!==value)void changePreference(key,value).catch(e=>ctx.toast(e.message));
  finishPeek();
 }
 function tools(){panel='tools';ctx.mode('controls');const book=ctx.book(),a=position(),stats=readingStats(book.chapters[a.chapterIndex].text,book.language);
  ctx.show(ctx.heading(tr('Reading tools','Alat baca'))+`<div class="tool-grid"><button data-action="reader-search">${icon('search')}<span>${tr('Search episode','Cari dalam episode')}</span></button><button data-action="reader-speech">${icon('speaker')}<span>${tr('Read aloud','Baca nyaring')}</span></button><button data-action="previous-episode" ${a.chapterIndex===0?'disabled':''}>${icon('left')}<span>${tr('Previous episode','Episode sebelumnya')}</span></button><button data-action="next-episode" ${a.chapterIndex===book.chapters.length-1?'disabled':''}>${icon('chevron')}<span>${tr('Next episode','Episode berikutnya')}</span></button></div><form id="page-jump-form" class="page-jump"><label for="page-jump">${tr('Go to page','Ke halaman')}</label><input type="number" id="page-jump" min="1" max="${ctx.pages().length}" value="${ctx.index()+1}" required><button class="secondary" type="submit">${tr('Go','Buka')}</button></form><div class="reading-statistics"><span>${stats.words.toLocaleString()} ${tr('words','kata')}</span><span>≈ ${stats.minutes} ${tr('min / episode','menit / episode')}</span></div><p class="settings-caption">${tr('Copying and sharing book text are disabled. Select a passage to highlight, add a note, or open word tools.','Menyalin dan membagikan teks buku dinonaktifkan. Pilih teks untuk highlight, catatan, atau alat kata.')}</p>`);
 }
 function searchDialog(){panel='search';ctx.mode('controls');if(!search.query)search.chapterIndex=position().chapterIndex;
  showPanel(ctx.heading(tr('Search','Pencarian'))+`<form id="reader-search-form"><label class="field-label" for="reader-search-query">${tr('Word or sentence','Kata atau kalimat')}</label><input id="reader-search-query" class="text-input" maxlength="200" value="${esc(search.query)}" type="search" autocomplete="off"><label class="field-label" for="search-episode">${tr('Episode','Episode')}</label><select id="search-episode">${ctx.book().chapters.map((c,i)=>`<option data-book-content translate="no" value="${i}" ${i===search.chapterIndex?'selected':''}>${esc(chapterName(i))}</option>`).join('')}</select><button type="submit" class="primary">${tr('Search','Cari')}</button></form><div id="search-results" aria-live="polite">${searchResults()}</div>`,'search');
 }
 function searchResults(){
  if(!search.query)return `<p class="settings-caption">${tr('Search stays on this device.','Pencarian tetap di perangkat ini.')}</p>`;
  const text=ctx.book().chapters[search.chapterIndex].text;
  return `<div class="search-summary"><span>${search.total} ${tr('results','hasil')}${search.total>search.matches.length?' · '+tr('first 1,000 shown','1.000 pertama ditampilkan'):''}</span><button class="icon-button" data-action="search-previous" ${search.total?'':'disabled'} aria-label="${tr('Previous result','Hasil sebelumnya')}">${icon('left')}</button><button class="icon-button" data-action="search-next" ${search.total?'':'disabled'} aria-label="${tr('Next result','Hasil berikutnya')}">${icon('chevron')}</button><button class="icon-button" data-action="clear-search" aria-label="${tr('Clear search','Hapus pencarian')}">${icon('close')}</button></div>${search.matches.slice(0,100).map((m,i)=>`<button class="search-result" data-action="search-result" data-index="${i}"><span>${i+1}</span><span data-book-content translate="no">${esc(text.slice(Math.max(0,m.start-35),m.start))}<strong>${esc(text.slice(m.start,m.end))}</strong>${esc(text.slice(m.end,m.end+65))}</span></button>`).join('')}`;
 }
 function searchJump(index){if(!search.matches.length)return;search.index=(index+search.matches.length)%search.matches.length;const match=search.matches[search.index];ctx.close();jump({chapterIndex:search.chapterIndex,start:match.start});ctx.mode('reading');showSearchNavigation();}
 function showSearchNavigation(){let el=$('.search-navigation');if(!el){el=document.createElement('aside');el.className='search-navigation glass';el.setAttribute('aria-label',tr('Search results','Hasil pencarian'));$('.reader-shell')?.appendChild(el);}el.innerHTML=`<button class="icon-button" data-action="search-previous" aria-label="${tr('Previous result','Hasil sebelumnya')}">${icon('left')}</button><span>${search.index+1} / ${search.total}</span><button class="icon-button" data-action="search-next" aria-label="${tr('Next result','Hasil berikutnya')}">${icon('chevron')}</button><button class="icon-button" data-action="clear-search" aria-label="${tr('Close search results','Tutup hasil pencarian')}">${icon('close')}</button>`;}
 function lookup(){const selection=ctx.selection();if(!selection)return;lookupSelection={...selection};panel='lookup';speech.pause();ctx.mode('controls');
  ctx.show(ctx.heading(tr('Word tools','Alat kata'))+`<blockquote class="note-quote" data-book-content translate="no">${esc(selection.selectedText)}</blockquote><p class="settings-caption">${tr('Only this selection is sent when you press Look up or Translate. These external services may log requests.','Hanya pilihan ini dikirim saat Anda menekan Cari arti atau Terjemahkan. Layanan eksternal dapat mencatat permintaan.')}</p><div class="lookup-languages"><label>${tr('From','Dari')}<select id="lookup-source">${languageOptions(ctx.book().language?.split('-')[0]||'id')}</select></label><label>${tr('To','Ke')}<select id="lookup-target">${languageOptions(ctx.book().language?.startsWith('en')?'id':'en')}</select></label></div><div class="dialog-actions"><button class="secondary" data-action="lookup-definition">${tr('Look up','Cari arti')}</button><button class="primary" data-action="lookup-translate">${tr('Translate','Terjemahkan')}</button></div><div id="lookup-result" class="lookup-result" role="status"></div>`);
 }
 function languageOptions(selected){return [['id','Bahasa Indonesia'],['en','English'],['es','Español'],['fr','Français'],['de','Deutsch'],['ja','日本語'],['ko','한국어'],['zh','中文']].map(([v,l])=>`<option value="${v}" ${v===selected?'selected':''}>${l}</option>`).join('');}
 async function lookupFetch(kind){
  if(!lookupSelection||!$('#lookup-result'))return;lookupAbort?.abort();lookupAbort=new AbortController();const controller=lookupAbort,request=++lookupRequest,box=$('#lookup-result');
  const timeout=setTimeout(()=>controller.abort(),12000);box.textContent=tr('Looking up…','Mencari…');box.setAttribute('aria-busy','true');
  try{const source=$('#lookup-source').value,target=$('#lookup-target').value;const result=kind==='dictionary'?await dictionaryLookup(lookupSelection.selectedText,source,controller.signal):await translateSelection(lookupSelection.selectedText,source,target,controller.signal);if(request!==lookupRequest||!box.isConnected)return;box.replaceChildren();const text=document.createElement('p');text.textContent=result.text;text.setAttribute('data-no-translate','');const attribution=document.createElement('small');if(result.url){const link=document.createElement('a');link.href=result.url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=result.source;attribution.append(link,document.createTextNode(' · '+result.license));}else attribution.textContent=result.source;box.append(text,attribution);
  }catch(error){if(request===lookupRequest&&box.isConnected)box.textContent=error.name==='AbortError'?tr('Request timed out. Try again.','Permintaan habis waktu. Coba lagi.'):error.message;}finally{clearTimeout(timeout);if(box.isConnected)box.setAttribute('aria-busy','false');}
 }
 async function speechDialog(){
  panel='speech';ctx.mode('controls');showPanel(ctx.heading(tr('Read aloud','Baca nyaring'))+`<p role="status">${tr('Loading available voices…','Memuat suara yang tersedia…')}</p>`,'speech');
  try{await speech.initialize();if(panel!=='speech'||!ctx.book())return;
   showPanel(ctx.heading(tr('Read aloud','Baca nyaring'))+`<p class="tts-book-context" data-book-content translate="no">${esc(chapterName(position().chapterIndex))}</p><div class="tts-config"><label for="tts-language">${tr('Language','Bahasa')}</label><select id="tts-language">${[...new Set(speech.voices.map(v=>v.lang))].map(lang=>`<option value="${esc(lang)}" ${lang===(ctx.prefs().ttsLanguage||speech.voices.find(v=>v.lang.startsWith(ctx.book().language))?.lang)?'selected':''}>${esc(lang)}</option>`).join('')}</select><label for="tts-voice">${tr('Voice','Suara')}</label><select id="tts-voice"></select></div>${field(tr('Speed','Kecepatan'),'ttsRate','range','min="0.5" max="2" step="0.1"',ctx.prefs().ttsRate||1)}<p class="tts-state" role="status"></p><div class="tts-player"><button class="primary" data-action="tts-play">${icon('play')}<span>${tr('Play / resume','Putar / lanjut')}</span></button><button class="secondary" data-action="tts-pause" aria-label="${tr('Pause','Jeda')}">${icon('pause')}</button><button class="secondary" data-action="tts-stop" aria-label="${tr('Stop','Hentikan')}">${icon('close')}</button></div><button class="text-link" data-action="tts-from-here">${tr('Start from this position','Mulai dari posisi ini')}</button><details class="tts-about"><summary>${tr('About voices','Tentang suara')}</summary><p>${tr('Local voices stay on your device. Online voices use your browser provider. Voices without word events use word-by-word playback to keep the highlight accurate.','Suara lokal tetap di perangkat. Suara daring memakai layanan browser. Suara tanpa event kata dibaca per kata agar highlight tetap akurat.')}</p></details>`,'speech');$('.dialog')?.classList.add('compact-settings-dialog');updateVoices();updateSpeechUI();
  }catch(error){if(panel==='speech')showPanel(ctx.heading(tr('Read aloud','Baca nyaring'))+`<p class="form-error" role="alert">${esc(error.message||tr('Speech is unavailable in this browser.','Suara tidak tersedia di browser ini.'))}</p>`,'speech');}
 }
 function updateVoices(){const language=$('#tts-language')?.value,select=$('#tts-voice');if(!select)return;const voices=speech.voices.filter(v=>v.lang===language).sort((a,b)=>Number(b.localService)-Number(a.localService)),preferred=voices.find(v=>v.voiceURI===ctx.prefs().ttsVoice)||voices[0];select.innerHTML=voices.map(v=>`<option value="${esc(v.voiceURI)}" ${v===preferred?'selected':''}>${esc(v.name)} · ${v.localService?tr('on device','di perangkat'):tr('online','daring')}</option>`).join('');}
 function speechOptions(){return{language:$('#tts-language')?.value||ctx.prefs().ttsLanguage||ctx.book().language,rate:Number(ctx.prefs().ttsRate)||1,voiceURI:$('#tts-voice')?.value||ctx.prefs().ttsVoice};}
 async function playSpeech(fromHere=false){
  if(speech.state==='paused'&&!fromHere){ctx.close();ctx.mode('reading');speech.resume();return;}if(speech.state==='playing'&&!fromHere){ctx.close();ctx.mode('reading');return;}
  const book=ctx.book(),saved=ctx.progress(book.id)?.tts,a=position();
  let start={chapterIndex:a.chapterIndex,charOffset:a.start};
  if(!fromHere&&saved?.anchor){const resolved=resolveAnchor(book.chapters,saved.anchor);if(resolved)start={chapterIndex:resolved.chapterIndex,charOffset:resolved.start};}
  const options=speechOptions();ctx.savePreferences({ttsLanguage:options.language,ttsVoice:options.voiceURI,ttsRate:options.rate});
  ctx.close();ctx.mode('reading');await speech.play(book.chapters,start,options);
 }
 function persistSpeech(pos,force=false){pendingSpeechPosition={...pos};if(!force&&performance.now()-lastSpeechSave<1000)return;lastSpeechSave=performance.now();const book=ctx.book(),chapter=book?.chapters[pos.chapterIndex];if(!chapter?.text.length)return;const offset=Math.min(chapter.text.length-1,pos.charOffset);ctx.saveSpeech({chapterIndex:pos.chapterIndex,charOffset:offset,anchor:makeAnchor(chapter,offset,Math.min(chapter.text.length,offset+80))});}
 function speechAt(pos,end,word){
  if(!ctx.book())return;if(word&&speechWord?.chapterIndex===pos.chapterIndex&&speechWord.start===pos.charOffset&&speechWord.end===end)return;persistSpeech(pos);const index=findPage(ctx.pages(),pos.chapterIndex,pos.charOffset),shown=renderedPages(ctx.index());
  let outside=!shown.some(p=>p.chapterIndex===pos.chapterIndex&&pos.charOffset>=p.start&&pos.charOffset<p.end);if(mode()==='scroll'&&!outside){const root=$('.page-text'),range=textRange(root,pos.charOffset,Math.min(root.textContent.length,pos.charOffset+1)),box=root.closest('.page-inner').getBoundingClientRect(),rect=range?.getBoundingClientRect();outside=!rect||rect.top<box.top||rect.bottom>box.bottom;}
  if(outside){if(index>=0)jump({chapterIndex:pos.chapterIndex,start:pos.charOffset},'speech');}
  if(word)speechWord={chapterIndex:pos.chapterIndex,start:pos.charOffset,end};else{speechRange={chapterIndex:pos.chapterIndex,start:pos.charOffset,end};speechWord=null;}paintSpeech();
 }
 function clearSpeechPaint(){$$('.tts-paint-layer').forEach(el=>el.remove());window.CSS?.highlights?.delete('katakecil-tts-word');speechRange=null;speechWord=null;}
 function paintSpeech(){
  $$('.tts-paint-layer').forEach(el=>el.remove());window.CSS?.highlights?.delete('katakecil-tts-word');
  if(!['playing','paused'].includes(speech.state)||!speechWord)return;
  const range=speechWord,nativeRanges=[];
  for(const root of $$('.page-text')){if(Number(root.dataset.chapterIndex)!==range.chapterIndex)continue;
   const offset=Number(root.dataset.start||0),start=Math.max(0,range.start-offset),end=Math.min(root.textContent.length,range.end-offset);if(end<=start)continue;
   const domRange=textRange(root,start,end);if(!domRange)continue;nativeRanges.push(domRange);
   if(window.Highlight&&window.CSS?.highlights)continue;
   const layer=document.createElement('div');layer.className='tts-paint-layer tts-word';layer.setAttribute('aria-hidden','true');const box=(mode()==='scroll'?root.closest('.page-inner'):root).getBoundingClientRect();
   for(const r of Array.from(domRange.getClientRects?.()||[])){const top=Math.max(r.top,box.top),bottom=Math.min(r.bottom,box.bottom);if(bottom<=top)continue;const rect=document.createElement('i');Object.assign(rect.style,{left:r.left+'px',top:top+'px',width:r.width+'px',height:bottom-top+'px'});layer.appendChild(rect);}$('.reader-shell')?.appendChild(layer);
  }
  if(nativeRanges.length&&window.Highlight&&window.CSS?.highlights)window.CSS.highlights.set('katakecil-tts-word',new window.Highlight(...nativeRanges));
 }
 function updateSpeechUI(){
  if(speech.state!=='playing'&&pendingSpeechPosition){persistSpeech(pendingSpeechPosition,true);pendingSpeechPosition=null;}
  const state={idle:tr('Ready','Siap'),loading:tr('Loading voices…','Memuat suara…'),playing:tr('Reading aloud','Membaca nyaring'),paused:tr('Paused','Dijeda'),error:tr('Speech unavailable','Suara tidak tersedia')}[speech.state];$$('.tts-state').forEach(el=>el.textContent=state);
  const active=['playing','paused'].includes(speech.state);let mini=$('.tts-mini');
  if(!active){mini?.remove();clearSpeechPaint();return;}if(!ctx.book())return;
  if(!mini){mini=document.createElement('aside');mini.className='tts-mini glass';mini.setAttribute('aria-label',tr('Read aloud controls','Kontrol baca nyaring'));$('.reader-shell')?.appendChild(mini);}
  mini.innerHTML=`${icon('speaker')}<span>${state}</span><button class="icon-button" data-action="${speech.state==='paused'?'tts-resume':'tts-pause'}" aria-label="${speech.state==='paused'?tr('Resume','Lanjutkan'):tr('Pause','Jeda')}">${icon(speech.state==='paused'?'play':'pause')}</button><button class="icon-button" data-action="tts-stop" aria-label="${tr('Stop','Hentikan')}">${icon('close')}</button>`;
 }
 async function changePreference(key,value){
  const anchor=peek?.anchor||position(),previous=ctx.prefs()[key];delete previewValues[key];ctx.savePreferences({[key]:value});ctx.apply();
  if(key==='wakeLock'){try{await wake.set(!!value);}catch(error){ctx.toast(error.message);}return;}
  if(key==='orientation'){try{if(ctx.setOrientation)await ctx.setOrientation(value);else if(value==='auto')screen.orientation?.unlock?.();else if(screen.orientation?.lock)await screen.orientation.lock(value);else ctx.toast(tr('Orientation lock is unavailable. Rotate your device manually.','Kunci orientasi tidak tersedia. Putar perangkat secara manual.'));}catch{ctx.toast(tr('The browser did not allow orientation lock.','Browser tidak mengizinkan kunci orientasi.'));}return;}
  if(key==='ttsRate'){speech.setRate(Number(value));return;}
  if(['brightness','tapNavigation','pageAnimation'].includes(key))return;
  speech.stop();scrollPosition=anchor;try{await ctx.reflow(anchor);}catch(error){ctx.savePreferences({[key]:previous});ctx.apply();await ctx.reflow(anchor);throw error;}
 }
 function input(el){
  if(el.dataset.readerPref&&el.type==='range'){const output=$('[data-output="'+el.dataset.readerPref+'"]');if(output)output.textContent=el.value;if(peek?.input===el){previewValues={[el.dataset.readerPref]:Number(el.value)};apply();paintSpeech();}return true;}
  if(el.id==='reader-ink'||el.id==='reader-paper'){draftInk=$('#reader-ink').value;draftPaper=$('#reader-paper').value;previewTheme();return true;}
  return false;
 }
 function change(el){
  if(el.dataset.readerPref){const value=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;if(ctx.prefs()[el.dataset.readerPref]!==value)void changePreference(el.dataset.readerPref,value).catch(e=>ctx.toast(e.message));return true;}
  if(el.id==='annotation-episode'||el.id==='annotation-color'){filters[el.id==='annotation-episode'?'episode':'color']=el.value;$('#drawer-content').innerHTML=contentsBody();return true;}
  if(el.id==='tts-language'){ctx.savePreferences({ttsLanguage:el.value});updateVoices();speech.stop();return true;}
  if(el.id==='tts-voice'){ctx.savePreferences({ttsVoice:el.value});speech.stop();return true;}
  return false;
 }
 function submit(event){
  if(event.target.id==='reader-search-form'){event.preventDefault();search.query=$('#reader-search-query').value.trim();search.chapterIndex=Number($('#search-episode').value);const result=findMatches(ctx.book().chapters[search.chapterIndex].text,search.query);search={...search,...result,index:-1};$('#search-results').innerHTML=searchResults();ctx.paint();return true;}
  if(event.target.id==='page-jump-form'){event.preventDefault();const index=Number($('#page-jump').value)-1;if(!Number.isInteger(index)||index<0||index>=ctx.pages().length)return true;ctx.close();const pg=ctx.pages()[index];jump({chapterIndex:pg.chapterIndex,start:pg.start});ctx.mode('reading');return true;}
  if(event.target.id==='bookmark-label-form'){event.preventDefault();const a=ctx.annotations().find(a=>a.id===event.target.dataset.id&&a.bookId===ctx.book()?.id&&a.type==='bookmark');if(a)ctx.saveAnnotation({...a,label:$('#bookmark-label').value.trim().slice(0,120)});ctx.close();ctx.toast(tr('Bookmark saved.','Bookmark tersimpan.'));return true;}
  return false;
 }
 function action(button){const value=button.dataset.value;switch(button.dataset.action){
  case 'delete-note':{const a=ctx.annotations().find(a=>a.id===button.dataset.id&&a.bookId===ctx.book()?.id&&a.type==='highlight');if(a){ctx.saveAnnotation({...a,noteText:''});ctx.close();ctx.paint();ctx.toast(tr('Note removed; highlight kept.','Catatan dihapus; highlight tetap tersimpan.'));}return true;}
  case 'reader-tools':tools();return true;
  case 'reader-search':searchDialog();return true;
  case 'reader-speech':void speechDialog();return true;
  case 'reader-tab':activeTab=value;contents(value);$('#reader-tab-'+value)?.focus();return true;
  case 'previous-episode':nextChapter(-1);return true;
  case 'next-episode':nextChapter(1);return true;
  case 'appearance-tab':endPeek();appearance(value);$('#appearance-tab-'+value)?.focus({preventScroll:true});return true;
  case 'global-theme':themeDialog();return true;
  case 'comfort-reset':confirmDefaults();return true;
  case 'comfort-reset-cancel':if(panel==='comfort-confirm'&&!resetting)appearance(appearanceTab);return true;
  case 'comfort-reset-confirm':void restoreDefaults();return true;
  case 'app-theme-preset':ctx.savePreferences({themeMode:value,readerTheme:'follow',globalThemeVersion:1});ctx.apply();if(panel==='appearance')appearance('theme');else themeDialog();updateThemeSummary();return true;
  case 'apply-reader-theme':if(contrast(draftInk,draftPaper)<4.5)return true;ctx.savePreferences({themeMode:'custom',readerTheme:'follow',globalThemeVersion:1,customTextColor:draftInk,customBackgroundColor:draftPaper});ctx.apply();if(panel==='appearance')appearance('theme');else themeDialog();updateThemeSummary();return true;
  case 'selection-tools':lookup();return true;
  case 'lookup-definition':void lookupFetch('dictionary');return true;
  case 'lookup-translate':void lookupFetch('translation');return true;
  case 'search-result':searchJump(Number(button.dataset.index));return true;
  case 'search-next':searchJump(search.index+1);return true;
  case 'search-previous':searchJump(search.index-1);return true;
  case 'clear-search':search={...search,query:'',matches:[],total:0,index:-1};$('.search-navigation')?.remove();ctx.paint();if(panel==='search')searchDialog();return true;
  case 'tts-play':void playSpeech().catch(e=>ctx.toast(e.message));return true;
  case 'tts-from-here':void playSpeech(true).catch(e=>ctx.toast(e.message));return true;
  case 'tts-pause':speech.pause();return true;
  case 'tts-resume':speech.resume();return true;
  case 'tts-stop':speech.stop();return true;
  case 'export-reader':{const book=ctx.book();ctx.download('katakecil-'+book.id+'-annotations.json',JSON.stringify({schemaVersion:1,bookId:book.id,bookTitle:book.title,exportedAt:new Date().toISOString(),annotations:ctx.annotations().filter(a=>a.bookId===book.id)},null,2));return true;}
  default:return false;
 }}
 document.addEventListener('pointerdown',event=>{if(event.target.matches?.('input[type=range][data-reader-pref]'))beginPeek(event.target);},true);
 document.addEventListener('pointerup',endPeek,true);document.addEventListener('pointercancel',finishPeek,true);
 document.addEventListener('keydown',event=>{if(event.target.matches?.('input[type=range][data-reader-pref]')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key)){beginPeek(event.target);}if(peek&&event.key==='Tab')endPeek();if(peek&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();finishPeek();}},true);
 document.addEventListener('keyup',event=>{if(peek?.input===event.target)endPeek();},true);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'){speech.pause();void wake.set(false);}else if(ctx.book())void wake.set(!!ctx.prefs().wakeLock).catch(()=>{});});
 window.addEventListener('pagehide',()=>{speech.stop();void wake.set(false);});
 document.addEventListener('toggle',event=>{if(event.target.matches?.('.toc-arc'))arcOpen.set(event.target.dataset.arcId,event.target.open);},true);
 document.addEventListener('keydown',event=>{if(event.target.closest?.('.appearance-tabs')&&['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const tabs=$$('.appearance-tabs button'),index=tabs.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next]?.click();return;}if(!event.target.closest?.('.reader-tabs')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.stopPropagation();const tabs=$$('.reader-tabs .tab'),index=tabs.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next]?.click();});
 return{apply,enter,leave,closePanel,position,mode,spread,renderedPages,renderText,measureText,afterRender,jump,anchorMetadata,resolveAnnotations,savedPosition,progressMetadata,contents,contentsBody,appearance,themeDialog,bookmarkDialog,action,input,change,submit,
  stopSpeech:()=>speech.stop(),pauseSpeech:()=>speech.pause(),resumeScreen:()=>wake.set(!!ctx.prefs().wakeLock),paintSpeech,clearSpeechPaint,refreshPanel:()=>{if(panel==='appearance')appearance();else if(panel==='global-theme')themeDialog();else if(panel==='contents')contents();},
  signature:()=>JSON.stringify(Object.fromEntries([...Object.keys(readerDefaults),'fontFamily','fontSize','lineHeight','spreadMode'].filter(k=>!['readerTheme','customTextColor','customBackgroundColor','brightness','wakeLock','ttsVoice','ttsLanguage','ttsRate','tapNavigation','pageAnimation'].includes(k)).map(k=>[k,ctx.prefs()[k]]))),
  setPosition:anchor=>{scrollPosition={chapterIndex:anchor.chapterIndex,start:anchor.start??anchor.charOffset??0};},
  rootFor:event=>event?.target?.closest?.('.page-text')||document.activeElement?.closest?.('.page-text')||$('.page-text'),
 };
}
