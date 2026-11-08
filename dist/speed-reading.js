import {SpeedReader} from './advanced-reader.js?v=15';
import {escapeHTML as esc} from './ui.js?v=12';

export function createSpeedReading(ctx){
 let active=false,lastSave=0;
 const tr=(en,id)=>ctx.prefs().uiLanguage==='id'?id:en;
 const engine=new SpeedReader({
  word:(word,chapterIndex)=>{if(!active)return;const node=document.querySelector('.speed-word');if(node)node.textContent=word.text;ctx.position({chapterIndex,start:word.start});if(Date.now()-lastSave>2000){ctx.persist();lastSave=Date.now();}},
  change:()=>{if(!active)return;const button=document.querySelector('[data-action="speed-toggle"]');if(button){button.disabled=engine.state==='loading';button.textContent=engine.state==='playing'?tr('Pause','Jeda'):engine.state==='loading'?tr('Opening next episode…','Membuka episode berikutnya…'):engine.state==='ended'?tr('Restart episode','Ulangi episode'):tr('Start','Mulai');button.setAttribute('aria-pressed',String(engine.state==='playing'));}const counter=document.querySelector('.speed-counter');if(counter)counter.textContent=`${engine.index+1} / ${engine.words.length} · ${engine.state==='ended'?tr('Finished','Selesai'):tr('Episode','Episode')+' '+(engine.episode.chapterIndex+1)}`;},
  next:async index=>{const book=ctx.book();if(!active||!book||index+1>=book.chapters.length)return null;if(book.remote)await ctx.load({chapterIndex:index+1,start:0},'speed');if(!active||ctx.book()!==book)return null;return{chapterIndex:index+1,text:book.chapters[index+1].text,start:0,language:book.language};},
  error:error=>ctx.toast(error.message),
 });
 function pause(){if(!active)return;engine.pause();ctx.persist();}
 function close(){if(!active)return;pause();active=false;engine.stop();}
 function open(){
  const book=ctx.book();if(!book)return;ctx.stopSpeech();ctx.close();const pos=ctx.current();lastSave=0;
  ctx.show(ctx.heading(tr('Speed reading','Baca cepat'))+`<section class="speed-reader"><p class="settings-caption">${tr('One word at a time · RSVP','Satu kata bergantian · RSVP')}</p><div class="speed-stage"><span class="speed-word" data-book-content translate="no" aria-live="off"></span></div><p class="speed-counter" role="status"></p><label class="speed-rate" for="speed-wpm">${tr('Words per minute','Kata per menit')} <output id="speed-rate-value"></output><input id="speed-wpm" type="range" min="100" max="600" step="25" value="${Math.min(600,Math.max(100,Number(ctx.prefs().speedWpm)||250))}"></label><div class="speed-actions"><button class="secondary" data-action="speed-back" aria-label="${tr('Back five words','Mundur lima kata')}">−5</button><button class="primary" data-action="speed-toggle" aria-pressed="false">${tr('Start','Mulai')}</button><button class="secondary" data-action="speed-forward" aria-label="${tr('Forward five words','Maju lima kata')}">+5</button></div><p class="settings-caption">${tr('Close to return to this word in the book. Playback pauses when you leave the app.','Tutup untuk kembali ke kata ini di buku. Pemutaran dijeda saat kamu meninggalkan aplikasi.')}</p></section>`);
  active=true;engine.open({chapterIndex:pos.chapterIndex,start:pos.start,text:book.chapters[pos.chapterIndex].text,language:book.language},Number(ctx.prefs().speedWpm)||250);document.querySelector('#speed-rate-value').textContent=engine.wpm;
 }
 function input(el){if(el.id!=='speed-wpm')return false;engine.setRate(Number(el.value));document.querySelector('#speed-rate-value').textContent=engine.wpm;ctx.save({speedWpm:engine.wpm});return true;}
 function action(button){switch(button.dataset.action){case 'reader-speed':open();return true;case 'speed-toggle':if(!active)return true;if(engine.state==='playing')pause();else engine.play();return true;case 'speed-back':if(active){engine.seek(-5);ctx.persist();}return true;case 'speed-forward':if(active){engine.seek(5);ctx.persist();}return true;default:return false;}}
 document.addEventListener('keydown',event=>{if(!active||event.target.closest('input,textarea,select'))return;if(event.key===' '||event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();event.stopImmediatePropagation();action({dataset:{action:event.key===' '?'speed-toggle':event.key==='ArrowLeft'?'speed-back':'speed-forward'}});}},true);
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState!=='visible')pause();});
 window.addEventListener('pagehide',pause);
 return{open,close,pause,action,input,get active(){return active;}};
}
