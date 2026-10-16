import {createClient} from 'npm:@supabase/supabase-js@2.117.3';
import decodePNG,{init as initPNG} from 'npm:@jsquash/png@3.1.1/decode.js';
import encodeWebP,{init as initWebP} from 'npm:@jsquash/webp@1.5.0/encode.js';
import {simd} from 'npm:wasm-feature-detect@1.9.0';
import {png,webp,webpSimd} from '../_shared/cover-codecs/wasm.ts';
import {createCoverRaster} from '../_shared/cover-raster.ts';
if(typeof globalThis.ImageData==='undefined'){(globalThis as any).ImageData=class ImageData{constructor(public data:Uint8ClampedArray,public width:number,public height:number){}};}
const compile=(bits:string)=>WebAssembly.compile(Uint8Array.from(atob(bits),c=>c.charCodeAt(0)));
await initPNG(await compile(png));await initWebP(await compile(await simd()?webpSimd:webp));
export const CoverRaster=createCoverRaster(async bytes=>{const value=await decodePNG(new Uint8Array(bytes).buffer,{bitDepth:8});return {width:value.width,height:value.height,data:new Uint8ClampedArray(value.data)};},(pixels,options)=>encodeWebP(pixels as ImageData,options));
import {createCoverHandler} from '../_shared/cover-service.ts';
function serverKey(){try{const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');if(keys.default)return keys.default;}catch{}return Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');}
const url=Deno.env.get('SUPABASE_URL'),key=serverKey();
if(!url||!key)throw Error('Server configuration missing.');
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
Deno.serve(createCoverHandler(db,CoverRaster));
