import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handle,ALLOWED} from '../supabase/functions/lumina-library/index.ts';
test('public library publishes only the three approved objects and rejects arbitrary paths',async()=>{
 let calls=0;
 const fetcher=async(url,options)=>{calls++;assert.equal(options.headers.apikey,'server-only-test');return Response.json([{id:ALLOWED[0].id,title:'Masa Panen',cover_url:null}]);};
 const response=await handle(new Request('https://project.supabase.co/functions/v1/lumina-library'),{url:'https://project.supabase.co',key:'server-only-test'},fetcher);
 const data=await response.json();assert.equal(data.books.length,3);assert.ok(!JSON.stringify(data).includes('server-only-test'));assert.ok(data.books.every(b=>b.url.startsWith('https://project.supabase.co/functions/v1/lumina-library?')&&b.url.includes('action=epub')));
 const unknown=await handle(new Request('https://project.supabase.co/functions/v1/lumina-library?action=epub&book=../private'),{url:'https://project.supabase.co',key:'server-only-test'},fetcher);assert.equal(unknown.status,404);assert.equal(calls,1);
 const method=await handle(new Request('https://project.supabase.co/functions/v1/lumina-library',{method:'POST'}),{url:'',key:''},fetcher);assert.equal(method.status,405);
});
test('EPUB signing uses an exact allowlisted path and short expiration',async()=>{
 const response=await handle(new Request('https://project.supabase.co/functions/v1/lumina-library?action=epub&book='+ALLOWED[0].id),{url:'https://project.supabase.co',key:'sb_secret_test'},async(url,options)=>{assert.ok(url.endsWith(ALLOWED[0].path));assert.equal(JSON.parse(options.body).expiresIn,600);assert.equal(options.headers.Authorization,undefined);return Response.json({signedURL:'/object/sign/kk-sources/book.epub?token=test'});});
 assert.equal((await response.json()).url,'https://project.supabase.co/storage/v1/object/sign/kk-sources/book.epub?token=test');
});
