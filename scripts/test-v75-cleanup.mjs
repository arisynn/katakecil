import assert from 'node:assert/strict';
import {cleanupDeletedCovers} from './deleted-cover-cleanup.mjs';
let removals=[],ack=[],fail=false,live=false;
const files=Array.from({length:205},(_,i)=>({id:`file-${i}`,name:`cover-${String(i).padStart(3,'0')}.webp`}));
const client={
 async rpc(_name,args){if(args?.p_done){ack.push(args.p_done);return {data:[]};}return {data:[{book_id:'deleted-qa'}]};},
 from(){return {select(){return this;},eq(){return this;},async limit(){return {data:live?[{id:'deleted-qa'}]:[]};}};},
 storage:{from(bucket){return {
  async list(prefix,{limit,offset}){if(bucket!=='story-covers-v73')return {data:[]};if(prefix==='deleted-qa')return {data:[{name:'request-folder',id:null}]};return {data:files.slice(offset,offset+limit)};},
  async remove(paths){if(fail)throw Error('Synthetic storage outage');assert(paths.every(p=>p.startsWith('deleted-qa/request-folder/')));removals.push(...paths);return {data:paths};},
 };}},
};
await cleanupDeletedCovers(client,{report:()=>{}});assert.equal(removals.length,0);assert.equal(ack.length,0);
fail=true;await assert.rejects(cleanupDeletedCovers(client,{apply:true,report:()=>{}}),/outage/);assert.equal(ack.length,0,'failed cleanup must stay queued');
fail=false;await cleanupDeletedCovers(client,{apply:true,report:()=>{}});assert.equal(removals.length,205);assert.deepEqual(ack,['deleted-qa']);
live=true;await assert.rejects(cleanupDeletedCovers(client,{apply:true,report:()=>{}}),/Novel masih ada/);
console.log('V7.5 cleanup: dry-run, paginated exact-prefix traversal, failure keeps queue, batched removal, acknowledgement only after success and live-book guard passed.');
