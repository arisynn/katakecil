const RECEIPT='kk-web-push-receipt';
type Receipt={capability:string;endpoint:string};
export type WebPushState={supported:boolean;available:boolean;enabled:boolean;permission:NotificationPermission|'unsupported';publicKey?:string};
const supported=()=>typeof window!=='undefined'&&window.isSecureContext&&'Notification'in window&&'serviceWorker'in navigator&&'PushManager'in window&&!(/iPad|iPhone|iPod/.test(navigator.userAgent)&&!matchMedia('(display-mode: standalone)').matches);
function receipt():Receipt|null{try{const value=JSON.parse(localStorage.getItem(RECEIPT)||'null');return typeof value?.endpoint==='string'&&typeof value.capability==='string'&&/^[\w-]{43}$/.test(value.capability)?value:null;}catch{return null;}}
function edgeUrl(action:'subscribe'|'unsubscribe'){
 const backend=import.meta.env.VITE_SUPABASE_URL?.trim(),key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();if(!backend||!key)throw Error('Backend notifikasi belum dikonfigurasi.');
 const url=new URL(`/functions/v1/web-push-${action}`,backend);if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Backend notifikasi harus HTTPS.');
 return {url:url.href,headers:{apikey:key}};
}
async function config(){try{const {url,headers}=edgeUrl('subscribe');const response=await fetch(url,{headers,cache:'no-store',credentials:'omit',signal:AbortSignal.timeout(8000)});if(!response.ok)return {available:false};return await response.json() as {available:boolean;publicKey?:string};}catch{return {available:false};}}
export async function getWebPushState():Promise<WebPushState>{
 if(!supported())return {supported:false,available:false,enabled:false,permission:'unsupported'};
 const settings=await config(),reg=await navigator.serviceWorker.getRegistration('/');
 const existing=await reg?.pushManager.getSubscription();
 return {supported:true,available:settings.available===true,enabled:!!existing,permission:Notification.permission,publicKey:settings.publicKey};
}
function publicKey(value:string){const bin=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(bin,c=>c.charCodeAt(0));}
async function send(action:'subscribe'|'unsubscribe',subscription:PushSubscription,capability:string){
 const {url,headers}=edgeUrl(action);
 const response=await fetch(url,{method:'POST',headers:{...headers,'Content-Type':'application/json'},cache:'no-store',credentials:'omit',body:JSON.stringify({subscription:subscription.toJSON(),capability}),signal:AbortSignal.timeout(12000)});
 if(!response.ok){let message='Notifikasi belum dapat disimpan. Coba lagi.';try{message=(await response.json()).error||message;}catch{}throw Error(message);}
}
export async function enableWebPush(key:string){
 if(!supported())throw Error('Browser ini belum mendukung notifikasi web.');
 // Only called from an explicit user gesture, never on page load.
 const permission=await Notification.requestPermission();if(permission!=='granted')throw Error('Izin notifikasi belum diberikan. Periksa pengaturan situs pada browser.');
 const reg=await navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'});await navigator.serviceWorker.ready;
 const old=await reg.pushManager.getSubscription(),saved=receipt();
 if(old&&(!saved||saved.endpoint!==old.endpoint))await old.unsubscribe();
 const subscription=old&&saved?.endpoint===old.endpoint?old:await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:publicKey(key)});
 const capability=saved?.endpoint===subscription.endpoint?saved.capability:btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32)))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 // Retain ownership before the request so a lost response can be reconciled.
 try{localStorage.setItem(RECEIPT,JSON.stringify({endpoint:subscription.endpoint,capability}));}catch{await subscription.unsubscribe();throw Error('Browser tidak dapat menyimpan pilihan notifikasi.');}
 await send('subscribe',subscription,capability);
}
export async function disableWebPush(){
 const reg=await navigator.serviceWorker.getRegistration('/'),subscription=await reg?.pushManager.getSubscription(),saved=receipt();
 if(!subscription){localStorage.removeItem(RECEIPT);return;}
 let error:unknown;
 if(saved?.endpoint===subscription.endpoint)try{await send('unsubscribe',subscription,saved.capability);}catch(e){error=e;}
 const done=await subscription.unsubscribe();if(!done)throw Error('Browser belum dapat menghentikan notifikasi. Coba lagi.');
 localStorage.removeItem(RECEIPT);
 if(error)throw Error('Notifikasi browser dihentikan. Pembersihan data server dilanjutkan saat langganan kedaluwarsa.');
}
