/* Notification delivery only. No fetch handler, page cache or PWA installation. */
self.addEventListener('install',()=>self.skipWaiting());
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
function route(value){return typeof value==='string'&&/^\/baca\/[A-Za-z0-9%_-]+(?:\?episode=\d{1,4})?$/.test(value)?value:'/';}
self.addEventListener('push',event=>{
 let payload={};try{payload=event.data?.json()||{};}catch{}
 const title=typeof payload.title==='string'?payload.title.slice(0,140):'Kabar dari KataKecil';
 const body=typeof payload.body==='string'?payload.body.slice(0,240):'Ada cerita yang menunggumu di Library.';
 event.waitUntil(self.registration.showNotification(title,{body,icon:'/brand/app-icon.png',badge:'/brand/notification-badge.png',tag:typeof payload.tag==='string'?payload.tag.slice(0,100):'katakecil-update',data:{path:route(payload.url)}}));
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
