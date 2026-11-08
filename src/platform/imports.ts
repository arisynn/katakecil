import {Capacitor, registerPlugin, type PluginListenerHandle} from '@capacitor/core';
interface Incoming {id:string;name?:string;size?:number;error?:string}
interface ImportPlugin {
 pending():Promise<{file:Incoming|null}>;
 read(options:{id:string;offset:number}):Promise<{base64:string}>;
 finish(options:{id:string}):Promise<void>;
 addListener(name:'incomingEpub',callback:()=>void):Promise<PluginListenerHandle>;
}
const Import=registerPlugin<ImportPlugin>('KataKecilImport');
export async function listenIncomingEpub(receive:(file:File)=>Promise<void>,error:(message:string)=>void){
 if(!Capacitor.isNativePlatform())return;
 let busy=false;
 const drain=async()=>{
  if(busy)return;busy=true;
  try{
   for(;;){
    const {file}=await Import.pending();if(!file)break;
    try{
     if(file.error)throw Error(file.error);
     const size=file.size;
     if(typeof size!=='number'||!Number.isSafeInteger(size)||size<1||size>30*1024*1024)throw Error('Choose an EPUB smaller than 30 MB.');
     const bytes=new Uint8Array(size);let offset=0;
     while(offset<bytes.length){const {base64}=await Import.read({id:file.id,offset}),chunk=atob(base64);if(!chunk.length||chunk.length>bytes.length-offset)throw Error('Incomplete EPUB file.');for(let i=0;i<chunk.length;i++)bytes[offset+i]=chunk.charCodeAt(i);offset+=chunk.length;}
     await receive(new File([bytes],file.name||'book.epub',{type:'application/epub+zip'}));
    }catch(e){error((e as Error).message);}
    finally{await Import.finish({id:file.id});}
   }
  }catch(e){error((e as Error).message);}
  finally{busy=false;}
 };
 const listener=await Import.addListener('incomingEpub',()=>{void drain();});
 void drain();return listener;
}
