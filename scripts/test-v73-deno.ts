/** Execute the real Edge entry point with outbound network and native FFI disallowed. */
let handler:((req:Request)=>Promise<Response>)|undefined;
(Deno as any).serve=(callback:any)=>{handler=callback;return {};};
Deno.env.set('SUPABASE_URL','https://synthetic-qa.supabase.co');
Deno.env.set('SUPABASE_SERVICE_ROLE_KEY','synthetic-test-key');
const {CoverRaster}=await import('../supabase/functions/cover-assets/index.ts');
const {renderCover}=await import('../supabase/functions/_shared/cover-render.ts');
const {DEFAULT_COVER}=await import('../supabase/functions/_shared/cover-model.ts');
const {inspectImage}=await import('../supabase/functions/_shared/cover-inspect.ts');
if(!handler)throw Error('Handler not registered.');
const noSession=await handler(new Request('https://synthetic/cover-assets',{method:'POST',body:'{}'}));
if(noSession.status!==401||noSession.headers.get('cache-control')!=='private, no-store')throw Error('Session/cache guard failed.');
const input=await Deno.readFile('qa/v73/edge-input.png'),start=performance.now();
const variants=await renderCover(input,{...DEFAULT_COVER,mode:'crop',x:.2,y:.7,zoom:1.3},CoverRaster);
if(variants.length!==4||variants.some(v=>inspectImage(v.bytes).mime!=='image/webp'))throw Error('WASM rendering failed.');
console.log(JSON.stringify({test:'V7.3 real Edge entry + PNG decode + crop/resize + WebP encode',runtime:Deno.version.deno,nativeFFI:false,outboundNetwork:false,milliseconds:Math.round(performance.now()-start),outputs:variants.map(v=>({name:v.name,width:v.width,height:v.height,bytes:v.bytes.length}))}));
