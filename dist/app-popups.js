import {enterSheet,leaveSheet} from './motion.js?v=1';
import {fitSheet,scheduleSheetFit} from './panel-layout.js?v=3';
import {icon} from './ui.js?v=12';

// Native controls remain as the data/event interface, while the visible picker belongs to the app.
export function installAppPopups(doc=document,{loadWheel=()=>import('./vendor/color-wheel.js?v=1')}={}){
 const records=new WeakMap();let current=null,sequence=0,focusVersion=0;
 const language=()=>doc.documentElement.lang==='id';
 const close=(restore=true,immediate=false)=>{const version=++focusVersion;if(!current)return;const record=current;current=null;const {layer,trigger,blocked}=record;for(const [node,wasInert] of blocked)node.inert=wasInert;trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-controls');doc.body.classList.remove('app-picker-open');return leaveSheet(layer,()=>{layer.remove();if(restore&&version===focusVersion&&!current&&trigger.isConnected)trigger.focus({preventScroll:true});},immediate);};
 function labelFor(control){const label=control.labels?.[0],direct=Array.from(label?.childNodes||[]).filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();return control.getAttribute('aria-label')||label?.querySelector(':scope > span:not(.app-control)')?.textContent||direct||records.get(control)?.name||(language()?'Pilih':'Choose');}
 const attr=(node,name,value)=>{if(node.getAttribute(name)!==String(value))node.setAttribute(name,String(value));};
 function refresh(control){const record=records.get(control);if(!record)return;const {button,label}=record;if(button.disabled!==control.disabled)button.disabled=control.disabled;
  if(control.tagName==='SELECT'){attr(button,'aria-label',labelFor(control));const option=control.selectedOptions[0],text=option?.textContent||'—';if(label.textContent!==text)label.textContent=text;const source=option?.hasAttribute('data-book-content');label.toggleAttribute('data-book-content',!!source);if(source)label.setAttribute('translate','no');else label.removeAttribute('translate');}
  else {label.style.background=control.value;attr(button,'aria-label',labelFor(control)+': '+control.value);}
 }
 function open(control){
  if(control.disabled)return;close(false,true);const record=records.get(control);if(!record)return;const {button}=record;
  const layer=doc.createElement('div');layer.className='app-picker-backdrop';
  const sheet=doc.createElement('section');sheet.className='app-picker glass';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');
  const title=doc.createElement('h2');title.id='app-picker-title-'+(++sequence);title.textContent=labelFor(control);sheet.setAttribute('aria-labelledby',title.id);sheet.id='app-picker-sheet-'+sequence;button.setAttribute('aria-controls',sheet.id);
  const heading=doc.createElement('header');heading.className='app-picker-heading';const dismiss=doc.createElement('button');dismiss.type='button';dismiss.className='icon-button';dismiss.setAttribute('aria-label',language()?'Tutup':'Close');dismiss.innerHTML=icon('close');dismiss.addEventListener('click',()=>close());heading.append(title,dismiss);sheet.append(heading);layer.append(sheet);
  const blocked=Array.from(doc.querySelectorAll('#app,#overlay-root')).map(node=>[node,!!node.inert]);for(const [node] of blocked)node.inert=true;current={layer,trigger:button,control,blocked};button.setAttribute('aria-expanded','true');doc.body.append(layer);doc.body.classList.add('app-picker-open');
  if(control.tagName==='SELECT'){
   const list=doc.createElement('div');list.className='app-picker-options';list.setAttribute('role','listbox');list.setAttribute('aria-label',labelFor(control));
   for(const option of control.options){const choice=doc.createElement('button');choice.type='button';choice.className='app-picker-option';choice.setAttribute('role','option');choice.disabled=option.disabled;choice.setAttribute('aria-selected',String(option.selected));const text=doc.createElement('span');text.textContent=option.textContent;if(option.hasAttribute('data-book-content')){text.setAttribute('data-book-content','');text.setAttribute('translate','no');}choice.append(text);if(option.selected)choice.insertAdjacentHTML('beforeend',icon('check'));choice.addEventListener('click',()=>{control.value=option.value;refresh(control);close();control.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));control.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));});list.append(choice);}
   sheet.append(list);requestAnimationFrame(()=>{if(current?.layer!==layer)return;const selected=list.querySelector('[aria-selected=true]:not(:disabled)')||list.querySelector('button:not(:disabled)');selected?.focus({preventScroll:true});selected?.scrollIntoView?.({block:'nearest'});});
  }else{
   const content=doc.createElement('div');content.className='app-color-editor';
   const preview=doc.createElement('span');preview.className='app-color-preview';preview.style.background=control.value;
   const field=doc.createElement('label');field.className='app-color-hex';field.textContent=language()?'Kode warna':'Hex color';const hex=doc.createElement('input');hex.type='text';hex.maxLength=7;hex.value=control.value;hex.spellcheck=false;hex.autocomplete='off';hex.autocapitalize='off';hex.setAttribute('aria-label',language()?'Kode warna':'Hex color');field.append(hex);
   const apply=doc.createElement('button');apply.type='button';apply.className='primary';apply.textContent=language()?'Terapkan':'Apply';
   const wheelSize=Math.round(Math.max(144,Math.min(224,doc.defaultView.innerWidth-104,(doc.defaultView.visualViewport?.height||doc.defaultView.innerHeight)*.5-112)));
   const wheelHost=doc.createElement('div');wheelHost.className='app-color-wheel';wheelHost.style.setProperty('--wheel-size',wheelSize+'px');wheelHost.setAttribute('aria-label',language()?'Roda warna':'Color wheel');
   let wheel=null,syncing=false;
   const validate=()=>{const valid=/^#[a-f\d]{6}$/i.test(hex.value);apply.disabled=!valid;hex.setAttribute('aria-invalid',String(!valid));if(valid){preview.style.background=hex.value;if(wheel&&!syncing){syncing=true;wheel.hex=hex.value;syncing=false;}}};
   loadWheel().then(({default:ColorWheel})=>{if(current?.layer!==layer)return;wheel=new ColorWheel({appendTo:wheelHost,hex:hex.value,wheelDiameter:wheelSize,wheelThickness:22,handleDiameter:18,wheelReflectsSaturation:false,onChange:color=>{if(syncing||current?.layer!==layer)return;hex.value=color.hex;syncing=true;validate();syncing=false;}});}).catch(()=>{wheelHost.hidden=true;});
   hex.addEventListener('input',validate);hex.addEventListener('keydown',event=>{if(event.key==='Enter'&&!apply.disabled){event.preventDefault();apply.click();}});validate();
   apply.addEventListener('click',()=>{if(!/^#[a-f\d]{6}$/i.test(hex.value))return;control.value=hex.value.toLowerCase();refresh(control);close();control.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));control.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));});
   content.append(wheelHost,preview,field,apply);sheet.append(content);requestAnimationFrame(()=>{if(current?.layer===layer&&!sheet.contains(doc.activeElement))dismiss.focus({preventScroll:true});});
  }
  fitSheet(sheet);scheduleSheetFit(doc);enterSheet(layer);
  layer.addEventListener('click',event=>{if(event.target===layer)close();});
 }
 function enhance(control){
  if(records.has(control)){refresh(control);return;}
  const name=labelFor(control);const wrapper=doc.createElement('span');wrapper.className='app-control';control.before(wrapper);wrapper.append(control);control.hidden=true;control.tabIndex=-1;control.setAttribute('aria-hidden','true');
  const button=doc.createElement('button');button.type='button';button.className=control.tagName==='SELECT'?'app-select-trigger':'app-color-trigger';button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.setAttribute('role',control.tagName==='SELECT'?'combobox':'button');
  const label=doc.createElement('span');button.append(label);if(control.tagName==='SELECT')button.insertAdjacentHTML('beforeend',icon('chevron','picker-chevron'));wrapper.append(button);records.set(control,{button,label,name});refresh(control);
  button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();open(control);});
  control.addEventListener('change',()=>refresh(control));
 }
 function scan(){doc.querySelectorAll('select,input[type=color]').forEach(enhance);if(current&&!current.control.isConnected)close(false,true);}
 const observer=new doc.defaultView.MutationObserver(scan);observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','selected','aria-label']});scan();
 doc.addEventListener('keydown',event=>{
  if(!current)return;const panel=current.layer;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}
  const options=Array.from(panel.querySelectorAll('[role=option]:not(:disabled)'));
  if(options.length&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();const index=options.indexOf(doc.activeElement),next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next].focus();return;}
  if(event.key==='Tab'){const focusable=Array.from(panel.querySelectorAll('button:not(:disabled),input'));const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}event.stopImmediatePropagation();}
 },true);
 doc.addEventListener('click',event=>{const label=event.target.closest?.('label');if(label&&!event.target.closest('button')&&label.control&&records.has(label.control)){event.preventDefault();event.stopPropagation();open(label.control);}},true);
 return{close,scan,destroy(){close(false,true);observer.disconnect();}};
}
