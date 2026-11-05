import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handle} from '../supabase/functions/lumina-library/index.ts';
test('every legacy gateway action is retired without downstream requests',async()=>{
 for(const query of ['', '?action=catalog','?action=epub&book=masa-panen-google-play-ready-1','?action=epub&book=../private']){
  const response=await handle(new Request('https://example.test/'+query));assert.equal(response.status,410);const data=await response.json();assert.equal(data.code,'reader_upgrade_required');assert.equal(data.url,undefined);
 }
 assert.equal((await handle(new Request('https://example.test',{method:'OPTIONS'}))).status,204);
});
