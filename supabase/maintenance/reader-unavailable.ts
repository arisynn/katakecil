// Fail-closed rollout/rollback target for the public reader. No credentials or content.
export function handle(request:Request){
 const headers={'Cache-Control':'no-store','Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'content-type, x-reader-session','Retry-After':'60'};
 return request.method==='OPTIONS'?new Response(null,{status:204,headers}):Response.json({error:'Reading service temporarily unavailable'},{status:503,headers});
}
if(import.meta.main)Deno.serve(handle);
