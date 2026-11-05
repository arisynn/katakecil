// Retired for every book, including historical allowlists. Never sign or redirect originals.
export async function handle(request:Request){
 const headers={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Methods':'GET, OPTIONS','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
 return Response.json({error:'Update the app to use online reading',code:'reader_upgrade_required'},{status:410,headers});
}
if(import.meta.main)Deno.serve(handle);
