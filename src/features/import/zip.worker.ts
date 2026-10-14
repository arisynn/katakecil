import {parseZip} from './zip';
self.onmessage=async(event:MessageEvent<{bytes:ArrayBuffer;name:string}>)=>{
  try{const result=await parseZip(new Uint8Array(event.data.bytes),event.data.name,message=>self.postMessage({type:'progress',message}));self.postMessage({type:'result',result});}
  catch(error){self.postMessage({type:'error',message:error instanceof Error?error.message:'ZIP tidak dapat dibaca.'});}
};
