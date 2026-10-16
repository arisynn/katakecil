import {normalizeCover} from './process';
self.onmessage=async event=>{try{const value=await normalizeCover(event.data.original,event.data.name,event.data.settings,undefined,event.data.maxSide);self.postMessage({value});}catch(e){self.postMessage({error:e instanceof Error?e.message:'Gambar tidak dapat diproses.'});}};
