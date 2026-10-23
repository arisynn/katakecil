import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {randomBytes,createECDH} from 'node:crypto';
import {PGlite} from '@electric-sql/pglite';
import webPush from 'web-push';
import {authorized,dispatchRequest,hash,readConfig,repository,subscriptionRequest,validSubscription} from '../server/web-push/service.ts';

const vapid=webPush.generateVAPIDKeys(),ec=createECDH('prime256v1');ec.generateKeys();
const subscription={endpoint:'https://fcm.googleapis.com/fcm/send/synthetic',keys:{p256dh:ec.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};
const capability=randomBytes(32).toString('base64url');
const config={origin:'https://reader.example.test',publicKey:vapid.publicKey,privateKey:vapid.privateKey,subject:'mailto:owner@example.test',dispatchSecret:randomBytes(32).toString('hex'),url:'https://synthetic.supabase.co',adminKey:'server-test-only',anonKey:'sb_publishable_synthetic_public'};
const body=(value,origin=config.origin)=>new Request(config.origin+'/api/web-push',{method:'POST',headers:{origin,'content-type':'application/json'},body:JSON.stringify(value)});
assert(validSubscription(subscription));for(const endpoint of ['http://fcm.googleapis.com/fcm/send/test','https://localhost/push','https://127.0.0.1/push','https://fcm.googleapis.com.evil.test/push','https://fcm.googleapis.com:8443/push'])assert(!validSubscription({...subscription,endpoint}));
assert(!validSubscription({...subscription,keys:{auth:'bad',p256dh:'bad'}}));
const encrypted=webPush.generateRequestDetails(subscription,JSON.stringify({title:'Public chapter'}),{vapidDetails:{subject:config.subject,publicKey:config.publicKey,privateKey:config.privateKey}});
assert.equal(encrypted.headers['Content-Encoding'],'aes128gcm');assert(Buffer.isBuffer(encrypted.body));assert(!encrypted.body.includes(Buffer.from('Public chapter')));assert(encrypted.headers.Authorization.startsWith('vapid '));
assert.equal(readConfig({}),null);assert(authorized('Bearer '+config.dispatchSecret,config.dispatchSecret));assert(!authorized('Bearer bad',config.dispatchSecret));
const env={WEB_PUSH_ENABLED:'true',WEB_PUSH_SITE_ORIGIN:config.origin,WEB_PUSH_VAPID_PUBLIC_KEY:config.publicKey,WEB_PUSH_VAPID_PRIVATE_KEY:config.privateKey,WEB_PUSH_SUBJECT:config.subject,WEB_PUSH_DISPATCH_SECRET:config.dispatchSecret,SUPABASE_URL:config.url,SUPABASE_SERVICE_ROLE_KEY:config.adminKey,SUPABASE_PUBLIC_KEY:config.anonKey};assert(readConfig(env));assert.equal(readConfig({...env,WEB_PUSH_VAPID_PRIVATE_KEY:'bad'}),null);
assert.equal((await subscriptionRequest(body({}),null)).status,503);
const publicConfig=await (await subscriptionRequest(new Request(config.origin+'/api/web-push'),config)).json();assert.equal(publicConfig.publicKey,vapid.publicKey);assert(!JSON.stringify(publicConfig).includes(vapid.privateKey));
let registered,removed;
const fake={register:async(...args)=>registered=args,remove:async(...args)=>removed=args};
assert.equal((await subscriptionRequest(body({action:'subscribe',subscription,capability},'https://evil.test'),config,fake)).status,403);
assert.equal((await subscriptionRequest(body({action:'subscribe',subscription:{...subscription,endpoint:'https://localhost/private'},capability}),config,fake)).status,400);
assert.equal((await subscriptionRequest(body({action:'subscribe',subscription,capability}),config,fake)).status,200);assert.equal(registered[1],capability);assert.equal(registered[2].length,64);
assert.equal((await subscriptionRequest(body({action:'unsubscribe',subscription,capability}),config,fake)).status,200);assert.equal(removed[0],subscription.endpoint);
assert.equal((await subscriptionRequest(body({action:'subscribe',subscription,capability,oversize:'x'.repeat(9000)}),config,fake)).status,400);
assert.equal((await subscriptionRequest(body({action:'subscribe',subscription,capability}),config,{register:async()=>{throw {code:'P0001'};}})).status,429);

// Actual PostgreSQL privileges, ownership, quiet baseline, durable rate limit and leases.
const db=new PGlite();await db.exec('create role anon;create role authenticated;create role service_role bypassrls;');
await db.exec(readFileSync('supabase/migrations/20261023101426_web_push_opt_in.sql','utf8'));
for(const role of ['anon','authenticated']){
 await db.exec('set role '+role);await assert.rejects(db.query('select * from qr_web_push_subscriptions'),/permission denied/);
 await assert.rejects(db.query('select qr_web_push_claim(50)'),/permission denied/);await db.exec('reset role');
}
assert((await db.query("select relrowsecurity from pg_class where relname in ('qr_web_push_subscriptions','qr_web_push_limits')")).rows.every(row=>row.relrowsecurity));
assert((await db.query("select prosecdef from pg_proc where proname in ('qr_web_push_register','qr_web_push_claim')")).rows.every(row=>!row.prosecdef));
await db.exec('set role service_role');
const register=(endpoint,cap=capability,rate='b'.repeat(64))=>db.query('select qr_web_push_register($1,$2::jsonb,$3,$4) id',[hash(endpoint),JSON.stringify({...subscription,endpoint}),hash(cap),rate]);
const started=Date.now();const first=(await register(subscription.endpoint)).rows[0].id;
await register(subscription.endpoint);assert.equal((await db.query('select count(*)::int n from qr_web_push_subscriptions')).rows[0].n,1,'retry must not duplicate subscription');
await assert.rejects(register(subscription.endpoint,'wrong-owner'),/ownership/);
assert(Date.parse((await db.query('select cursor_at from qr_web_push_subscriptions')).rows[0].cursor_at)>=started-1000,'initial cursor must skip old chapters');
for(let n=0;n<30;n++)await register(subscription.endpoint,capability,'c'.repeat(64));await assert.rejects(register(subscription.endpoint,capability,'c'.repeat(64)),/Too many/);
const claim1=(await db.query('select * from qr_web_push_claim(50)')).rows;assert.equal(claim1.length,1);assert.equal(claim1[0].id,first);assert.equal((await db.query('select * from qr_web_push_claim(50)')).rows.length,0,'concurrent job must not claim leased row');
await db.exec("update qr_web_push_subscriptions set lease_until=clock_timestamp()-interval '1 minute'");assert.equal((await db.query('select * from qr_web_push_claim(50)')).rows.length,1);
await db.close();

// Verify SDK requests use public RLS for released metadata, server key only for private subscriptions.
const originalFetch=globalThis.fetch,requests=[];
globalThis.fetch=async(url,options)=>{requests.push({url:new URL(String(url)),options});return Response.json([]);};
try{
 const repo=repository(config),row={id:first,subscription,cursor_at:'2026-01-01T00:00:00Z',cursor_id:'00000000-0000-0000-0000-000000000000',lease_id:crypto.randomUUID()};
 await repo.episodes(row,'2026-02-01T00:00:00Z');await repo.remove(subscription.endpoint,capability);
 const request=requests[0];assert.equal(request.options.headers.get('apikey'),config.anonKey);assert.equal(request.url.searchParams.get('book.is_published'),'eq.true');assert.equal(request.url.searchParams.get('book.deleted_at'),'is.null');assert.equal(request.url.searchParams.get('is_enabled'),'eq.true');assert.equal(request.url.searchParams.get('release_at'),'lte.2026-02-01T00:00:00Z');assert(!request.url.searchParams.get('select').includes('content_md'));
 assert.equal(requests[1].options.headers.get('apikey'),config.adminKey);assert.equal(requests[1].url.searchParams.get('capability_hash'),'eq.'+hash(capability));
}finally{globalThis.fetch=originalFetch;}

// Dispatch coalesces public episodes per book, preserves retry cursors, removes dead endpoints.
const rows=['ok','gone','retry'].map((id,i)=>({id,subscription:{...subscription,endpoint:subscription.endpoint+id},cursor_at:'2026-01-01T00:00:00Z',cursor_id:'00000000-0000-0000-0000-000000000000',lease_id:String(i)}));
const book={id:'book',slug:'book',title:'Public book',is_published:true,deleted_at:null},sent=[],finished=[];
const ep=(n,other=book)=>({id:'ep-'+n,episode_number:n,title:'Public episode '+n,release_at:'2026-02-01T00:00:00Z',book:other});
const repo={claim:async()=>rows,episodes:async()=>[ep(1),ep(2),ep(3,{...book,id:'private',title:'PRIVATE',is_published:false}),{...ep(4),release_at:'2099-01-01T00:00:00Z'}],finish:async(...args)=>finished.push(args),clean:async()=>{}};
const send=async(s,payload)=>{if(s.endpoint.endsWith('gone'))throw {statusCode:410};if(s.endpoint.endsWith('retry'))throw {statusCode:503};sent.push(JSON.parse(payload));};
assert.equal((await dispatchRequest(new Request(config.origin,{method:'POST'}),config,repo,send)).status,401);
const result=await dispatchRequest(new Request(config.origin,{method:'POST',headers:{authorization:'Bearer '+config.dispatchSecret}}),config,repo,send);assert.equal(result.status,200);assert.deepEqual(await result.json(),{ok:true,delivered:1,failed:1,expired:1});assert.equal(sent[0].body,'Public episode 2');assert.equal(sent[0].url,'/baca/book?episode=2');assert(!JSON.stringify(sent).includes('PRIVATE'));
assert(finished.find(([r,c])=>r.id==='ok'&&c));assert(finished.find(([r,c,deleted])=>r.id==='gone'&&deleted));assert(finished.find(([r,c])=>r.id==='retry'&&!c));
console.log('PASS web push: real local SQL/RLS/service-only grants, registration ownership/retry/rate limit, quiet baseline and leases; origin/body/provider validation; public-only metadata queries; authenticated dispatch, public payloads, stale endpoint cleanup and failed-send retry. No live subscriptions or production writes.');
