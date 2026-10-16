import encodePNG,{init} from '@jsquash/png/encode.js';
import {loadTs} from './load-ts.mjs';
const {png}=loadTs('supabase/functions/_shared/cover-codecs/wasm.ts');
await init(await WebAssembly.compile(Uint8Array.from(atob(png),c=>c.charCodeAt(0))));
/** Portable synthetic pixels for tests; does not load native image addons. */
export class Image {
 constructor(width,height){this.width=width;this.height=height;this.data=new Uint8ClampedArray(width*height*4);}
 fill(value){for(let y=0;y<this.height;y++)for(let x=0;x<this.width;x++){const c=(typeof value==='function'?value(x+1,y+1):value)>>>0,p=(y*this.width+x)*4;this.data[p]=c>>>24;this.data[p+1]=c>>>16&255;this.data[p+2]=c>>>8&255;this.data[p+3]=c&255;}return this;}
 async encode(){return new Uint8Array(await encodePNG(this));}
}
