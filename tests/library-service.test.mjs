import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handle,ALLOWED} from '../supabase/functions/lumina-library/index.ts';
const book={id:ALLOWED[0].id,title:'Published title',revision:'a'.repeat(64),section_ids:['00000000-0000-4000-8000-000000000001']};
const env={url:'https://project.supabase.co'};
const request=query=>new Request(env.url+'/functions/v1/lumina-library'+query);
test('legacy gateway lists only allowlisted nonempty publications without server credentials',async()=>{
 let calls=0;const fetcher=async(url,options)=>{calls++;assert.ok(url.endsWith('katakecil-reader?action=catalog'));assert.equal(options.headers,undefined);assert.equal(options.credentials,'omit');return Response.json({books:[book,{...book,id:ALLOWED[1].id,section_ids:[]},{...book,id:'unapproved'}]});};
 const response=await handle(request(''),env,fetcher),data=await response.json();assert.equal(response.status,200);assert.equal(data.books.length,1);assert.ok(!JSON.stringify(data).includes('/storage/'));assert.ok(data.books[0].url.includes('revision='+book.revision));
 assert.equal((await handle(request('?action=epub&book=../private'),env,fetcher)).status,404);assert.equal(calls,1);
 assert.equal((await handle(new Request(env.url,{method:'POST'}),env,fetcher)).status,405);
 assert.equal((await handle(request('?action=unknown'),env,fetcher)).status,400);
});
test('legacy EPUB links go through published authorization with an exact revision and fail closed',async()=>{
 const fetcher=async()=>Response.json({books:[book]});
 const response=await handle(request('?action=epub&book='+book.id),env,fetcher),data=await response.json();assert.ok(data.url.startsWith(env.url+'/functions/v1/katakecil-reader?'));assert.equal(new URL(data.url).searchParams.get('revision'),book.revision);
 assert.equal((await handle(request('?action=epub&book='+book.id+'&revision='+('b'.repeat(64))),env,fetcher)).status,409);
 assert.equal((await handle(request('?action=epub&book='+ALLOWED[1].id),env,fetcher)).status,404);
 assert.equal((await handle(request(''),env,async()=>{throw Error('offline');})).status,503);
 assert.equal((await handle(request(''),env,async()=>new Response('',{status:429}))).status,429);
});
