// A save action uses browser downloads, which do not require Web Share permission.
export function downloadBlob(filename:string,blob:Blob,doc:Document=document):boolean{
 const url=URL.createObjectURL(blob),link=doc.createElement('a');link.href=url;link.download=filename;doc.body.append(link);
 try{link.click();}finally{link.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);}
 return true;
}
