import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
// Execute the real Cron wrapper against explicit local extension contracts.
// PGlite cannot load pg_cron/pg_net: no claim of testing the hosted scheduler.
const db=new PGlite();
await db.exec(`create role anon;create role authenticated;create role service_role;create schema vault;create schema net;create schema cron;
create table vault.secrets(name text primary key,decrypted_secret text);
create view vault.decrypted_secrets as select * from vault.secrets;
create table net.requests(id bigserial primary key,url text,headers jsonb,body jsonb,timeout_milliseconds int);
create function net.http_post(url text,headers jsonb,body jsonb,timeout_milliseconds int) returns bigint language sql as $$insert into net.requests(url,headers,body,timeout_milliseconds) values($1,$2,$3,$4) returning id$$;
create table cron.job(jobid bigserial primary key,jobname text unique,schedule text,command text,active boolean default true);
create function cron.schedule(text,text,text) returns bigint language sql as $$insert into cron.job(jobname,schedule,command) values($1,$2,$3) on conflict(jobname) do update set schedule=$2,command=$3 returning jobid$$;
create function cron.alter_job(job_id bigint,active boolean) returns void language sql as $$update cron.job set active=$2 where jobid=$1$$;`);
const setup=readFileSync('supabase/cron/setup-web-push.sql','utf8').replace(/^create extension.*;$/gm,'');
await db.exec(setup);await db.exec(setup);
let job=(await db.query('select * from cron.job')).rows;assert.equal(job.length,1);assert.equal(job[0].schedule,'*/15 * * * *');assert.equal(job[0].active,false);
await assert.rejects(db.query('select kk_private.qr_web_push_tick()'),/Configure/);
for(const role of ['anon','authenticated','service_role']){await db.exec('set role '+role);await assert.rejects(db.query('select kk_private.qr_web_push_tick()'),/permission denied/);await db.exec('reset role');}
await db.query('insert into vault.secrets values($1,$2),($3,$4)',['katakecil_web_push_project_url','https://synthetic.supabase.co','katakecil_web_push_dispatch_secret','synthetic-dispatch-only-'.repeat(2)]);
await db.exec(readFileSync('supabase/cron/enable-web-push.sql','utf8'));assert.equal((await db.query('select active from cron.job')).rows[0].active,true);
await db.query('select kk_private.qr_web_push_tick()');const queued=(await db.query('select * from net.requests')).rows[0];assert.equal(queued.url,'https://synthetic.supabase.co/functions/v1/web-push-dispatch');assert.equal(queued.headers.Authorization,'Bearer '+'synthetic-dispatch-only-'.repeat(2));assert.deepEqual(queued.body,{});assert.equal(queued.timeout_milliseconds,100000);
assert(!job[0].command.includes('Bearer'));await db.exec(readFileSync('supabase/cron/disable-web-push.sql','utf8'));assert.equal((await db.query('select active from cron.job')).rows[0].active,false);await db.close();
console.log('PASS Cron SQL contract: idempotent disabled 15-minute job, Vault lookup, restricted execution, authenticated async HTTP, enable/disable. pg_cron/pg_net hosted runtime requires staging smoke test.');
