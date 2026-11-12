import {SpeedReader,focusParts,contrast} from './advanced-reader.js?v=17';
import {icon} from './ui.js?v=13';

export function createSpeedReading(ctx){
 let active=false,focused=false,lastSave=0,fullscreenRoot=null,resizeObserver=null,paletteKey='',sizedWords=null,measuredFont='',maxExtent=0;
 const tr=(en,id)=>ctx.prefs().uiLanguage==='id'?id:en;
 const root=()=>document.querySelector('.speed-reading-sheet');
 const fullElement=()=>document.fullscreenElement||document.webkitFullscreenElement;
 const engine=new SpeedReader({
  word:(word,chapterIndex)=>{if(!active)return;paintWord(word.text);if(sizedWords!==engine.words)fitWord();ctx.position({chapterIndex,start:word.start});if(Date.now()-lastSave>2000){ctx.persist();lastSave=Date.now();}},
  change:refresh,
  next:async index=>{const book=ctx.book();if(!active||!book||index+1>=book.chapters.length)return null;if(book.remote)await ctx.load({chapterIndex:index+1,start:0},'speed');if(!active||ctx.book()!==book)return null;return{chapterIndex:index+1,text:book.chapters[index+1].text,start:0,language:book.language};},
  error:error=>ctx.toast(error.message),
 });
 function fitWord(){
  const sheet=root(),word=sheet?.querySelector('.speed-word');if(!word||!engine.words.length)return;
  // Measure the CSS size without resetting the visible word's font between tokens.
  const probe=document.createElement('span');probe.className='speed-word speed-size-probe';probe.setAttribute('aria-hidden','true');word.parentElement.append(probe);
  const style=getComputedStyle(probe),base=parseFloat(style.fontSize),font=`${style.fontStyle} ${style.fontWeight} 100px ${style.fontFamily}`;probe.remove();
  if(sizedWords!==engine.words||measuredFont!==font){
   const canvas=document.createElement('canvas'),measure=canvas.getContext('2d');if(!measure)return;measure.font=font;measure.fontKerning='none';maxExtent=0;
   for(const token of new Set(engine.words.map(word=>word.text))){
    const {before,pivot,after}=focusParts(token),halfPivot=measure.measureText(pivot).width/2;
    maxExtent=Math.max(maxExtent,measure.measureText(before).width+halfPivot,measure.measureText(after).width+halfPivot);
   }
   sizedWords=engine.words;measuredFont=font;
  }
  const size=Math.max(.1,Math.floor(Math.min(base,(word.clientWidth/2-3)*100/Math.max(1,maxExtent))*100)/100);
  word.style.fontSize=size+'px';
 }

 function paintWord(text){
  const sheet=root(),word=sheet?.querySelector('.speed-word');if(!word)return;
  const style=getComputedStyle(sheet),accent=style.getPropertyValue('--accent').trim(),ink=style.getPropertyValue('--text').trim(),background=style.getPropertyValue('--bg').trim(),key=[accent,ink,background].join(':');
  if(key!==paletteKey||!sheet.style.getPropertyValue('--speed-pivot-ink')){
   paletteKey=key;let color=accent;
   if([accent,ink,background].every(value=>/^#[a-f\d]{6}$/i.test(value))){
    for(let step=0;step<=20;step++){const amount=step/20;color='#'+[1,3,5].map(i=>Math.round(parseInt(accent.slice(i,i+2),16)*(1-amount)+parseInt(ink.slice(i,i+2),16)*amount).toString(16).padStart(2,'0')).join('');if(contrast(color,background)>=4.5)break;}
   }
   sheet.style.setProperty('--speed-pivot-ink',color);
  }
  if(word.textContent===text&&word.querySelector('.speed-pivot'))return;
  const parts=focusParts(text),nodes=['before','pivot','after'].map(key=>{const span=document.createElement('span');span.className='speed-'+key;span.textContent=parts[key];return span;});
  word.replaceChildren(...nodes);
 }
 function refresh(){
  if(!active)return;const sheet=root();if(!sheet)return;
  const playing=engine.state==='playing',loading=engine.loading||engine.state==='loading';
  sheet.dataset.speedState=engine.state;
  for(const node of sheet.querySelectorAll('.speed-toggle')){node.disabled=loading;node.textContent=playing?tr('Pause','Jeda'):loading?tr('Opening episode…','Membuka episode…'):engine.state==='ended'?tr('Restart episode','Ulangi episode'):tr('Start','Mulai');node.setAttribute('aria-pressed',String(playing));}
  const counter=sheet.querySelector('.speed-counter');if(counter)counter.textContent=`${engine.index+1} / ${engine.words.length} · ${engine.state==='ended'?tr('Finished','Selesai'):tr('Episode','Episode')+' '+(engine.episode.chapterIndex+1)}`;
  for(const node of sheet.querySelectorAll('.speed-focus-controls,.dialog-heading')){node.inert=focused&&playing;node.setAttribute('aria-hidden',String(focused&&playing));}
  const stage=sheet.querySelector('.speed-stage');if(focused&&stage){stage.setAttribute('aria-label',playing?tr('Pause and show controls','Jeda dan tampilkan kontrol'):tr('Word focus. Use Start to continue.','Titik fokus kata. Tekan Mulai untuk melanjutkan.'));if(playing&&document.activeElement!==stage)stage.focus({preventScroll:true});}
  const full=sheet.querySelector('[data-action="speed-fullscreen"]');if(full){const on=fullElement()===sheet;full.setAttribute('aria-pressed',String(on));full.innerHTML=icon(on?'collapse':'expand')+`<span>${on?tr('Exit fullscreen','Keluar layar penuh'):tr('Fullscreen','Layar penuh')}</span>`;}
 }
 function pause(){if(!active)return;engine.pause();ctx.persist();}
 function releaseFullscreen(owned=fullscreenRoot){
  if(fullscreenRoot===owned)fullscreenRoot=null;
  if(owned&&fullElement()===owned){const exit=document.exitFullscreen||document.webkitExitFullscreen;try{Promise.resolve(exit?.call(document)).catch(()=>{});}catch{}}
 }
 function close(){if(!active)return;pause();active=false;focused=false;resizeObserver?.disconnect();releaseFullscreen();sizedWords=null;measuredFont='';maxExtent=0;engine.stop();}
 function rateControls(){return `<label class="speed-rate" for="speed-wpm">${tr('Words per minute','Kata per menit')} <output id="speed-rate-value">${engine.wpm}</output><input id="speed-wpm" type="range" min="100" max="600" step="25" value="${engine.wpm}"></label><div class="speed-actions"><button class="secondary" data-action="speed-back" aria-label="${tr('Back five words','Mundur lima kata')}">−5</button><button class="primary speed-toggle" data-action="speed-toggle" aria-pressed="false">${tr('Start','Mulai')}</button><button class="secondary" data-action="speed-forward" aria-label="${tr('Forward five words','Maju lima kata')}">+5</button></div>`;}
 function render(){
  resizeObserver?.disconnect();
  const entry=focused?`<div class="speed-focus-toolbar speed-focus-controls"><button class="secondary" data-action="speed-exit-focus">${icon('back')}<span>${tr('Settings','Pengaturan')}</span></button><button class="secondary" data-action="speed-fullscreen" aria-pressed="false">${icon('expand')}<span>${tr('Fullscreen','Layar penuh')}</span></button></div>`:`<div class="speed-entry-row"><span>RSVP</span><button class="secondary" data-action="speed-focus">${icon('expand')}<span>${tr('Focus mode','Mode fokus')}</span></button></div>`;
  const stage=focused?`<button class="speed-stage speed-focus-stage" data-action="speed-pause"><span class="speed-word" data-book-content translate="no" aria-live="off"></span></button>`:`<div class="speed-stage"><span class="speed-word" data-book-content translate="no" aria-live="off"></span></div>`;
  ctx.show(ctx.heading(focused?tr('Focus mode','Mode fokus'):tr('Speed reading','Baca cepat'))+`<section class="speed-reader">${entry}${stage}<div class="speed-playback ${focused?'speed-focus-controls':''}"><p class="speed-counter" aria-live="off"></p>${rateControls()}${focused?`<p class="speed-help">${tr('Tap the word to pause.','Ketuk kata untuk menjeda.')}</p>`:''}</div></section>`);
  const sheet=root();sheet.classList.toggle('speed-focus-dialog',focused);sheet.parentElement.classList.toggle('speed-focus-layer',focused);
  if(focused){for(const node of [sheet,sheet.parentElement])for(const animation of node.getAnimations?.()||[])animation.cancel();}
  if(typeof ResizeObserver==='function'){resizeObserver=new ResizeObserver(fitWord);resizeObserver.observe(sheet.querySelector('.speed-stage'));}
  paintWord(engine.words[engine.index]?.text||'');fitWord();refresh();
  document.fonts?.ready.then(()=>{if(active){measuredFont='';fitWord();}});
  if(focused)sheet.querySelector('[data-action="speed-toggle"]').focus({preventScroll:true});
 }
 function open(){
  const book=ctx.book();if(!book)return;ctx.stopSpeech();ctx.close();const pos=ctx.current();lastSave=0;
  active=true;focused=false;engine.open({chapterIndex:pos.chapterIndex,start:pos.start,text:book.chapters[pos.chapterIndex].text,language:book.language},Number(ctx.prefs().speedWpm)||250);render();
 }
 function enterFocus(){if(!active||focused)return;pause();focused=true;render();}
 function leaveFocus(){if(!active||!focused)return;pause();releaseFullscreen();focused=false;render();}
 function fullscreen(){
  const sheet=root();if(!active||!focused||!sheet)return;
  if(fullElement()===sheet){pause();releaseFullscreen();return;}
  const request=sheet.requestFullscreen||sheet.webkitRequestFullscreen;
  if(!request){ctx.toast(tr('Fullscreen is unavailable. Focus mode still fills this page.','Layar penuh belum tersedia. Mode fokus tetap memenuhi halaman.'));return;}
  fullscreenRoot=sheet;
  try{Promise.resolve(request.call(sheet)).then(()=>{if(!active||root()!==sheet)releaseFullscreen(sheet);else{fitWord();refresh();}}).catch(()=>{if(fullscreenRoot===sheet)fullscreenRoot=null;if(active)ctx.toast(tr('Fullscreen was not allowed. You can keep using focus mode.','Layar penuh tidak diizinkan. Mode fokus tetap bisa digunakan.'));});}
  catch{fullscreenRoot=null;ctx.toast(tr('Fullscreen is unavailable. Focus mode still fills this page.','Layar penuh belum tersedia. Mode fokus tetap memenuhi halaman.'));}
 }
 function input(el){if(el.id!=='speed-wpm')return false;engine.setRate(Number(el.value));const output=root()?.querySelector('#speed-rate-value');if(output)output.textContent=engine.wpm;ctx.save({speedWpm:engine.wpm});return true;}
 function action(button){switch(button.dataset.action){case 'reader-speed':open();return true;case 'speed-focus':enterFocus();return true;case 'speed-exit-focus':leaveFocus();return true;case 'speed-fullscreen':fullscreen();return true;case 'speed-pause':pause();return true;case 'speed-toggle':if(!active)return true;if(engine.state==='playing')pause();else engine.play();return true;case 'speed-back':if(active){engine.seek(-5);ctx.persist();}return true;case 'speed-forward':if(active){engine.seek(5);ctx.persist();}return true;default:return false;}}
 document.addEventListener('keydown',event=>{
  if(!active)return;
  if(focused&&event.key==='Tab')pause();
  if(focused&&event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();if(fullElement()===root()){pause();releaseFullscreen();}else leaveFocus();return;}
  if(event.target.closest('input,textarea,select')||event.target.closest('button:not(.speed-stage)'))return;
  if(event.key===' '||event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopImmediatePropagation();action({dataset:{action:event.key===' '?'speed-toggle':event.key==='ArrowLeft'?'speed-back':'speed-forward'}});}
 },true);
 for(const name of ['fullscreenchange','webkitfullscreenchange'])document.addEventListener(name,()=>{if(!active||!focused)return;if(fullscreenRoot&&fullElement()!==fullscreenRoot){fullscreenRoot=null;pause();}fitWord();refresh();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')pause();});
 window.addEventListener('pagehide',pause);
 return{open,close,pause,action,input,leaveFocus,get active(){return active;},get focused(){return focused;}};
}
