import {readConfig,subscriptionRequest,validSubscription} from './core.ts';
import {base64url} from './crypto.ts';
import {sender} from './transport.ts';
const assert=(value:unknown,message='Assertion failed')=>{if(!value)throw Error(message);};
const fromHex=(value:string)=>Uint8Array.from(value.match(/../g)!,byte=>Number.parseInt(byte,16));
const point=fromHex('04'+'6b17d1f2e12c4247f8bce6e563a440f277037d812deb33a0f4a13945d898c296'+'4fe342e2fe1a7f9b8ee7eb4a7c0f9e162bce33576b315ececbb6406837bf51f5');
const publicKey=base64url(point),privateKey=base64url(fromHex('00'.repeat(31)+'01'));
const env:Record<string,string>={WEB_PUSH_ENABLED:'true',WEB_PUSH_SITE_ORIGIN:'https://reader.example.test',SUPABASE_URL:'https://synthetic.supabase.co',WEB_PUSH_VAPID_PUBLIC_KEY:publicKey,WEB_PUSH_VAPID_PRIVATE_KEY:privateKey,WEB_PUSH_SUBJECT:'mailto:test@example.test',WEB_PUSH_DISPATCH_SECRET:'synthetic-cron-secret-only-'.repeat(2),SUPABASE_ANON_KEY:'public-test-only',SUPABASE_SERVICE_ROLE_KEY:'server-test-only'};
Deno.test('Deno validates existing VAPID and subscription using WebCrypto, without key generation',async()=>{
 const config=await readConfig(key=>env[key]);assert(config);assert(config!.publicKey===publicKey);assert(await validSubscription({endpoint:'https://fcm.googleapis.com/fcm/send/synthetic',keys:{p256dh:publicKey,auth:base64url(new Uint8Array(16))}}));
 const reply=await subscriptionRequest(new Request(config!.origin,{method:'OPTIONS',headers:{origin:config!.origin}}),'subscribe',config);assert(reply.status===204);assert(reply.headers.get('access-control-allow-origin')===config!.origin);
});
Deno.test('Deno sends RFC8291 aes128gcm using fetch and a stable Topic, never Node HTTPS/crypto',async()=>{
 const config=await readConfig(key=>env[key]);assert(config);const previous=globalThis.fetch;let count=0;
 globalThis.fetch=async(_url,init)=>{const headers=new Headers(init?.headers);assert(headers.get('content-encoding')==='aes128gcm');assert(headers.get('authorization')?.startsWith('vapid '));assert(headers.get('topic')==='a'.repeat(32));assert(init?.body instanceof Uint8Array);assert((init?.body as Uint8Array).byteLength===4096);count++;return new Response(null,{status:201});};
 try{const send=sender(config!);for(let i=0;i<80;i++)await send({endpoint:'https://fcm.googleapis.com/fcm/send/synthetic',keys:{p256dh:publicKey,auth:base64url(new Uint8Array(16))}},{eventId:'a'.repeat(64),title:'Synthetic',body:'Public metadata',url:'/baca/book?episode=1',tag:'kk-'+ 'a'.repeat(64)});assert(count===80);}finally{globalThis.fetch=previous;}
});
