import {COVER_LIMITS,cropRect,fitSize,sanitizeSettings,type CoverSettings} from './cover-model.ts';
import {inspectImage} from './cover-inspect.ts';
/** The codec adapter is injected so the deployed WASM pipeline is also exercised by tests. */
export async function renderCover(normalized:Uint8Array,settings:CoverSettings,ImageClass:any){
 const info=inspectImage(normalized);
 if(info.mime!=='image/png'||normalized.length>COVER_LIMITS.normalizedBytes||info.width>1600||info.height>1600||info.orientation!==1)throw Error('Gambar normalisasi tidak valid.');
 const image=await ImageClass.decode(normalized);
 if(image.width!==info.width||image.height!==info.height)throw Error('Dimensi gambar tidak cocok.');
 const s=sanitizeSettings(settings),rect=cropRect(image.width,image.height,s);
 const crop={x:Math.floor(rect.x),y:Math.floor(rect.y),width:Math.max(1,Math.floor(rect.width)),height:Math.max(1,Math.floor(rect.height))};
 const cardBase=s.mode==='crop'?image.clone().crop(crop.x,crop.y,crop.width,crop.height):image;
 const outputs:{name:string;width:number;height:number;bytes:Uint8Array;kind:'card'|'detail';mime:string}[]=[];
 const dimensions=new Set<string>();
 for(const width of [160,360,720]){
  const size=fitSize(cardBase.width,cardBase.height,width);const key=`${size.width}x${size.height}`;if(dimensions.has(key))continue;dimensions.add(key);
  const raster=cardBase.clone().resize(size.width,size.height);
  const bytes=await raster.encodeWEBP(88);if(bytes.length>2*1024*1024)throw Error('Varian sampul terlalu besar. Gunakan gambar lebih sederhana.');
  outputs.push({name:`card-${size.width}.webp`,...size,bytes,kind:'card',mime:'image/webp'});
 }
 const detail=await image.encodeWEBP(92);if(detail.length>2*1024*1024)throw Error('Versi detail terlalu besar. Coba gambar beresolusi lebih kecil.');
 outputs.push({name:'detail.webp',width:image.width,height:image.height,bytes:detail,kind:'detail',mime:'image/webp'});
 return outputs;
}
