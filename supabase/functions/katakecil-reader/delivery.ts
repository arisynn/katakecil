// Text remains text. This protocol limits delivery, not copying of text already displayed.
export const sha256 = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');
export interface Chapter {text:string; href:string; title:string; chapterLabel?:string; navigationTitle?:string; arc?:{id:string;label:string;title:string}; contentHash:string}
export interface Book {id:string;title:string;author:string;language:string;revision:string;section_ids:string[];[key:string]:unknown}
export interface Budget {allowed:boolean;reason?:string;retry_after?:number}
export interface DeliveryDependencies {
  catalog: (id?:string)=>Promise<Book[]>;
  edition: (book:Book)=>Promise<Chapter[]>;
  budget: (input:{kind:string;visitor:string;session:string;book:string;revision:string;cost:number;episode:string;lease:string})=>Promise<Budget>;
  visitor: (request:Request)=>Promise<string>;
}
const origins=new Set(['https://katakecil.vercel.app','https://localhost','capacitor://localhost']);
export function createDelivery(deps:DeliveryDependencies){return async(request:Request)=>{
  const origin=request.headers.get('origin');
  const headers:Record<string,string>={'Cache-Control':'private, no-store, max-age=0','Vary':'Origin','X-Content-Type-Options':'nosniff','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'content-type, x-reader-session','Access-Control-Expose-Headers':'Retry-After','Cross-Origin-Resource-Policy':'same-site'};
  if(origin&&origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
  const json=(body:unknown,status=200,extra:Record<string,string>={})=>Response.json(body,{status,headers:{...headers,...extra}});
  if(origin&&!origins.has(origin))return json({error:'Origin not allowed'},403);
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
  const target=new URL(request.url),action=target.searchParams.get('action')||'catalog';
  if(action==='epub')return json({error:'Update the app to use online reading',code:'reader_upgrade_required'},410);
  if(!['catalog','session','manifest','episode'].includes(action))return json({error:'Unknown action'},400);
  if(request.method!==(action==='session'?'POST':'GET'))return json({error:'Method not allowed'},405);
  const id=target.searchParams.get('book')||'',revision=target.searchParams.get('revision')||'';
  if(action!=='catalog'&&(!/^[a-z0-9][a-z0-9_-]{0,119}$/.test(id)||!/^[a-f0-9]{64}$/.test(revision)))return json({error:'Invalid publication'},400);
  const chapterIndex=Number(target.searchParams.get('chapter'));
  if(action==='episode'&&(!target.searchParams.has('chapter')||!Number.isSafeInteger(chapterIndex)||chapterIndex<0||chapterIndex>599))return json({error:'Invalid episode'},400);
  let rawToken=request.headers.get('x-reader-session')||'';
  if(['manifest','episode'].includes(action)&&!/^rs_[a-f0-9]{64}$/.test(rawToken))return json({error:'Reading session expired',code:'session_expired'},401);
  let release:(()=>Promise<Budget>)|null=null;
  try{
    const visitor=await deps.visitor(request);
    if(action==='session')rawToken='rs_'+Array.from(crypto.getRandomValues(new Uint8Array(32))).map(n=>n.toString(16).padStart(2,'0')).join('');
    const session=rawToken?await sha256(rawToken):'';
    const lease=crypto.randomUUID();
    const charge=async(kind:string,cost=0,episode='')=>deps.budget({kind,visitor,session,book:id,revision,cost,episode,lease});
    const admission=await charge(action==='session'?'open':action==='catalog'?'catalog':'request');
    const denied=(b:Budget)=>json({error:b.reason==='session'?'Reading session expired':'Please wait before loading more text',code:b.reason==='session'?'session_expired':'read_limit'},b.reason==='session'?401:429,{'Retry-After':String(Math.max(1,b.retry_after||10))});
    if(!admission.allowed)return denied(admission);
    if(['manifest','episode'].includes(action))release=()=>charge('release');
    if(action==='catalog')return json({protocol:2,books:await deps.catalog(),server_time:new Date().toISOString()});
    let book=(await deps.catalog(id))[0];
    if(!book?.section_ids.length)return json({error:'Publication unavailable'},404);
    if(book.revision!==revision)return json({error:'Publication changed',code:'revision_changed'},409);
    if(action==='session')return json({session:rawToken,expires_in:1800,revision});
    const chapters=await deps.edition(book);
    let body:unknown;
    if(action==='manifest')body={revision,protocol:2,chapters:chapters.map(({text,...metadata})=>({...metadata,length:text.length}))};
    else{
      const chapter=chapters[chapterIndex];if(!chapter)return json({error:'Episode unavailable'},404);
      const budget=await charge('deliver',chapter.text.length,await sha256(book.id+':'+revision+':'+chapter.href+':'+chapterIndex));
      if(!budget.allowed)return denied(budget);
      body={text:chapter.text,revision,chapter:chapterIndex,href:chapter.href,contentHash:chapter.contentHash};
    }
    // Recheck publication, parent state, release dates and revision after parsing/limiting.
    book=(await deps.catalog(id))[0];
    if(!book?.section_ids.length)return json({error:'Publication unavailable'},404);
    if(book.revision!==revision)return json({error:'Publication changed',code:'revision_changed'},409);
    const final=await charge('validate');if(!final.allowed)return denied(final);
    return json(body);
  }catch{return json({error:'Reading service temporarily unavailable'},503);}
  finally{if(release)await release().catch(()=>{});}
};}
