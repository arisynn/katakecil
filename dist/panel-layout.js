// A shared scroll body keeps headings and tabs mounted outside the scrolling content.
export function layoutDialog(dialog){
 if(!dialog)return;
 const fixed=node=>node.nodeType===1&&node.matches('.dialog-heading,.reader-tabs,.appearance-tabs');
 let body=dialog.querySelector(':scope > .dialog-body');
 if(!body){body=dialog.ownerDocument.createElement('div');body.className='dialog-body';dialog.append(body);}
 for(const node of [...dialog.childNodes])if(node!==body&&!fixed(node))body.append(node);
 dialog.classList.add('has-panel-body');
 return body;
}

// Reveal user-opened accordions within their nearest content scroller only.
export function installAccordionReveal(doc=document){
 const activated=new WeakSet(),win=doc.defaultView;
 const click=event=>{const summary=event.target.closest?.('summary');if(summary?.parentElement?.tagName==='DETAILS')activated.add(summary.parentElement);};
 const toggle=event=>{
  const details=event.target;if(details.tagName!=='DETAILS'||!activated.has(details))return;activated.delete(details);if(!details.open)return;
  win.requestAnimationFrame(()=>{
   if(!details.isConnected||!details.open)return;
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
