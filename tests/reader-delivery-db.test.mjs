import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
const migration=await readFile(new URL('../supabase/migrations/20261105110838_reader_episode_delivery.sql',import.meta.url),'utf8');
test('actual PostgreSQL migration closes raw manuscript reads and enforces shared quotas',async()=>{
 const db=new PGlite();try{
 await db.exec(`create role anon; create role authenticated; create role service_role bypassrls; grant usage on schema public to anon,authenticated,service_role;
 create table kk_books(id text primary key,is_published boolean);insert into kk_books values('one',true),('draft',false);
 create table kk_sections(id uuid,book_id text,title text,position integer,release_at timestamptz,is_enabled boolean,updated_at timestamptz,content_html text);
 insert into kk_sections values('00000000-0000-4000-8000-000000000001','one','First',1,now(),true,now(),'<p>Private manuscript</p>');
 insert into kk_sections values('00000000-0000-4000-8000-000000000002','one','Future',2,now()+interval '1 day',true,now(),'<p>Future</p>'),('00000000-0000-4000-8000-000000000003','draft','Draft',3,now()-interval '1 day',true,now(),'<p>Draft</p>');
 alter table kk_books enable row level security;alter table kk_sections enable row level security;
 create policy books_public on kk_books for select to anon,authenticated using(is_published);
 create policy sections_public on kk_sections for select to anon,authenticated using(is_enabled and release_at<=now() and exists(select 1 from kk_books where id=kk_sections.book_id and is_published));
 grant all on kk_books,kk_sections to anon,authenticated,service_role;`);
 await db.exec(migration);
 await db.exec(await readFile(new URL('../supabase/migrations/20261105111409_tolerate_reader_network_changes.sql',import.meta.url),'utf8'));
 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);
  assert.deepEqual((await db.query('select title from kk_sections')).rows,[{title:'First'}]);
  await assert.rejects(db.query('select content_html from kk_sections'),/permission denied/);
  await assert.rejects(db.query('select * from kk_reader_private.sessions'),/permission denied/);
  await assert.rejects(db.query(`select public.kk_reader_gate('catalog',$1,'','','',0)`,['a'.repeat(64)]),/permission denied/);
  await db.exec('reset role');
 }
 await db.exec('set role service_role');
 const visitor='a'.repeat(64),session='b'.repeat(64),rev='c'.repeat(64);
 const gate=async(kind,visitorId=visitor,token=session,book='one',cost=0,episode='f'.repeat(64),lease=crypto.randomUUID())=> (await db.query('select public.kk_reader_gate($1,$2,$3,$4,$5,$6,$7,$8) as result',[kind,visitorId,token,book,rev,cost,episode,lease])).rows[0].result;
 assert.equal((await gate('open')).allowed,true);
 assert.equal((await gate('request')).allowed,true);
 assert.equal((await gate('request',visitor,session,'another-book')).reason,'session');
 assert.equal((await gate('request','d'.repeat(64))).allowed,true,'network changes retain the original session/network quota');
 assert.equal((await gate('request',visitor,'e'.repeat(64))).reason,'session');
 assert.equal((await gate('open',visitor,'f'.repeat(64),'draft')).allowed,false);
 for(let i=0;i<4;i++)assert.equal((await gate('deliver',visitor,session,'one',15000)).allowed,true);
 const blocked=await gate('deliver',visitor,session,'one',15000);assert.equal(blocked.allowed,false);assert.ok(blocked.retry_after>=160);
 // New sessions cannot reset the network-volume budget.
 for(let i=1;i<=5;i++){const token=i.toString(16).padStart(64,'0');assert.equal((await gate('open',visitor,token)).allowed,true);for(let j=0;j<4;j++)await gate('deliver',visitor,token,'one',15000);}
 assert.equal((await gate('deliver',visitor,'1'.padStart(64,'0'),'one',15000)).allowed,false);
 const net='9'.repeat(64),concurrent='8'.repeat(64);await gate('open',net,concurrent);
 const leases=Array.from({length:3},()=>crypto.randomUUID());for(const lease of leases)assert.equal((await gate('request',net,concurrent,'one',0,'',lease)).allowed,true);
 assert.equal((await gate('request',net,concurrent)).allowed,false);await gate('release',net,concurrent,'one',0,'',leases[0]);assert.equal((await gate('request',net,concurrent)).allowed,true);
 // Tiny episodes still consume the distinct-episode budget; byte limits alone are insufficient.
 const rapid='7'.repeat(64),rapidNet='6'.repeat(64);await gate('open',rapidNet,rapid);
 for(let i=0;i<12;i++)assert.equal((await gate('deliver',rapidNet,rapid,'one',1,i.toString(16).padStart(64,'0'))).allowed,true);
 assert.equal((await gate('deliver',rapidNet,rapid,'one',1,'e'.repeat(64))).allowed,false);
 await db.exec(`update kk_reader_private.sessions set expires_at=now()-interval '1 second' where token_hash='${session}'`);
 assert.equal((await gate('request')).reason,'session');
 await db.exec('reset role');
 assert.equal((await db.query('select content_html from kk_sections')).rows[0].content_html,'<p>Private manuscript</p>');
 }finally{await db.close();}
});
