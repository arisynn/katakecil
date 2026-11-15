import {loadingLogo} from './loading-logo.js?v=9';

const dismissals=new WeakMap();

// Launch is a brand moment independent of the device's in-app loader choice.
export function createLaunchSplash({language='en'}={}){
 const indonesian=String(language).toLowerCase().startsWith('id');
 const element=document.createElement('div');
 element.id='launch-loading';
 element.className='launch-loading launch-splash';
 element.setAttribute('role','status');
 element.setAttribute('aria-label',indonesian?'Memuat KataKecil':'Loading KataKecil');
 element.innerHTML=`<div class="launch-splash-scene"><span class="launch-splash-halo" aria-hidden="true"></span><div class="launch-splash-emblem">${loadingLogo('pulse')}</div><p class="launch-splash-tagline">${indonesian?'Ruang kecil untuk cerita besar':'A little room for great stories'}</p></div>`;
 return element;
}

// Real readiness calls this immediately; only the short exit transition is awaited.
export async function dismissLaunchSplash(element,{immediate=false}={}){
 if(!element)return;
 const doc=element.ownerDocument,view=doc?.defaultView;
 const skip=immediate||doc?.hidden||view?.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
 const active=dismissals.get(element);
 if(active){if(skip)active.finish();return active.promise;}
 if(skip||!element.isConnected){element.remove();return;}
 let resolve;
 const promise=new Promise(done=>resolve=done);
 let timer;
 const finish=()=>{
  clearTimeout(timer);
  element.removeEventListener('transitionend',ended);
  element.removeEventListener('transitioncancel',ended);
  element.remove();
  dismissals.delete(element);
  resolve();
 };
 const ended=event=>{
  if(event.target===element&&event.propertyName==='opacity')finish();
 };
 dismissals.set(element,{promise,finish});
 element.addEventListener('transitionend',ended);
 element.addEventListener('transitioncancel',ended);
 element.classList.add('is-leaving');
 timer=setTimeout(finish,260);
 return promise;
}
