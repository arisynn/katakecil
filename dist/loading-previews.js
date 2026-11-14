import {icon} from './ui.js?v=16';
import {loadingLogo} from './loading-logo.js?v=5';
import {normalizeVisualPreferences} from './visual-preferences.js?v=2';
import {scheduleSheetFit} from './panel-layout.js?v=5';

const ICONS=[['katakecil','Rounded KataKecil'],['lucide','Lucide']];
const LOADERS=[['wordmark','Wordmark lama'],['pulse','Denyut lembut'],['dots','Titik-titik']];
const FIELDS={icons:'iconPack',loading:'loadingStyle'};

// Selection is a local candidate; only the explicit Use action writes preferences.
export function createVisualSettings(ctx){
 const doc=ctx.document;let draft=null,tab='icons',dirty={iconPack:false,loadingStyle:false};
 const current=()=>normalizeVisualPreferences(ctx.prefs());
 function choices(key,options,value){return options.map(([id,title])=>`<button type="button" class="visual-choice${id===value?' is-selected':''}" data-action="visual-candidate" data-visual-key="${key}" data-value="${id}" aria-pressed="${id===value}">${key==='iconPack'?`<span class="visual-icon-sample" aria-hidden="true">${['refresh','sliders','systemTheme','bookOpen'].map(symbol=>icon(symbol,'',id)).join('')}</span>`:''}<span class="visual-choice-label">${title}</span><span class="visual-choice-current" data-visual-current="${id}" hidden>Sedang digunakan</span></button>`).join('');}
 function panel(value){return `<p class="visual-settings-caption">Pilihan diterapkan setelah menekan Gunakan.</p><div class="visual-choice-grid ${tab==='icons'?'visual-icon-choices':'visual-loading-choices'}" role="group" aria-label="${tab==='icons'?'Pilihan paket ikon':'Pilihan loading'}">${choices(FIELDS[tab],tab==='icons'?ICONS:LOADERS,value[FIELDS[tab]])}</div>${tab==='loading'?`<div class="visual-loading-stage loading-preview-stage" aria-label="Pratinjau loading">${loadingLogo(value.loadingStyle)}</div>`:''}<div class="visual-settings-footer"><p class="visual-settings-status" role="status" aria-live="polite"></p><div class="visual-settings-actions">${tab==='loading'?'<button type="button" class="secondary" data-action="visual-try">Coba</button>':''}<button type="button" class="primary" data-action="visual-use" disabled>Gunakan</button></div></div>`;}
 function paint(){
  const body=doc.querySelector('#visual-settings-body');if(!draft||!body)return;
  const key=FIELDS[tab],saved=current();
  for(const button of body.querySelectorAll('[data-action="visual-candidate"]')){
   const selected=button.dataset.value===draft[key];button.classList.toggle('is-selected',selected);button.setAttribute('aria-pressed',String(selected));
   button.querySelector('[data-visual-current]').hidden=button.dataset.value!==saved[key];
  }
  body.querySelector('[data-action="visual-use"]').disabled=draft[key]===saved[key];
 }
 function close(){draft=null;dirty={iconPack:false,loadingStyle:false};}
 function open(){
  const value=current();tab='icons';
  ctx.show(ctx.heading('Ikon & Loading')+`<nav class="appearance-tabs visual-settings-tabs" role="tablist" aria-label="Bagian ikon dan loading"><button type="button" id="visual-tab-icons" data-action="visual-tab" data-value="icons" role="tab" aria-controls="visual-settings-body" aria-selected="true" tabindex="0" class="active">${icon('grid')}<span>Ikon</span></button><button type="button" id="visual-tab-loading" data-action="visual-tab" data-value="loading" role="tab" aria-controls="visual-settings-body" aria-selected="false" tabindex="-1">${icon('refresh')}<span>Loading</span></button></nav><div id="visual-settings-body" class="visual-settings" role="tabpanel" aria-labelledby="visual-tab-icons">${panel(value)}</div>`);
  draft={...value};dirty={iconPack:false,loadingStyle:false};doc.querySelector('.dialog')?.classList.add('visual-settings-dialog');paint();
 }
 function switchTab(value){
  if(!draft||!(value in FIELDS)||tab===value)return;tab=value;
  for(const button of doc.querySelectorAll('.visual-settings-tabs [role="tab"]')){const active=button.dataset.value===tab;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;}
  const body=doc.querySelector('#visual-settings-body');body.setAttribute('aria-labelledby','visual-tab-'+tab);body.innerHTML=panel(draft);paint();scheduleSheetFit(doc);
 }
 // Keep keyboard focus on the newly selected tab; the reader's generic handler
 // clicks appearance tabs without moving focus and must not handle this nav too.
 doc.addEventListener('keydown',event=>{
  const button=event.target.closest?.('.visual-settings-tabs [role="tab"]');
  if(!draft||!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
  const tabs=[...button.closest('.visual-settings-tabs').querySelectorAll(':scope > button[role="tab"]:not(:disabled)')],index=tabs.indexOf(button);
  if(index<0)return;event.preventDefault();event.stopImmediatePropagation();
  const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;
  switchTab(tabs[next].dataset.value);tabs[next].focus({preventScroll:true});
 },true);
 return{close,
  sync(){if(!draft)return;const previous=draft.loadingStyle,saved=current();for(const key of Object.values(FIELDS))if(!dirty[key])draft[key]=saved[key];if(tab==='loading'&&previous!==draft.loadingStyle){const stage=doc.querySelector('#visual-settings-body .visual-loading-stage');if(stage)stage.innerHTML=loadingLogo(draft.loadingStyle);}paint();},
  action(button){
   const action=button.dataset.action;
   if(action==='loading-previews'){open();return true;}
   if(!action?.startsWith('visual-'))return false;
   if(!draft||!doc.querySelector('#visual-settings-body'))return true;
   if(action==='visual-tab'){switchTab(button.dataset.value);return true;}
   const key=FIELDS[tab],body=doc.querySelector('#visual-settings-body');
   if(action==='visual-candidate'){
    const options=tab==='icons'?ICONS:LOADERS,value=button.dataset.value;if(button.dataset.visualKey!==key||!options.some(([id])=>id===value))return true;
    draft[key]=value;dirty[key]=value!==current()[key];
    if(tab==='loading')body.querySelector('.visual-loading-stage').innerHTML=loadingLogo(value);
    body.querySelector('.visual-settings-status').textContent='';paint();return true;
   }
   if(action==='visual-try'){if(tab==='loading')body.querySelector('.visual-loading-stage').innerHTML=loadingLogo(draft.loadingStyle);return true;}
   if(action==='visual-use'){
    if(draft[key]===current()[key])return true;
    ctx.save({[key]:draft[key]});dirty[key]=false;ctx.apply();paint();
    body.querySelector('.visual-settings-status').textContent=key==='iconPack'?'Paket ikon diterapkan.':'Animasi loading diterapkan.';
    return true;
   }
   return true;
  }
 };
}
