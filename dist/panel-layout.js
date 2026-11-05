// A shared scroll body keeps headings and tabs mounted outside the scrolling content.
export function layoutDialog(dialog){
 if(!dialog)return;
 const fixed=node=>node.nodeType===1&&node.matches('.dialog-heading,.reader-tabs,.appearance-tabs');
 let body=dialog.querySelector(':scope > .dialog-body');
 if(!body){body=dialog.ownerDocument.createElement('div');body.className='dialog-body';dialog.append(body);}
 for(const node of [...dialog.childNodes])if(node!==body&&!fixed(node))body.append(node);
 dialog.classList.add('has-panel-body');fitSheet(dialog);scheduleSheetFit(dialog.ownerDocument);
 return body;
}

// Reveal user-opened accordions within their nearest content scroller only.
export function installAccordionReveal(doc=document){
 const activated=new WeakSet(),win=doc.defaultView;
 const click=event=>{const summary=event.target.closest?.('summary');if(summary?.parentElement?.tagName==='DETAILS')activated.add(summary.parentElement);};
 const toggle=event=>{
  const details=event.target;if(details.tagName!=='DETAILS'||!activated.has(details))return;activated.delete(details);if(!details.open)return;
  win.requestAnimationFrame(()=>{
   if(!details.isConnected||!details.open)return;fitSheet(details.closest('.dialog,.app-picker'));
   let scroller=details.parentElement;
   while(scroller&&!(scroller.scrollHeight>scroller.clientHeight+1&&/auto|scroll/.test(win.getComputedStyle(scroller).overflowY)))scroller=scroller.parentElement;
   const rect=details.getBoundingClientRect(),reduced=win.matchMedia?.('(prefers-reduced-motion: reduce)').matches,behavior=reduced?'auto':'smooth';
   if(scroller){const box=scroller.getBoundingClientRect();if(rect.bottom>box.bottom-8||rect.top<box.top+8){const top=Math.max(0,Math.min(scroller.scrollHeight-scroller.clientHeight,scroller.scrollTop+rect.top-box.top-8));scroller.scrollTo({top,behavior});}}
   else if(rect.bottom>win.innerHeight||rect.top<0)details.scrollIntoView({block:'start',behavior});
  });
 };
 doc.addEventListener('click',click,true);doc.addEventListener('toggle',toggle,true);
 return{destroy(){doc.removeEventListener('click',click,true);doc.removeEventListener('toggle',toggle,true);}};
}

// Short panels can borrow a little vertical room instead of showing a tiny scrollbar.
export function fitSheet(sheet){
 if(!sheet?.isConnected||sheet.closest('[data-sheet-closing]'))return;
 const content=sheet.querySelector(':scope > .dialog-body,:scope > .app-picker-options,:scope > .app-color-editor');if(!content)return;
 const win=sheet.ownerDocument.defaultView,box=sheet.getBoundingClientRect(),body=content.getBoundingClientRect();if(!box.height||!body.height)return;
 const visible=win.visualViewport?.height||win.innerHeight,parent=win.getComputedStyle(sheet.parentElement),insets=(parseFloat(parent.paddingTop)||0)+(parseFloat(parent.paddingBottom)||0);
 const room=Math.max(0,visible-insets-(box.height-body.height)-8),base=Math.min(win.innerHeight*.5,room),natural=content.scrollHeight;
 const target=natural>base&&natural-base<=48&&natural<=room?natural:base,value=Math.max(0,Math.ceil(target))+'px';
 if(sheet.style.getPropertyValue('--sheet-content-limit')!==value)sheet.style.setProperty('--sheet-content-limit',value);
 sheet.dataset.scrollable=String(natural>target+1);
}
const scheduled=new WeakMap();
export function fitOpenSheets(doc=document){doc.querySelectorAll('.dialog,.app-picker').forEach(fitSheet);}
export function scheduleSheetFit(doc=document){if(scheduled.has(doc))return;scheduled.set(doc,doc.defaultView.requestAnimationFrame(()=>{scheduled.delete(doc);fitOpenSheets(doc);}));}
