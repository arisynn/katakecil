/** Small RGBA adapter. Codecs are injected; production uses portable WebAssembly, never native addons. */
type Pixels={data:Uint8ClampedArray|Uint8Array;width:number;height:number};
export function createCoverRaster(decodePNG:(bytes:Uint8Array)=>Promise<Pixels>,encodeWebP:(pixels:Pixels,options:any)=>Promise<ArrayBuffer>){
 return class CoverRaster {
  width:number;height:number;data:Uint8ClampedArray;
  constructor(width:number,height:number,data:Uint8ClampedArray){this.width=width;this.height=height;this.data=data;}
  static async decode(bytes:Uint8Array){const image=await decodePNG(bytes);if(image.width<1||image.height<1||image.width>1600||image.height>1600||image.data.length!==image.width*image.height*4)throw Error('Bitmap normalisasi tidak valid.');return new CoverRaster(image.width,image.height,new Uint8ClampedArray(image.data));}
  clone(){return new CoverRaster(this.width,this.height,this.data.slice());}
  crop(x:number,y:number,width:number,height:number){
   if(x<0||y<0||x+width>this.width||y+height>this.height)throw Error('Area sampul di luar gambar.');const out=new Uint8ClampedArray(width*height*4);
   for(let row=0;row<height;row++)out.set(this.data.subarray(((y+row)*this.width+x)*4,((y+row)*this.width+x+width)*4),row*width*4);
   this.data=out;this.width=width;this.height=height;return this;
  }
  resize(width:number,height:number){
   if(width===this.width&&height===this.height)return this;
   const out=new Uint8ClampedArray(width*height*4),sx=this.width/width,sy=this.height/height;
   for(let y=0;y<height;y++){
    const sourceY=Math.max(0,Math.min(this.height-1,(y+.5)*sy-.5)),y0=Math.floor(sourceY),y1=Math.min(this.height-1,y0+1),dy=sourceY-y0;
    for(let x=0;x<width;x++){
     const sourceX=Math.max(0,Math.min(this.width-1,(x+.5)*sx-.5)),x0=Math.floor(sourceX),x1=Math.min(this.width-1,x0+1),dx=sourceX-x0;
     const indices=[(y0*this.width+x0)*4,(y0*this.width+x1)*4,(y1*this.width+x0)*4,(y1*this.width+x1)*4],weights=[(1-dx)*(1-dy),dx*(1-dy),(1-dx)*dy,dx*dy];
     let alpha=0,r=0,g=0,b=0;for(let i=0;i<4;i++){const p=indices[i],weight=weights[i]*this.data[p+3];alpha+=weight;r+=this.data[p]*weight;g+=this.data[p+1]*weight;b+=this.data[p+2]*weight;}
     const p=(y*width+x)*4;out[p+3]=alpha;if(alpha){out[p]=r/alpha;out[p+1]=g/alpha;out[p+2]=b/alpha;}
    }
   }
   this.width=width;this.height=height;this.data=out;return this;
  }
  async encodeWEBP(quality=88){return new Uint8Array(await encodeWebP({data:this.data,width:this.width,height:this.height},{quality,method:1}));}
 };
}
