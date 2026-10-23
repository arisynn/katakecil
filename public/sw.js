/* Notification delivery only. No fetch handler, page cache or PWA installation. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
function route(value){return typeof value==='string'&&/^\/baca\/[A-Za-z0-9%_-]+(?:\?episode=\d{1,4})?$/.test(value)?value:'/';}
// Receipt metadata only: no page cache, manuscript, subscription or credentials.
const displayed=new Set();
function receiptDatabase(){return new Promise((resolve,reject)=>{const request=indexedDB.open('katakecil-push-receipts',1);request.onupgradeneeded=()=>request.result.createObjectStore('seen',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
async function claimReceipt(id){
 const db=await receiptDatabase();
 try{return await new Promise((resolve,reject)=>{const tx=db.transaction('seen','readwrite'),store=tx.objectStore('seen');let fresh=false;const request=store.get(id);
  request.onsuccess=()=>{if(!request.result){fresh=true;store.put({id,at:Date.now()});const all=store.getAll();all.onsuccess=()=>{const sorted=all.result.sort((a,b)=>b.at-a.at);for(const [index,row] of sorted.entries())if(row.at<Date.now()-7*86400000||index>=2048)store.delete(row.id);};}};
  tx.oncomplete=()=>resolve(fresh);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 });}finally{db.close();}
}
async function forgetReceipt(id){try{const db=await receiptDatabase();await new Promise(resolve=>{const tx=db.transaction('seen','readwrite');tx.objectStore('seen').delete(id);tx.oncomplete=tx.onerror=()=>resolve();});db.close();}catch{/* Retry stays possible in memory when persistent storage is unavailable. */}}
async function displayPush(payload){
 const id=typeof payload.eventId==='string'&&/^[0-9a-f]{64}$/.test(payload.eventId)?payload.eventId:null;
 const tag=id?`kk-${id}`:typeof payload.tag==='string'?payload.tag.slice(0,100):'katakecil-update';
 if(id){
  if(displayed.has(id))return;
  try{if(!await claimReceipt(id))return;}catch{const visible=await self.registration.getNotifications?.({tag}).catch(()=>[])||[];if(visible.length)return;}
  if(displayed.has(id))return;displayed.add(id);
 }
 const title=typeof payload.title==='string'?payload.title.slice(0,140):'Kabar dari KataKecil';
 const body=typeof payload.body==='string'?payload.body.slice(0,240):'Ada cerita yang menunggumu di Library.';
 try{await self.registration.showNotification(title,{body,icon:'/brand/app-icon.png',badge:'/brand/notification-badge.png',tag,renotify:false,data:{path:route(payload.url)}});}
 catch(error){if(id){displayed.delete(id);await forgetReceipt(id);}throw error;}
}
self.addEventListener('push',event=>{
 let payload={};try{payload=event.data?.json()||{};}catch{}
 event.waitUntil(displayPush(payload));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const path=route(event.notification.data?.path);
 event.waitUntil((async()=>{
  const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const target=windows.find(client=>new URL(client.url).origin===self.location.origin);
  if(target){target.postMessage({type:'KATAKECIL_OPEN_READER',path});await target.focus();}
  else await self.clients.openWindow(new URL(path,self.location.origin).href);
 })());
});
