/* KataKecil 7.2.0-rc.1: network-only. Never store responses or replay mutations. */
const connectionPage='<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#081425"><title>KataKecil — Koneksi diperlukan</title><style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#081425;color:#eff6ff;font:16px/1.6 system-ui}main{max-width:32rem;padding:2rem;text-align:center}button{padding:12px 20px;border-radius:12px;border:0;font:inherit;background:#9bc9ff;color:#081425}</style><main><h1>Koneksi diperlukan</h1><p>Hubungkan internet untuk membuka KataKecil. Cerita tidak tersedia secara offline.</p><button onclick="location.reload()">Coba lagi</button></main></html>';
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET'||req.mode!=='navigate'||new URL(req.url).origin!==self.location.origin)return;
  event.respondWith(fetch(req,{cache:'no-store'}).catch(()=>new Response(connectionPage,{status:503,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}})));
});
