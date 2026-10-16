import {COVER_LIMITS,fitSize,sanitizeSettings,type CoverSettings,type PreparedCover} from './model';
import {inspectBlob} from './inspect';
export async function normalizeCover(original:Blob,name:string,settings:CoverSettings,signal?:AbortSignal,maxSide=COVER_LIMITS.normalizedSide):Promise<PreparedCover>{
 signal?.throwIfAborted();const info=await inspectBlob(original);signal?.throwIfAborted();
 let bitmap:ImageBitmap|HTMLImageElement;let temporary='';
 if(typeof createImageBitmap==='function')bitmap=await createImageBitmap(original,{imageOrientation:'from-image'});
 else {if(typeof document==='undefined')throw Error('Pemrosesan gambar tidak tersedia di perangkat ini.');temporary=URL.createObjectURL(original);const img=new Image();img.src=temporary;try{await img.decode();bitmap=img;}catch{URL.revokeObjectURL(temporary);throw Error('Gambar tidak dapat dibaca.');}}
 try {
  signal?.throwIfAborted();const s=sanitizeSettings(settings),sourceWidth=bitmap instanceof Object&&'naturalWidth' in bitmap?bitmap.naturalWidth:bitmap.width,sourceHeight='naturalHeight' in bitmap?bitmap.naturalHeight:bitmap.height;
  const rotated=s.rotation===90||s.rotation===270;
  const dimensions=fitSize(rotated?sourceHeight:sourceWidth,rotated?sourceWidth:sourceHeight,Math.min(1600,maxSide),Math.min(1600,maxSide));
  const canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(dimensions.width,dimensions.height):Object.assign(document.createElement('canvas'),dimensions);
  const ctx=canvas.getContext('2d') as OffscreenCanvasRenderingContext2D|CanvasRenderingContext2D|null;if(!ctx)throw Error('Pemrosesan gambar tidak tersedia.');
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.translate(dimensions.width/2,dimensions.height/2);ctx.rotate(s.rotation*Math.PI/180);
  const drawW=rotated?dimensions.height:dimensions.width,drawH=rotated?dimensions.width:dimensions.height;
  ctx.drawImage(bitmap,-drawW/2,-drawH/2,drawW,drawH);
  const normalized=typeof OffscreenCanvas!=='undefined'&&canvas instanceof OffscreenCanvas?await canvas.convertToBlob({type:'image/png'}):await new Promise<Blob>((resolve,reject)=>(canvas as HTMLCanvasElement).toBlob(b=>b?resolve(b):reject(Error('Gagal menyiapkan gambar.')),'image/png'));
  signal?.throwIfAborted();if(normalized.size>COVER_LIMITS.normalizedBytes)throw Error('Hasil gambar terlalu besar. Coba sampul dengan resolusi lebih kecil.');
  return {original,normalized,info,...dimensions,name:name.slice(0,180),settings:s};
 }finally{if('close' in bitmap)bitmap.close();if(temporary)URL.revokeObjectURL(temporary);}
}
