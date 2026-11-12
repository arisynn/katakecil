import {GLASS_DEFAULTS,normalizeGlassPreferences} from './glass-preferences.js?v=2';
export function createGlassSettings(ctx){
 const doc=ctx.document,win=doc.defaultView;let draft=null,dirty=false,frame=0;
 const tr=(en,id)=>ctx.language()==='id'?id:en;
 function paint(){frame=0;if(draft)ctx.paint(draft);}
 function labels(){
  const value=draft||normalizeGlassPreferences(ctx.prefs()),summary=doc.querySelector('#glass-summary');if(summary)summary.textContent=`${value.glassTransparency}% · ${value.glassBlur} px`;
  for(const key of Object.keys(GLASS_DEFAULTS)){
   const el=doc.querySelector(`[data-glass-pref="${key}"]`),output=doc.querySelector(`[data-glass-output="${key}"]`),text=value[key]+(key==='glassBlur'?' px':'%');
   if(el){el.value=String(value[key]);el.setAttribute('aria-valuetext',text);}if(output)output.textContent=text;
  }
 }
 function commit(){if(!draft||!dirty)return;if(frame){win.cancelAnimationFrame(frame);frame=0;}ctx.save(draft);dirty=false;ctx.apply();labels();}
 function close(){commit();if(frame)win.cancelAnimationFrame(frame);frame=0;draft=null;dirty=false;}
 function open(){
  close();
  const value=normalizeGlassPreferences(ctx.prefs());
  const range=(key,name,max,suffix,start,end)=>`<div class="glass-range"><label for="${key}"><span>${name}</span><output data-glass-output="${key}" for="${key}">${value[key]}${suffix}</output></label><input type="range" id="${key}" data-glass-pref="${key}" min="0" max="${max}" step="1" value="${value[key]}"><div class="glass-range-hints"><span>${start}</span><span>${end}</span></div></div>`;
  ctx.show(ctx.heading('Liquid Glass')+`<div class="glass-settings"><div class="glass-preview" role="img" aria-label="${tr('Live ambient and glass preview','Pratinjau ambient dan kaca')}"><div class="glass glass-preview-panel"><span><strong>KataKecil</strong><small>${tr('Preview','Pratinjau')}</small></span><span class="primary glass-preview-action">${tr('Read','Baca')}</span></div></div>${range('glassTransparency',tr('Clarity','Kebeningan'),100,'%',tr('Opaque','Pekat'),tr('Clear','Bening'))}${range('glassBlur',tr('Blur','Blur'),40,' px',tr('Sharp','Tajam'),tr('Soft','Buram'))}${range('ambientIntensity','Ambient glow',100,'%',tr('Off','Mati'),tr('Strong','Kuat'))}<div class="dialog-actions"><button class="secondary" data-action="glass-reset">${tr('Restore defaults','Kembalikan default')}</button></div></div>`);
  doc.querySelector('.dialog')?.classList.add('glass-settings-dialog');draft=value;dirty=false;labels();paint();
 }
 return{value:()=>draft||normalizeGlassPreferences(ctx.prefs()),commit,close,
  sync(){if(!dirty&&draft)draft=normalizeGlassPreferences(ctx.prefs());labels();},
  action(button){if(button.dataset.action==='glass-settings'){open();return true;}if(button.dataset.action==='glass-reset'){draft={...GLASS_DEFAULTS};dirty=true;labels();commit();return true;}return false;},
  input(el){const key=el.dataset.glassPref;if(!draft||!(key in GLASS_DEFAULTS))return false;draft=normalizeGlassPreferences({...draft,[key]:Number(el.value)});dirty=true;labels();if(!frame)frame=win.requestAnimationFrame(paint);return true;},
  change(el){if(!draft||!(el.dataset.glassPref in GLASS_DEFAULTS))return false;commit();return true;}
 };
}
