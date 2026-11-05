import {publisherAccess,digest,ALLOWED_ORIGINS} from '../supabase/functions/katakecil-publisher/access.ts';
const userId='00000000-0000-4000-8000-000000000001',jwt='aaaa.bbbb.cccc';
function assert(value:unknown,message:string){if(!value)throw Error(message);}
function client(user:unknown,member=false){const writes:unknown[]=[];return{writes,api:{auth:{getUser:async()=>({data:{user},error:null})},from:()=>({select:()=>({eq:()=>({maybeSingle:async()=>({data:member?{user_id:userId}:null,error:null})})}),upsert:async(value:unknown)=>{writes.push(value);return {error:null};}})}};}
Deno.test('publisher enrollment requires the approved owner, a confirmed mailbox and confirmation-enabled Auth',async()=>{
 const options={projectUrl:'https://project.test',publicKey:'public',ownerHash:await digest('owner@example.test')},user={id:userId,email:'owner@example.test',email_confirmed_at:'2026-01-01'};
 const confirmed=client(user);assert(await publisherAccess(jwt,confirmed.api as never,options,async()=>Response.json({mailer_autoconfirm:false}))===200,'verified owner refused');assert(confirmed.writes.length===1,'owner not enrolled');
 for(const badUser of [{...user,email:'stranger@example.test'},{...user,email_confirmed_at:null},null]){const s=client(badUser);assert(await publisherAccess(jwt,s.api as never,options,async()=>{throw Error('must not fetch');})!==200,'unauthorized account accepted');assert(!s.writes.length,'unauthorized membership write');}
 const auto=client(user);assert(await publisherAccess(jwt,auto.api as never,options,async()=>Response.json({mailer_autoconfirm:true}))===403,'autoconfirm permits email spoofing');assert(!auto.writes.length,'unverified email enrolled');
});
Deno.test('publisher CORS excludes arbitrary sites and existing approved members remain authorized',async()=>{
 assert(ALLOWED_ORIGINS.has('https://katakecil.vercel.app'),'app blocked');assert(ALLOWED_ORIGINS.has('https://localhost'),'Android blocked');assert(!ALLOWED_ORIGINS.has('https://evil.example'),'foreign origin accepted');
 const s=client({id:userId,email:'existing@example.test'},true);assert(await publisherAccess(jwt,s.api as never,{projectUrl:'https://project.test',publicKey:'public',ownerHash:'owner'},async()=>{throw Error('must not fetch');})===200,'existing member blocked');
});
