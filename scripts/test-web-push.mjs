import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createECDH,randomBytes,hkdfSync,createDecipheriv} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import {subscriptionRequest,dispatchRequest,readConfig,validSubscription,eventId,releaseOrder} from '../supabase/functions/_shared/web-push/core.ts';
import {hash} from '../supabase/functions/_shared/web-push/crypto.ts';
import {repository} from '../supabase/functions/_shared/web-push/repository.ts';
import {sender} from '../supabase/functions/_shared/web-push/transport.ts';
import {vapid} from './test-utils/web-push-fixture.mjs';
assert(releaseOrder('2026-01-01T00:00:00.000001+00:00')<releaseOrder('2026-01-01T00:00:00.000002Z'));assert.equal(releaseOrder('2026-01-01T00:00:00.001Z'),releaseOrder('2026-01-01T07:00:00.001000+07:00'));
const ec=createECDH('prime256v1');ec.generateKeys();
const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic',keys:{p256dh:ec.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}},capability=randomBytes(32).toString('base64url');
const config={origin:'https://reader.example.test',url:'https://synthetic.supabase.co',publicKey:vapid.publicKey,privateKey:vapid.privateKey,subject:'mailto:owner@example.test',dispatchSecret:'synthetic-dispatch-test-only-'.repeat(2),adminKey:'server-test-only',anonKey:'sb_publishable_synthetic'};
const env={WEB_PUSH_ENABLED:'true',WEB_PUSH_SITE_ORIGIN:config.origin,WEB_PUSH_VAPID_PUBLIC_KEY:vapid.publicKey,WEB_PUSH_VAPID_PRIVATE_KEY:vapid.privateKey,WEB_PUSH_SUBJECT:config.subject,WEB_PUSH_DISPATCH_SECRET:config.dispatchSecret,SUPABASE_URL:config.url,SUPABASE_SERVICE_ROLE_KEY:config.adminKey,SUPABASE_ANON_KEY:config.anonKey};
assert(await readConfig(key=>env[key]));assert.equal(await readConfig(()=>undefined),null);assert.equal(await readConfig(key=>key==='WEB_PUSH_VAPID_PRIVATE_KEY'?'bad':env[key]),null);
assert(await validSubscription(subscription));for(const endpoint of ['http://fcm.googleapis.com/send/x','https://localhost/push','https://127.0.0.1/push','https://fcm.googleapis.com.evil.test/send/x','https://fcm.googleapis.com:8443/send/x'])assert(!await validSubscription({...subscription,endpoint}));
assert(!await validSubscription({...subscription,keys:{auth:'bad',p256dh:'bad'}}));assert(!await validSubscription({...subscription,keys:{...subscription.keys,p256dh:Buffer.alloc(65,4).toString('base64url')}}));
const request=(action='subscribe',value={subscription,capability},origin=config.origin,method='POST')=>new Request(config.origin+'/'+action,{method,headers:{origin,'content-type':'application/json'},...(method==='POST'?{body:JSON.stringify(value)}:{})});
let registered,removed;const fake={healthy:async()=>true,register:async(...args)=>registered=args,remove:async(...args)=>removed=args};
assert.equal((await subscriptionRequest(request('subscribe',undefined,'https://katakecil.vercel.app'),'subscribe',null,fake)).status,503);
let response=await subscriptionRequest(request('subscribe',undefined,config.origin,'GET'),'subscribe',config,fake);assert.equal(response.headers.get('access-control-allow-origin'),config.origin);const publicConfig=await response.json();assert.equal(publicConfig.publicKey,vapid.publicKey);assert(!JSON.stringify(publicConfig).includes(vapid.privateKey));
assert.equal((await subscriptionRequest(request('subscribe',undefined,'https://evil.test'),'subscribe',config,fake)).status,403);
assert.equal((await subscriptionRequest(request('subscribe',undefined,config.origin,'OPTIONS'),'subscribe',config,fake)).status,204);
assert.equal((await subscriptionRequest(request(),'subscribe',config,fake)).status,200);assert.equal(registered[1],await hash(capability));assert.equal(registered[2].length,64);
assert.equal((await subscriptionRequest(request('unsubscribe'),'unsubscribe',config,fake)).status,200);assert.equal(removed[0],await hash(subscription.endpoint));assert.equal(removed[1],await hash(capability));
assert.equal((await subscriptionRequest(request('subscribe',{subscription,capability,large:'x'.repeat(9000)}),'subscribe',config,fake)).status,400);
assert.equal((await subscriptionRequest(request(),'subscribe',config,{...fake,register:async()=>{throw {code:'P0001'};}})).status,429);
assert.equal((await subscriptionRequest(request(),'subscribe',config,{...fake,register:async()=>{throw {code:'42501'};}})).status,409);
assert.equal((await subscriptionRequest(request('subscribe',undefined,config.origin,'GET'),'subscribe',config,{...fake,healthy:async()=>false})).status,200);

// Execute the actual old schema plus additive migration, preserving an existing subscription.
const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');await db.exec(readFileSync('supabase/migrations/20261023101426_web_push_opt_in.sql','utf8'));await db.exec('set role service_role');
const register=(endpoint=subscription.endpoint,cap=capability,rate='b'.repeat(64))=>db.query('select qr_web_push_register($1,$2::jsonb,$3,$4) id',[awaitableHash(endpoint),JSON.stringify({...subscription,endpoint}),awaitableHash(cap),rate]);
function awaitableHash(value){return value===subscription.endpoint?endpointHash:value===capability?capabilityHash:knownHashes.get(value);}
const endpointHash=await hash(subscription.endpoint),capabilityHash=await hash(capability),knownHashes=new Map([['wrong-owner',await hash('wrong-owner')]]);
const id=(await register()).rows[0].id,baseline=(await db.query('select cursor_at,cursor_id,capability_hash from qr_web_push_subscriptions')).rows[0];await db.exec('reset role');await db.exec(readFileSync('supabase/migrations/20261023121650_edge_web_push_delivery.sql','utf8'));assert.deepEqual((await db.query('select cursor_at,cursor_id,capability_hash from qr_web_push_subscriptions')).rows[0],baseline);
for(const role of ['anon','authenticated']){await db.exec('set role '+role);await assert.rejects(db.query('select * from qr_web_push_subscriptions'),/permission denied/);await assert.rejects(db.query('select qr_web_push_claim_edge(50)'),/permission denied/);await assert.rejects(db.query('select qr_web_push_mark_sent($1,$2,$3)',[id,crypto.randomUUID(),'c'.repeat(64)]),/permission denied/);await db.exec('reset role');}
assert((await db.query("select relrowsecurity from pg_class where relname in ('qr_web_push_subscriptions','qr_web_push_limits')")).rows.every(row=>row.relrowsecurity));assert((await db.query("select prosecdef from pg_proc where proname like 'qr_web_push_%'")).rows.every(row=>!row.prosecdef));
await db.exec('set role service_role');await register();assert.equal((await db.query('select * from qr_web_push_subscriptions')).rows.length,1);await assert.rejects(register(subscription.endpoint,'wrong-owner'),/ownership/);
for(let i=0;i<30;i++)await register(subscription.endpoint,capability,'c'.repeat(64));await assert.rejects(register(subscription.endpoint,capability,'c'.repeat(64)),/Too many/);
const claim=async()=>(await db.query('select qr_web_push_claim_edge(50) batch')).rows[0].batch;
let batch=await claim(),row=batch.rows[0];assert(row.lease_id);assert.equal((await claim()).rows.length,0,'Overlapping jobs cannot claim an active lease');
const event='a'.repeat(64);assert.equal((await db.query('select qr_web_push_mark_sent($1,$2,$3) ok',[id,row.lease_id,event])).rows[0].ok,true);
await db.query('select qr_web_push_finish_edge($1,$2)',[id,row.lease_id]);batch=await claim();const resumed=batch.rows[0];assert.equal(resumed.delivered_keys[event],true,'Partial-success receipts survive cursor-preserving retry');
assert.equal((await db.query('select qr_web_push_mark_sent($1,$2,$3) ok',[id,row.lease_id,'e'.repeat(64)])).rows[0].ok,false,'Stale lease cannot change delivery state');
assert.equal((await db.query('select qr_web_push_finish_edge($1,$2,null,null,true) ok',[id,row.lease_id])).rows[0].ok,false,'Stale lease cannot delete a renewed subscription');
await db.query('select qr_web_push_finish_edge($1,$2,$3,$4)',[id,resumed.lease_id,batch.cutoff,'ffffffff-ffff-ffff-ffff-ffffffffffff']);assert.deepEqual((await db.query('select delivered_keys from qr_web_push_subscriptions')).rows[0].delivered_keys,{});
row=(await claim()).rows[0];await db.exec("update qr_web_push_subscriptions set lease_until=clock_timestamp()-interval '1 minute'");assert.equal((await db.query('select qr_web_push_mark_sent($1,$2,$3) ok',[id,row.lease_id,event])).rows[0].ok,false);assert.equal((await claim()).rows.length,1);
await db.close();

// A partial failure sends successful book A once, then only retries book B.
const date='2026-01-01T00:00:00Z',book={id:'book-a',slug:'book-a',title:'Public A',is_published:true,deleted_at:null};
const ep=(n,b=book,source='episode')=>({id:`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`,source,episode_number:n,title:'Public episode '+n,release_at:date,book:b});
const candidate={id,subscription,cursor_at:'2025-01-01T00:00:00Z',cursor_id:'00000000-0000-0000-0000-000000000000',lease_id:crypto.randomUUID(),delivered_keys:{}},sent=[],finished=[];let retryB=true;
const repo={claim:async()=>({cutoff:'2026-02-01T00:00:00Z',rows:[candidate]}),episodes:async()=>[ep(1),ep(2,{...book,id:'book-b',slug:'book-b'},'epub')],visible:async()=>true,ownsLease:async()=>true,markSent:async(row,key)=>row.delivered_keys[key]=true,finish:async(...args)=>finished.push(args),clean:async()=>{}};
const send=async(sub,payload)=>{if(payload.body==='Public episode 2'&&retryB)throw {statusCode:503};sent.push(payload);};const dispatch=()=>new Request(config.origin,{method:'POST',headers:{authorization:'Bearer '+config.dispatchSecret}});
assert.equal((await dispatchRequest(new Request(config.origin,{method:'POST'}),config,repo,send)).status,401);response=await dispatchRequest(dispatch(),config,repo,send);assert.equal((await response.json()).failed,1);assert.equal(sent.length,1);assert(!finished[0][1]);retryB=false;await dispatchRequest(dispatch(),config,repo,send);assert.equal(sent.length,2);assert.equal(sent[0].body,'Public episode 1');assert.equal(sent[1].body,'Public episode 2');assert.equal(sent[0].eventId,await eventId(ep(1)));assert(finished.at(-1)[1]);
let removedExpired=false;await dispatchRequest(dispatch(),config,{...repo,claim:async()=>({cutoff:'2026-02-01T00:00:00Z',rows:[{...candidate,delivered_keys:{}}]}),finish:async(row,cursor,expired)=>removedExpired=expired},async()=>{throw {statusCode:410};});assert(removedExpired);
let forbiddenSends=0;await dispatchRequest(dispatch(),config,{...repo,claim:async()=>({cutoff:'2026-02-01T00:00:00Z',rows:[{...candidate,delivered_keys:{}}]}),visible:async()=>false},async()=>forbiddenSends++);assert.equal(forbiddenSends,0);

// Actual SDK query headers separate public RLS reads from service-only subscription state.
const originalFetch=globalThis.fetch,requests=[];globalThis.fetch=async(url,options)=>{requests.push({url:new URL(String(url)),options});return Response.json([]);};
try{const store=repository(config);await store.episodes(candidate,'2026-02-01T00:00:00Z');await store.remove(endpointHash,capabilityHash);assert.equal(requests[0].options.headers.get('apikey'),config.anonKey);assert.equal(requests[0].url.searchParams.get('book.is_published'),'eq.true');assert.equal(requests[1].options.headers.get('apikey'),config.anonKey);assert(requests[1].url.pathname.endsWith('/qr_epub_releases'));assert.equal(requests[2].options.headers.get('apikey'),config.adminKey);assert(!requests[0].url.searchParams.get('select').includes('content_md'));}finally{globalThis.fetch=originalFetch;}

// Real RFC8291 ciphertext, decryptable with the subscription's private ECDH key.
let captured;globalThis.fetch=async(url,options)=>{captured={url,options};return new Response(null,{status:201});};
try{await sender(config)(subscription,sent[0]);const data=Buffer.from(captured.options.body),salt=data.subarray(0,16),server=data.subarray(21,86),client=ec.getPublicKey(),shared=ec.computeSecret(server),auth=Buffer.from(subscription.keys.auth,'base64url');
 const ikm=Buffer.from(hkdfSync('sha256',shared,auth,Buffer.concat([Buffer.from('WebPush: info\0'),client,server]),32)),cek=hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: aes128gcm\0'),16),nonce=hkdfSync('sha256',ikm,salt,Buffer.from('Content-Encoding: nonce\0'),12);
 const encrypted=data.subarray(86),decipher=createDecipheriv('aes-128-gcm',cek,nonce);decipher.setAuthTag(encrypted.subarray(-16));const padded=Buffer.concat([decipher.update(encrypted.subarray(0,-16)),decipher.final()]);let end=padded.length-1;while(padded[end]===0)end--;assert.equal(padded[end],2);assert.deepEqual(JSON.parse(padded.subarray(0,end)),sent[0]);
 assert.equal(captured.options.headers.get('content-encoding'),'aes128gcm');assert.equal(captured.options.headers.get('topic'),sent[0].eventId.slice(0,32));assert.equal(captured.options.redirect,'error');assert(captured.options.headers.get('authorization').startsWith('vapid '));assert(!data.includes(Buffer.from('Public episode')));
 globalThis.fetch=async()=>new Response(null,{status:503});await assert.rejects(sender(config)(subscription,sent[0]),error=>error.statusCode===503);
}finally{globalThis.fetch=originalFetch;}
console.log('PASS Edge Web Push: unchanged VAPID fixture, WebCrypto encryption/decryption, endpoint validation, CORS/preflight, ownership and rate limits; existing SQL rows preserved, service-only RLS/RPCs, concurrent/stale lease guards, persistent partial-success receipts; episode + EPUB public reads, rechecks, expiry cleanup, authenticated dispatch and retry without resending completed books. No production writes or live sends.');
