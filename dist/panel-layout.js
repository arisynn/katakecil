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
