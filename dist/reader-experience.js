import {makeAnchor,resolveAnchor,migrateLegacyAnchor,readerDefaults,readerSettings,palettes,contrast,spreadEnabled,findPage,findMatches,readingStats,ReadAloud,ReadingWakeLock,dictionaryLookup,translateSelection} from './advanced-reader.js?v=8';
import {escapeHTML as esc,icon,$,$$} from './ui.js?v=9';
import {textRange,offsetAtPoint} from './text-selection.js?v=8';


export function paragraphMarkup(text,start=0,source=text,decorate=(value)=>esc(value)){
 const parts=text.split('\n\n');let offset=start;
 return parts.map((part,index)=>{const separator=index<parts.length-1?'\n\n':'';if(!part&&!separator)return'';const paragraphStart=offset===0||source.slice(offset-2,offset)==='\n\n';const result=`<span class="reader-paragraph ${paragraphStart?'paragraph-start':''}" data-offset="${offset}">${decorate(part,offset)}${separator?`<span class="paragraph-break">${decorate(separator,offset+part.length)}</span>`:''}</span>`;offset+=part.length+separator.length;return result;}).join('');
}

// UI glue around the existing pagination, gestures and device store. No new account or backend.
export function createReaderExperience(ctx){
 const tr=(en,id=en)=>ctx.prefs().uiLanguage==='id'?id:en;
 const pref=()=>readerSettings(ctx.prefs());
 let panel='',scrollPosition=null,scrollTimer,scrollRestore=false,filters={episode:'all',color:'all'},activeTab='contents';
 let search={query:'',chapterIndex:0,matches:[],total:0,index:-1},lookupSelection=null,lookupRequest=0,lookupAbort=null;
 let pendingSpeechPosition=null,lastSpeechSave=0;
 let draftTheme='follow',draftInk='#28302b',draftPaper='#faf9f5',speechRange=null,speechWord=null;
 const wake=new ReadingWakeLock();
 const speech=new ReadAloud({change:()=>updateSpeechUI(),sentence:(pos,end)=>speechAt(pos,end,false),word:(pos,end)=>speechAt(pos,end,true),error:message=>ctx.toast(message)});
 const chapterName=index=>ctx.book()?.chapters[index]?.navigationTitle||ctx.book()?.chapters[index]?.title||tr('Book information','Informasi buku');
 const field=(label,key,type,attributes,value)=>`<label class="reader-setting"><span>${label}</span><input data-reader-pref="${key}" type="${type}" ${attributes} value="${esc(value)}"><output data-output="${key}">${esc(value)}</output></label>`;
 const select=(label,key,options,value)=>`<label class="reader-setting"><span>${label}</span><select data-reader-pref="${key}" aria-label="${label}">${options.map(([id,title])=>`<option value="${id}" ${id===String(value)?'selected':''}>${title}</option>`).join('')}</select></label>`;
 const check=(label,key,checked)=>`<label class="reader-setting"><span>${label}</span><input data-reader-pref="${key}" type="checkbox" ${checked?'checked':''}></label>`;
 function position(){const pg=ctx.pages()[ctx.index()];return scrollPosition&&pg&&scrollPosition.chapterIndex===pg.chapterIndex&&(pref().readingMode==='scroll'||scrollPosition.start>=pg.start&&scrollPosition.start<pg.end)?{...scrollPosition}:pg?{chapterIndex:pg.chapterIndex,start:pg.start}:{chapterIndex:0,start:0};}
 function mode(){return pref().readingMode;}
 function spread(){return spreadEnabled(ctx.prefs(),innerWidth);}
 function apply(){
  const s=document.documentElement.style,d=pref();
  const font={Lora:"'Lora',Georgia,serif",'Plus Jakarta Sans':"'Plus Jakarta Sans',system-ui,sans-serif",'DM Sans':'system-ui,sans-serif',Georgia:'Georgia,serif',system:'system-ui,sans-serif',monospace:'ui-monospace,monospace'}[ctx.prefs().fontFamily]||"'Lora',Georgia,serif";
  const theme=d.readerTheme==='follow'?(document.body.dataset.theme==='dark'?'dark':'light'):d.readerTheme;
  let palette=palettes[theme]||{background:d.customBackgroundColor,text:d.customTextColor};
  if(contrast(palette.text,palette.background)<4.5)palette=palettes.light;
  for(const [name,value] of Object.entries({'reader-font':font,'reader-size':d.fontSize+'px','reader-line':d.lineHeight,'reader-weight':d.fontWeight,'paragraph-space':d.paragraphSpacing+'px','letter-space':d.letterSpacing+'px','paragraph-indent':d.paragraphIndent+'em','reader-align':d.textAlign,'reader-inset-x':d.marginHorizontal+'px','reader-inset-y':Math.min(d.marginVertical,Math.max(8,(innerHeight-220)/2))+'px','reader-width':d.readerWidth+'px','reader-paper':palette.background,'reader-ink':palette.text,'reader-brightness':(100-d.brightness)/100,'content-position':d.contentPosition==='center'?'center':'flex-start'}))s.setProperty('--'+name,String(value));
  const shell=$('.reader-shell');if(shell){shell.dataset.readingMode=mode();shell.dataset.spread=String(spread());shell.dataset.animation=ctx.prefs().pageAnimation||'slide';}
 }
 function enter(){panel='';scrollPosition=null;pendingSpeechPosition=null;lastSpeechSave=0;filters={episode:'all',color:'all'};activeTab='contents';search={query:'',chapterIndex:0,matches:[],total:0,index:-1};apply();void wake.set(!!ctx.prefs().wakeLock).catch(()=>{});}
 function leave(){speech.stop();void wake.set(false);clearTimeout(scrollTimer);lookupAbort?.abort();lookupRequest++;lookupSelection=null;scrollPosition=null;panel='';clearSpeechPaint();}
 function closePanel(){panel='';lookupAbort?.abort();lookupRequest++;}
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
 function contents(tab=activeTab){
  if(!ctx.book())return;activeTab=tab;panel='contents';ctx.mode('controls');
  const tabs=[['contents',tr('Contents','Daftar isi'),'list'],['highlights',tr('Highlights','Highlight'),'quote'],['notes',tr('Notes','Catatan'),'notes'],['bookmarks',tr('Bookmarks','Bookmark'),'bookmark']];
  ctx.show(ctx.heading(tr('This book','Buku ini'))+`<div class="tabs reader-tabs" role="tablist" aria-label="${tr('Book panels','Panel buku')}">${tabs.map(([key,title,glyph])=>`<button class="tab ${key===activeTab?'active':''}" role="tab" id="reader-tab-${key}" aria-controls="drawer-content" aria-selected="${key===activeTab}" tabindex="${key===activeTab?'0':'-1'}" data-action="reader-tab" data-value="${key}">${icon(glyph)}<span>${title}</span></button>`).join('')}</div><div id="drawer-content" role="tabpanel" aria-labelledby="reader-tab-${activeTab}">${contentsBody()}</div>`);
 }
 function contentsBody(){
  const book=ctx.book();if(!book)return'';
  if(activeTab==='contents')return `<nav class="toc-list" aria-label="${tr('Contents','Daftar isi')}">${book.chapters.map((c,i)=>`<button class="toc-item ${position().chapterIndex===i?'active':''}" data-action="chapter" data-index="${i}"><span>${String(i+1).padStart(2,'0')}</span><span data-book-content translate="no">${esc(chapterName(i))}</span></button>`).join('')}</nav>`;
  const entries=ctx.annotations().filter(a=>a.bookId===book.id&&(activeTab==='bookmarks'?a.type==='bookmark':a.type==='highlight'&&(activeTab!=='notes'||a.noteText))&&(filters.episode==='all'||a.chapterIndex===Number(filters.episode))&&(activeTab==='bookmarks'||filters.color==='all'||a.color===filters.color));
  return `<div class="annotation-filters"><label><span class="sr-only">${tr('Episode','Episode')}</span><select id="annotation-episode" aria-label="${tr('Filter by episode','Filter episode')}"><option value="all">${tr('All episodes','Semua episode')}</option>${book.chapters.map((c,i)=>`<option data-book-content translate="no" value="${i}" ${filters.episode===String(i)?'selected':''}>${esc(chapterName(i))}</option>`).join('')}</select></label>${activeTab!=='bookmarks'?`<label><span class="sr-only">${tr('Color','Warna')}</span><select id="annotation-color" aria-label="${tr('Filter by color','Filter warna')}">${[['all',tr('All colors','Semua warna')],['amber',tr('Yellow','Kuning')],['emerald',tr('Green','Hijau')],['sapphire',tr('Blue','Biru')],['rose',tr('Pink','Merah muda')]].map(([id,title])=>`<option value="${id}" ${id===filters.color?'selected':''}>${title}</option>`).join('')}</select></label>`:''}<button class="icon-button" data-action="export-reader" aria-label="${tr('Export annotations','Ekspor anotasi')}">${icon('download')}</button></div>${entries.length?entries.map(a=>`<article class="saved-passage" style="--mark:${{amber:'#e7ca7e',emerald:'#a4c9ae',sapphire:'#acc7e6',rose:'#e4b3c3'}[a.color]||'#acc7e6'}"><small data-book-content translate="no">${esc(a.needsReview?tr('Published location needs review','Lokasi terbit perlu ditinjau'):chapterName(a.chapterIndex))}</small>${a.type==='bookmark'?`<p data-book-content translate="no">${esc(a.label||tr('Saved position','Posisi tersimpan'))}</p>`:`<blockquote data-book-content translate="no">${esc(a.needsReview&&book.source==='supabase'?tr('Original quotation is kept in your annotation export.','Kutipan asli tersimpan dalam ekspor anotasi Anda.'):a.selectedText)}</blockquote>`}${a.needsReview?`<p class="unresolved-note">${tr('The text changed. Review this annotation before jumping.','Teks berubah. Tinjau anotasi sebelum membukanya.')}</p>`:''}${a.noteText?`<p class="note-text" data-book-content translate="no">${esc(a.noteText)}</p>`:''}<div class="passage-actions"><button data-action="jump-annotation" data-id="${esc(a.id)}" ${a.needsReview?'disabled':''}>${tr('Go to passage','Buka bagian')}</button><button class="icon-button" data-action="edit-annotation" data-id="${esc(a.id)}" aria-label="${tr('Edit annotation','Edit anotasi')}">${icon('edit')}</button><button class="icon-button" data-action="${activeTab==='notes'?'delete-note':'delete-annotation'}" data-id="${esc(a.id)}" aria-label="${activeTab==='notes'?tr('Remove note','Hapus catatan'):tr('Delete annotation','Hapus anotasi')}">${icon('trash')}</button></div></article>`).join(''):`<div class="empty-state small"><p>${tr('No saved items match these filters.','Belum ada simpanan untuk filter ini.')}</p></div>`}`;
 }
 function bookmarkDialog(a){panel='bookmark';ctx.show(ctx.heading(tr('Bookmark','Bookmark'))+`<p class="dialog-caption" data-book-content translate="no">${esc(chapterName(a.chapterIndex))}</p><form id="bookmark-label-form" data-id="${esc(a.id)}"><label class="field-label" for="bookmark-label">${tr('Label','Label')}</label><input id="bookmark-label" class="text-input" maxlength="120" value="${esc(a.label||'')}"><div class="dialog-actions"><button class="secondary" type="button" data-action="delete-annotation" data-id="${esc(a.id)}">${tr('Delete','Hapus')}</button><button class="primary" type="submit">${tr('Save','Simpan')}</button></div></form>`);}
 function appearance(){
  panel='appearance';ctx.mode('controls');const d=pref();draftTheme=d.readerTheme;draftInk=d.customTextColor;draftPaper=d.customBackgroundColor;
  const range=(name,key,min,max,step,value)=>field(name,key,'range',`min="${min}" max="${max}" step="${step}"`,value);
  ctx.show(ctx.heading(tr('Reading appearance','Tampilan baca'))+`<div class="reader-settings"><section><h3>${tr('Reading mode','Mode baca')}</h3>${select(tr('Navigation','Navigasi'),'readingMode',[['pages',tr('Pages','Halaman')],['scroll',tr('Continuous scroll','Scroll berkelanjutan')]],d.readingMode)}${select(tr('Pages on wide screens','Halaman di layar lebar'),'spreadMode',[['single',tr('One page','Satu halaman')],['double',tr('Two pages (1,000px+)','Dua halaman (1.000px+)')]],ctx.prefs().spreadMode)}${select(tr('Page transition','Animasi halaman'),'pageAnimation',[['slide',tr('Slide','Geser')],['fade',tr('Fade','Pudar')],['none',tr('None','Tanpa animasi')]],ctx.prefs().pageAnimation)}${check(tr('Tap the edges to turn pages','Ketuk tepi untuk pindah halaman'),'tapNavigation',d.tapNavigation)}</section><section><h3>${tr('Typography','Tipografi')}</h3>${select(tr('Font family','Jenis huruf'),'fontFamily',[['Lora','Lora'],['Plus Jakarta Sans','Jakarta Sans'],['system',tr('System','Sistem')],['Georgia','Georgia'],['monospace','Monospace']],ctx.prefs().fontFamily)}${range(tr('Font size','Ukuran huruf'),'fontSize',14,32,1,d.fontSize)}${range(tr('Font weight','Ketebalan huruf'),'fontWeight',400,700,100,d.fontWeight)}${range(tr('Line height','Tinggi baris'),'lineHeight',1.2,2.4,.1,d.lineHeight)}${range(tr('Paragraph spacing','Jarak paragraf'),'paragraphSpacing',0,32,1,d.paragraphSpacing)}${range(tr('Letter spacing','Jarak huruf'),'letterSpacing',-.5,3,.1,d.letterSpacing)}${range(tr('First-line indent','Indentasi awal paragraf'),'paragraphIndent',0,3,.25,d.paragraphIndent)}${select(tr('Text alignment','Perataan teks'),'textAlign',[['left',tr('Left','Kiri')],['justify',tr('Justified','Rata kanan kiri')],['center',tr('Center','Tengah')],['right',tr('Right','Kanan')]],d.textAlign)}</section><details><summary>${tr('Layout and screen','Tata letak dan layar')}</summary>${range(tr('Side margins','Margin samping'),'marginHorizontal',12,72,2,d.marginHorizontal)}${range(tr('Top and bottom margins','Margin atas bawah'),'marginVertical',8,80,2,d.marginVertical)}${range(tr('Column width','Lebar kolom'),'readerWidth',320,1100,20,d.readerWidth)}${select(tr('Content position','Posisi konten'),'contentPosition',[['top',tr('Top','Atas')],['center',tr('Center','Tengah')]],d.contentPosition)}${select(tr('Screen orientation','Orientasi layar'),'orientation',[['auto',tr('Automatic','Otomatis')],['portrait',tr('Portrait','Potret')],['landscape',tr('Landscape','Lanskap')]],ctx.prefs().orientation)}${range(tr('Brightness overlay','Lapisan kecerahan'),'brightness',50,100,1,d.brightness)}${check(tr('Keep screen awake','Jaga layar tetap menyala'),'wakeLock',ctx.prefs().wakeLock)}<p class="settings-caption">${tr('Screen and speech features depend on browser support.','Fitur layar dan suara bergantung pada dukungan browser.')}</p></details><section><h3>${tr('Reading theme','Tema baca')}</h3><div class="theme-options">${['follow','light','dark','sepia','paper','green','custom'].map(key=>`<button class="theme-choice ${d.readerTheme===key?'active':''}" data-action="preview-theme" data-value="${key}" aria-pressed="${d.readerTheme===key}">${({follow:tr('App','Aplikasi'),light:tr('Light','Terang'),dark:tr('Dark','Gelap'),sepia:'Sepia',paper:tr('Paper','Kertas'),green:tr('Green','Hijau'),custom:tr('Custom','Kustom')})[key]}</button>`).join('')}</div><div class="custom-theme-colors"><label>${tr('Text','Teks')}<input type="color" id="reader-ink" value="${d.customTextColor}"></label><label>${tr('Background','Latar')}<input type="color" id="reader-paper" value="${d.customBackgroundColor}"></label></div><div id="theme-preview" class="theme-preview"><strong>KataKecil</strong><p>${tr('A quieter place for your next chapter.','Ruang tenang untuk bab selanjutnya.')}</p></div><p id="theme-contrast" class="settings-caption" role="status"></p><button class="secondary" data-action="apply-reader-theme">${tr('Apply theme','Terapkan tema')}</button></section></div>`);previewTheme();
 }
 function previewTheme(){
  const key=draftTheme==='follow'?(document.body.dataset.theme==='dark'?'dark':'light'):draftTheme,palette=palettes[key]||{background:draftPaper,text:draftInk};
  const preview=$('#theme-preview');if(!preview)return;preview.style.background=palette.background;preview.style.color=palette.text;
  const ratio=contrast(palette.text,palette.background),valid=ratio>=4.5;$('#theme-contrast').textContent=tr('Contrast','Kontras')+': '+ratio.toFixed(1)+':1'+(valid?'':' · '+tr('Choose colors with at least 4.5:1 contrast.','Pilih warna dengan kontras minimal 4,5:1.'));$('[data-action="apply-reader-theme"]').disabled=!valid;
 }
 function tools(){panel='tools';ctx.mode('controls');const book=ctx.book(),a=position(),stats=readingStats(book.chapters[a.chapterIndex].text,book.language);
  ctx.show(ctx.heading(tr('Reading tools','Alat baca'))+`<div class="tool-grid"><button data-action="reader-search">${icon('search')}<span>${tr('Search episode','Cari dalam episode')}</span></button><button data-action="reader-speech">${icon('speaker')}<span>${tr('Read aloud','Baca nyaring')}</span></button><button data-action="previous-episode" ${a.chapterIndex===0?'disabled':''}>${icon('left')}<span>${tr('Previous episode','Episode sebelumnya')}</span></button><button data-action="next-episode" ${a.chapterIndex===book.chapters.length-1?'disabled':''}>${icon('chevron')}<span>${tr('Next episode','Episode berikutnya')}</span></button></div><form id="page-jump-form" class="page-jump"><label for="page-jump">${tr('Go to page','Ke halaman')}</label><input type="number" id="page-jump" min="1" max="${ctx.pages().length}" value="${ctx.index()+1}" required><button class="secondary" type="submit">${tr('Go','Buka')}</button></form><div class="reading-statistics"><span>${stats.words.toLocaleString()} ${tr('words','kata')}</span><span>≈ ${stats.minutes} ${tr('min / episode','menit / episode')}</span></div><p class="settings-caption">${tr('Copying and sharing book text are disabled. Select a passage to highlight, add a note, or open word tools.','Menyalin dan membagikan teks buku dinonaktifkan. Pilih teks untuk highlight, catatan, atau alat kata.')}</p>`);
 }
 function searchDialog(){panel='search';ctx.mode('controls');if(!search.query)search.chapterIndex=position().chapterIndex;
  ctx.show(ctx.heading(tr('Search','Pencarian'))+`<form id="reader-search-form"><label class="field-label" for="reader-search-query">${tr('Word or sentence','Kata atau kalimat')}</label><input id="reader-search-query" class="text-input" maxlength="200" value="${esc(search.query)}" type="search" autocomplete="off"><label class="field-label" for="search-episode">${tr('Episode','Episode')}</label><select id="search-episode">${ctx.book().chapters.map((c,i)=>`<option data-book-content translate="no" value="${i}" ${i===search.chapterIndex?'selected':''}>${esc(chapterName(i))}</option>`).join('')}</select><button type="submit" class="primary">${tr('Search','Cari')}</button></form><div id="search-results" aria-live="polite">${searchResults()}</div>`);
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
  panel='speech';ctx.mode('controls');ctx.show(ctx.heading(tr('Read aloud','Baca nyaring'))+`<p role="status">${tr('Loading available voices…','Memuat suara yang tersedia…')}</p>`);
  try{await speech.initialize();if(panel!=='speech'||!ctx.book())return;
   ctx.show(ctx.heading(tr('Read aloud','Baca nyaring'))+`<p class="dialog-caption">${tr('Uses the browser speech engine. Local voices stay on device; online voices follow the browser provider’s privacy policy.','Menggunakan mesin suara browser. Suara lokal diproses di perangkat; suara daring mengikuti kebijakan penyedia browser.')}</p><label class="field-label" for="tts-language">${tr('Language','Bahasa')}</label><select id="tts-language">${[...new Set(speech.voices.map(v=>v.lang))].map(lang=>`<option value="${esc(lang)}" ${lang===(ctx.prefs().ttsLanguage||speech.voices.find(v=>v.lang.startsWith(ctx.book().language))?.lang)?'selected':''}>${esc(lang)}</option>`).join('')}</select><label class="field-label" for="tts-voice">${tr('Voice','Suara')}</label><select id="tts-voice"></select>${field(tr('Speed','Kecepatan'),'ttsRate','range','min="0.5" max="2" step="0.1"',ctx.prefs().ttsRate||1)}<p class="tts-state" role="status"></p><div class="dialog-actions"><button class="primary" data-action="tts-play">${tr('Play / resume','Putar / lanjut')}</button><button class="secondary" data-action="tts-pause">${tr('Pause','Jeda')}</button><button class="secondary" data-action="tts-stop">${tr('Stop','Hentikan')}</button></div><button class="text-link" data-action="tts-from-here">${tr('Start from this reading position','Mulai dari posisi baca ini')}</button>`);updateVoices();updateSpeechUI();
  }catch(error){if(panel==='speech')ctx.show(ctx.heading(tr('Read aloud','Baca nyaring'))+`<p class="form-error" role="alert">${esc(error.message||tr('Speech is unavailable in this browser.','Suara tidak tersedia di browser ini.'))}</p>`);}
 }
 function updateVoices(){const language=$('#tts-language')?.value,select=$('#tts-voice');if(!select)return;select.innerHTML=speech.voices.filter(v=>v.lang===language).map(v=>`<option value="${esc(v.voiceURI)}" ${v.voiceURI===ctx.prefs().ttsVoice?'selected':''}>${esc(v.name)} · ${v.localService?tr('on device','di perangkat'):tr('online','daring')}</option>`).join('');}
 function speechOptions(){return{language:$('#tts-language')?.value||ctx.prefs().ttsLanguage||ctx.book().language,rate:Number(ctx.prefs().ttsRate)||1,voiceURI:$('#tts-voice')?.value||ctx.prefs().ttsVoice};}
 async function playSpeech(fromHere=false){
  if(speech.state==='paused'&&!fromHere){speech.resume();return;}if(speech.state==='playing'&&!fromHere)return;
  const book=ctx.book(),saved=ctx.progress(book.id)?.tts,a=position();
  let start={chapterIndex:a.chapterIndex,charOffset:a.start};
  if(!fromHere&&saved?.anchor){const resolved=resolveAnchor(book.chapters,saved.anchor);if(resolved)start={chapterIndex:resolved.chapterIndex,charOffset:resolved.start};}
  const options=speechOptions();ctx.savePreferences({ttsLanguage:options.language,ttsVoice:options.voiceURI,ttsRate:options.rate});
  await speech.play(book.chapters,start,options);
 }
 function persistSpeech(pos,force=false){pendingSpeechPosition={...pos};if(!force&&performance.now()-lastSpeechSave<1000)return;lastSpeechSave=performance.now();const book=ctx.book(),chapter=book?.chapters[pos.chapterIndex];if(!chapter?.text.length)return;const offset=Math.min(chapter.text.length-1,pos.charOffset);ctx.saveSpeech({chapterIndex:pos.chapterIndex,charOffset:offset,anchor:makeAnchor(chapter,offset,Math.min(chapter.text.length,offset+80))});}
 function speechAt(pos,end,word){
  if(!ctx.book())return;persistSpeech(pos);const index=findPage(ctx.pages(),pos.chapterIndex,pos.charOffset),shown=renderedPages(ctx.index());
  let outside=!shown.some(p=>p.chapterIndex===pos.chapterIndex&&pos.charOffset>=p.start&&pos.charOffset<p.end);if(mode()==='scroll'&&!outside){const root=$('.page-text'),range=textRange(root,pos.charOffset,Math.min(root.textContent.length,pos.charOffset+1)),box=root.closest('.page-inner').getBoundingClientRect(),rect=range?.getBoundingClientRect();outside=!rect||rect.top<box.top||rect.bottom>box.bottom;}
  if(outside){if(index>=0)jump({chapterIndex:pos.chapterIndex,start:pos.charOffset},'speech');}
  if(word)speechWord={chapterIndex:pos.chapterIndex,start:pos.charOffset,end};else{speechRange={chapterIndex:pos.chapterIndex,start:pos.charOffset,end};speechWord=null;}paintSpeech();
 }
 function clearSpeechPaint(){$$('.tts-paint-layer').forEach(el=>el.remove());speechRange=null;speechWord=null;}
 function paintSpeech(){
  $$('.tts-paint-layer').forEach(el=>el.remove());
  if(!['playing','paused'].includes(speech.state))return;
  for(const [range,kind] of [[speechRange,'sentence'],[speechWord,'word']]){
   if(!range)continue;for(const root of $$('.page-text')){if(Number(root.dataset.chapterIndex)!==range.chapterIndex)continue;
    const offset=Number(root.dataset.start||0),start=Math.max(0,range.start-offset),end=Math.min(root.textContent.length,range.end-offset);if(end<=start)continue;
    const domRange=textRange(root,start,end);if(!domRange)continue;const layer=document.createElement('div');layer.className='tts-paint-layer tts-'+kind;layer.setAttribute('aria-hidden','true');const box=(mode()==='scroll'?root.closest('.page-inner'):root).getBoundingClientRect();
    for(const r of Array.from(domRange.getClientRects?.()||[])){const top=Math.max(r.top,box.top),bottom=Math.min(r.bottom,box.bottom);if(bottom<=top)continue;const rect=document.createElement('i');Object.assign(rect.style,{left:r.left+'px',top:top+'px',width:r.width+'px',height:bottom-top+'px'});layer.appendChild(rect);}$('.reader-shell')?.appendChild(layer);
   }
  }
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
  const anchor=position(),previous=ctx.prefs()[key];ctx.savePreferences({[key]:value});ctx.apply();
  if(key==='wakeLock'){try{await wake.set(!!value);}catch(error){ctx.toast(error.message);}return;}
  if(key==='orientation'){try{if(value==='auto')screen.orientation?.unlock?.();else if(screen.orientation?.lock)await screen.orientation.lock(value);else ctx.toast(tr('Orientation lock is unavailable. Rotate your device manually.','Kunci orientasi tidak tersedia. Putar perangkat secara manual.'));}catch{ctx.toast(tr('The browser did not allow orientation lock.','Browser tidak mengizinkan kunci orientasi.'));}return;}
  if(key==='ttsRate'){speech.setRate(Number(value));return;}
  if(['brightness','tapNavigation','pageAnimation'].includes(key))return;
  speech.stop();scrollPosition=anchor;try{await ctx.reflow(anchor);}catch(error){ctx.savePreferences({[key]:previous});ctx.apply();await ctx.reflow(anchor);throw error;}
 }
 function input(el){if(el.dataset.readerPref&&el.type==='range'){const output=$('[data-output="'+el.dataset.readerPref+'"]');if(output)output.textContent=el.value;return true;}if(el.id==='reader-ink'||el.id==='reader-paper'){draftInk=$('#reader-ink').value;draftPaper=$('#reader-paper').value;draftTheme='custom';$$('.theme-choice').forEach(b=>{b.classList.toggle('active',b.dataset.value==='custom');b.setAttribute('aria-pressed',String(b.dataset.value==='custom'));});previewTheme();return true;}return false;}
 function change(el){
  if(el.dataset.readerPref){const value=el.type==='checkbox'?el.checked:el.type==='range'?Number(el.value):el.value;void changePreference(el.dataset.readerPref,value).catch(e=>ctx.toast(e.message));return true;}
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
  case 'preview-theme':draftTheme=value;$$('.theme-choice').forEach(b=>{b.classList.toggle('active',b.dataset.value===value);b.setAttribute('aria-pressed',String(b.dataset.value===value));});previewTheme();return true;
  case 'apply-reader-theme':ctx.savePreferences({readerTheme:draftTheme,customTextColor:draftInk,customBackgroundColor:draftPaper});ctx.apply();ctx.toast(tr('Reading theme saved.','Tema baca tersimpan.'));return true;
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
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible'){speech.pause();void wake.set(false);}else if(ctx.book())void wake.set(!!ctx.prefs().wakeLock).catch(()=>{});});
 window.addEventListener('pagehide',()=>{speech.stop();void wake.set(false);});
 document.addEventListener('keydown',event=>{if(!event.target.closest?.('.reader-tabs')||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();event.stopPropagation();const tabs=$$('.reader-tabs .tab'),index=tabs.indexOf(event.target),next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[next]?.click();});
 return{apply,enter,leave,closePanel,position,mode,spread,renderedPages,renderText,measureText,afterRender,jump,anchorMetadata,resolveAnnotations,savedPosition,progressMetadata,contents,contentsBody,appearance,bookmarkDialog,action,input,change,submit,
  stopSpeech:()=>speech.stop(),pauseSpeech:()=>speech.pause(),paintSpeech,clearSpeechPaint,refreshPanel:()=>{if(panel==='appearance')appearance();else if(panel==='contents')contents();},
  signature:()=>JSON.stringify(Object.fromEntries([...Object.keys(readerDefaults),'fontFamily','fontSize','lineHeight','spreadMode'].filter(k=>!['readerTheme','customTextColor','customBackgroundColor','brightness','wakeLock','ttsVoice','ttsLanguage','ttsRate','tapNavigation','pageAnimation'].includes(k)).map(k=>[k,ctx.prefs()[k]]))),
  setPosition:anchor=>{scrollPosition={chapterIndex:anchor.chapterIndex,start:anchor.start??anchor.charOffset??0};},
  rootFor:event=>event?.target?.closest?.('.page-text')||document.activeElement?.closest?.('.page-text')||$('.page-text'),
 };
}
