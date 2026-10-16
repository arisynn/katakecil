/** Shared with the cover endpoint. Keep this module free of browser/React dependencies. */
export const COVER_LIMITS = {bytes:15*1024*1024,pixels:20_000_000,side:8192,normalizedSide:1600,normalizedBytes:12*1024*1024,candidates:12,candidateBytes:30*1024*1024};
export type CoverMode = 'contain'|'crop';
export type CoverSettings = {mode:CoverMode;x:number;y:number;zoom:number;rotation:0|90|180|270};
export const DEFAULT_COVER:CoverSettings={mode:'contain',x:.5,y:.5,zoom:1,rotation:0};
export type ImageInfo={width:number;height:number;mime:'image/jpeg'|'image/png'|'image/webp';orientation:number;transparent:boolean};
export type CoverVariant={path:string;width:number;height:number;bytes:number;mime:string};
export type CoverManifest={version:string;mode:CoverMode;card:CoverVariant[];detail:CoverVariant};
export type PublicCoverManifest={version:string;mode:CoverMode;card:(Omit<CoverVariant,'path'>&{url:string})[];detail:Omit<CoverVariant,'path'>&{url:string}};
export type CoverAsset={id:string;book_id:string;source_name:string;source_path:string;normalized_path:string;settings:CoverSettings;width:number;height:number;source_bytes:number;status:'pending'|'ready'|'published'|'abandoned';manifest:CoverManifest|null;created_at:string;created_by:string};
export type PreparedCover={original:Blob;normalized:Blob;info:ImageInfo;width:number;height:number;name:string;settings:CoverSettings};
export function sanitizeSettings(input:Partial<CoverSettings>={}):CoverSettings {
 const clamp=(n:unknown,min:number,max:number,fallback:number)=>typeof n==='number'&&Number.isFinite(n)?Math.min(max,Math.max(min,n)):fallback;
 return {mode:input.mode==='crop'?'crop':'contain',x:clamp(input.x,0,1,.5),y:clamp(input.y,0,1,.5),zoom:clamp(input.zoom,1,4,1),rotation:([0,90,180,270].includes(input.rotation as number)?input.rotation:0) as CoverSettings['rotation']};
}
/** Normalized crop coordinates are fractions of the available travel, not image pixels. */
export function cropRect(width:number,height:number,settings:CoverSettings) {
 const s=sanitizeSettings(settings);let w=width,h=height;
 if(s.mode==='crop'){if(width/height>2/3)w=height*2/3;else h=width*3/2;w/=s.zoom;h/=s.zoom;}
 return {x:Math.max(0,(width-w)*s.x),y:Math.max(0,(height-h)*s.y),width:w,height:h};
}
export function fitSize(width:number,height:number,maxWidth:number,maxSide=1600){
 const scale=Math.min(1,maxWidth/width,maxSide/Math.max(width,height));
 return {width:Math.max(1,Math.round(width*scale)),height:Math.max(1,Math.round(height*scale))};
}
export function ratioLabel(width:number,height:number){
 const ratio=width/height;const known:[[number,number],string][]=[[[2,3],'2:3'],[[9,16],'9:16'],[[3,4],'3:4'],[[1,1],'1:1'],[[16,9],'16:9']];
 return known.find(([[w,h]])=>Math.abs(ratio-w/h)<.015)?.[1]||`${width}:${height}`;
}
export function imageAdvice(info:Pick<ImageInfo,'width'|'height'>){
 const r=info.width/info.height;
 if(Math.min(info.width,info.height)<360)return 'Resolusi kecil; sampul mungkin kurang tajam saat diperbesar.';
 if(r<.4||r>1.5)return 'Gambar sangat panjang atau lebar. Detail akan terlihat kecil; kamu bisa mengatur potongan khusus katalog.';
 return Math.abs(r-2/3)<.015?'Rasio ini pas dengan bingkai katalog.':r<2/3?'Mode utuh menyisakan ruang di kiri dan kanan.':'Mode utuh menyisakan ruang di atas dan bawah.';
}
