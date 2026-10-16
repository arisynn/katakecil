import type {CoverSettings,PreparedCover} from './model';
export async function prepareCover(original:Blob,name:string,settings:CoverSettings,signal:AbortSignal,maxSide=1600):Promise<PreparedCover>{
 signal.throwIfAborted();
 if(typeof Worker==='undefined'||typeof OffscreenCanvas==='undefined'||typeof createImageBitmap!=='function'){const {normalizeCover}=await import('./process');return normalizeCover(original,name,settings,signal,maxSide);}
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./cover.worker.ts',import.meta.url),{type:'module'});
  const finish=()=>{clearTimeout(timer);signal.removeEventListener('abort',abort);worker.terminate();};
  const abort=()=>{finish();reject(new DOMException('Dibatalkan','AbortError'));};
  const timer=setTimeout(()=>{finish();reject(Error('Pemrosesan terlalu lama. Coba gambar yang lebih kecil.'));},30_000);
  signal.addEventListener('abort',abort,{once:true});
  worker.onerror=()=>{finish();reject(Error('Gambar tidak dapat diproses. Coba format JPG atau PNG.'));};
  worker.onmessage=e=>{finish();e.data.error?reject(Error(e.data.error)):resolve(e.data.value);};
  worker.postMessage({original,name,settings,maxSide});
 });
}
