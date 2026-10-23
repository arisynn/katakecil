import {buildPushPayload} from '@block65/webcrypto-web-push';
import type {PushConfig,Sender} from './core.ts';
export function sender(config:PushConfig):Sender{return async(subscription,payload)=>{
 const request=await buildPushPayload({data:JSON.stringify(payload),options:{ttl:86400}},{...subscription,expirationTime:null},{subject:config.subject,publicKey:config.publicKey,privateKey:config.privateKey});
 const headers=new Headers(request.headers);headers.set('Topic',payload.eventId.slice(0,32));headers.set('Urgency','normal');
 const result=await fetch(subscription.endpoint,{...request,headers,redirect:'error',signal:AbortSignal.timeout(7000)});
 await result.body?.cancel();if(!result.ok)throw Object.assign(Error('Push provider rejected delivery'),{statusCode:result.status});
};}
