import {icon} from './ui.js?v=10';

// Native controls remain as the data/event interface, while the visible picker belongs to the app.
export function installAppPopups(doc=document){
 const records=new WeakMap();let current=null,sequence=0;
 const language=()=>doc.documentElement.lang==='id';
 const close=(restore=true)=>{if(!current)return;const {layer,trigger,blocked}=current;current=null;for(const [node,wasInert] of blocked)node.inert=wasInert;layer.remove();trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-controls');doc.body.classList.remove('app-picker-open');if(restore&&trigger.isConnected)trigger.focus({preventScroll:true});};
 function labelFor(control){const label=control.labels?.[0],direct=Array.from(label?.childNodes||[]).filter(n=>n.nodeType===3).map(n=>n.textContent.trim()).join(' ').trim();return control.getAttribute('aria-label')||label?.querySelector(':scope > span:not(.app-control)')?.textContent||direct||records.get(control)?.name||(language()?'Pilih':'Choose');}
 const attr=(node,name,value)=>{if(node.getAttribute(name)!==String(value))node.setAttribute(name,String(value));};
 function refresh(control){const record=records.get(control);if(!record)return;const {button,label}=record;if(button.disabled!==control.disabled)button.disabled=control.disabled;
  if(control.tagName==='SELECT'){attr(button,'aria-label',labelFor(control));const option=control.selectedOptions[0],text=option?.textContent||'—';if(label.textContent!==text)label.textContent=text;const source=option?.hasAttribute('data-book-content');label.toggleAttribute('data-book-content',!!source);if(source)label.setAttribute('translate','no');else label.removeAttribute('translate');}
  else {label.style.background=control.value;attr(button,'aria-label',labelFor(control)+': '+control.value);}
 }
 function open(control){
  if(control.disabled)return;close(false);const record=records.get(control);if(!record)return;const {button}=record;
  const layer=doc.createElement('div');layer.className='app-picker-backdrop';
  const sheet=doc.createElement('section');sheet.className='app-picker glass';sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');
  const title=doc.createElement('h2');title.id='app-picker-title-'+(++sequence);title.textContent=labelFor(control);sheet.setAttribute('aria-labelledby',title.id);sheet.id='app-picker-sheet-'+sequence;button.setAttribute('aria-controls',sheet.id);
  const heading=doc.createElement('header');heading.className='app-picker-heading';const dismiss=doc.createElement('button');dismiss.type='button';dismiss.className='icon-button';dismiss.setAttribute('aria-label',language()?'Tutup':'Close');dismiss.innerHTML=icon('close');dismiss.addEventListener('click',()=>close());heading.append(title,dismiss);sheet.append(heading);layer.append(sheet);
  const blocked=Array.from(doc.querySelectorAll('#app,#overlay-root')).map(node=>[node,!!node.inert]);for(const [node] of blocked)node.inert=true;current={layer,trigger:button,control,blocked};button.setAttribute('aria-expanded','true');doc.body.append(layer);doc.body.classList.add('app-picker-open');
  if(control.tagName==='SELECT'){
   const list=doc.createElement('div');list.className='app-picker-options';list.setAttribute('role','listbox');list.setAttribute('aria-label',labelFor(control));
   for(const option of control.options){const choice=doc.createElement('button');choice.type='button';choice.className='app-picker-option';choice.setAttribute('role','option');choice.disabled=option.disabled;choice.setAttribute('aria-selected',String(option.selected));const text=doc.createElement('span');text.textContent=option.textContent;if(option.hasAttribute('data-book-content')){text.setAttribute('data-book-content','');text.setAttribute('translate','no');}choice.append(text);if(option.selected)choice.insertAdjacentHTML('beforeend',icon('check'));choice.addEventListener('click',()=>{control.value=option.value;refresh(control);close();control.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));control.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));});list.append(choice);}
   sheet.append(list);requestAnimationFrame(()=>{const selected=list.querySelector('[aria-selected=true]:not(:disabled)')||list.querySelector('button:not(:disabled)');selected?.focus({preventScroll:true});selected?.scrollIntoView?.({block:'nearest'});});
  }else{
   const content=doc.createElement('div');content.className='app-color-editor';
   const preview=doc.createElement('span');preview.className='app-color-preview';preview.style.background=control.value;
   const field=doc.createElement('label');field.className='app-color-hex';field.textContent=language()?'Kode warna':'Hex color';const hex=doc.createElement('input');hex.type='text';hex.maxLength=7;hex.value=control.value;hex.spellcheck=false;hex.autocomplete='off';hex.autocapitalize='off';hex.setAttribute('aria-label',language()?'Kode warna':'Hex color');field.append(hex);
   const apply=doc.createElement('button');apply.type='button';apply.className='primary';apply.textContent=language()?'Terapkan':'Apply';
   const channels=doc.createElement('div');channels.className='app-rgb-controls';
   const ranges=[],outputs=[];let rgb=[0,0,0];
   const validate=()=>{
    const valid=/^#[a-f\d]{6}$/i.test(hex.value);apply.disabled=!valid;hex.setAttribute('aria-invalid',String(!valid));if(!valid)return;
    rgb=[1,3,5].map(offset=>parseInt(hex.value.slice(offset,offset+2),16));preview.style.background=hex.value;
    ranges.forEach((range,index)=>{range.value=String(rgb[index]);outputs[index].value=String(rgb[index]);const low=[...rgb],high=[...rgb];low[index]=0;high[index]=255;range.style.setProperty('--rgb-track',`linear-gradient(to right,rgb(${low.join(',')}),rgb(${high.join(',')}))`);});
   };
   for(const [index,name]of ['R','G','B'].entries()){
    const row=doc.createElement('label');row.className='app-rgb-row';const label=doc.createElement('span');label.textContent=name;const range=doc.createElement('input');range.type='range';range.className='app-rgb-slider';range.min='0';range.max='255';range.step='1';range.setAttribute('aria-label',language()?['Merah','Hijau','Biru'][index]:['Red','Green','Blue'][index]);const output=doc.createElement('output');ranges.push(range);outputs.push(output);
    range.addEventListener('input',()=>{rgb[index]=Number(range.value);hex.value='#'+rgb.map(value=>value.toString(16).padStart(2,'0')).join('');validate();});row.append(label,range,output);channels.append(row);
   }
   hex.addEventListener('input',validate);hex.addEventListener('keydown',event=>{if(event.key==='Enter'&&!apply.disabled){event.preventDefault();apply.click();}});validate();
   apply.addEventListener('click',()=>{if(!/^#[a-f\d]{6}$/i.test(hex.value))return;control.value=hex.value.toLowerCase();refresh(control);close();control.dispatchEvent(new doc.defaultView.Event('input',{bubbles:true}));control.dispatchEvent(new doc.defaultView.Event('change',{bubbles:true}));});
   content.append(preview,field,channels,apply);sheet.append(content);requestAnimationFrame(()=>{if(current?.layer===layer&&!sheet.contains(doc.activeElement))dismiss.focus({preventScroll:true});});
  }
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
 function scan(){doc.querySelectorAll('select,input[type=color]').forEach(enhance);if(current&&!current.control.isConnected)close(false);}
 const observer=new doc.defaultView.MutationObserver(scan);observer.observe(doc.body,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','selected','aria-label']});scan();
 doc.addEventListener('keydown',event=>{
  if(!current)return;const panel=current.layer;
  if(event.key==='Escape'){event.preventDefault();event.stopImmediatePropagation();close();return;}
  const options=Array.from(panel.querySelectorAll('[role=option]:not(:disabled)'));
  if(options.length&&['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault();event.stopImmediatePropagation();const index=options.indexOf(doc.activeElement),next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowDown'?1:-1)+options.length)%options.length;options[next].focus();return;}
  if(event.key==='Tab'){const focusable=Array.from(panel.querySelectorAll('button:not(:disabled),input'));const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&doc.activeElement===first){event.preventDefault();last.focus();}else if(!event.shiftKey&&doc.activeElement===last){event.preventDefault();first.focus();}event.stopImmediatePropagation();}
 },true);
 doc.addEventListener('click',event=>{const label=event.target.closest?.('label');if(label&&!event.target.closest('button')&&label.control&&records.has(label.control)){event.preventDefault();event.stopPropagation();open(label.control);}},true);
 return{close,scan,destroy(){close(false);observer.disconnect();}};
}
