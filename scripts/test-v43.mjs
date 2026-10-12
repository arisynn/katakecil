import assert from 'node:assert/strict';
import {readFileSync, readdirSync, statSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {webcrypto} from 'node:crypto';

function compiled(files, extra='') {
 const all=files.map(p=>readFileSync(p,'utf8').replace(/^import(?: type)? .*?;\s*$/gm,'').replace(/\bexport\s+(?=(?:type|const|function|class)\b)/g,'')).join('\n');
 return ts.transpileModule(all,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText+extra;
}
// Pure parser tests: names, frontmatter, explicit Episode 0, validation and auto numbering.
const importer=vm.createContext({console,Date,Set,Error,Map,Intl});
vm.runInContext(compiled(['src/utils/importMarkdown.ts','src/utils/importManuscript.ts'],
 '\nthis.check={parsePlainManuscript,titleInfo,validateImport,assignEpisodeNumbers,classifyEpubSection};'),importer);
const i=importer.check;
assert.equal(i.titleInfo('Episode 0 — Prolog').number,0);
assert.equal(i.titleInfo('Bab 0').number,0);
assert.equal(i.titleInfo('Chapter 00: Asal').number,0);
assert.equal(i.titleInfo('Prolog').number,null);
assert.equal(i.classifyEpubSection('Daftar Isi'),'frontmatter');
assert.equal(i.classifyEpubSection('Tentang Penulis'),'frontmatter');
assert.equal(i.classifyEpubSection('Catatan Penerbit'),'frontmatter');
assert.equal(i.classifyEpubSection('Episode 0 — Awal'),'episode');
assert.equal(i.classifyEpubSection('Prolog'),'episode');
assert.equal(i.classifyEpubSection('Jendela Pagi'),'episode');
assert.equal(i.classifyEpubSection('Lampiran','OPS/Text/copyright.xhtml'),'frontmatter');
const parsed=i.parsePlainManuscript('# Episode 0 — Asal\n\nIsi episode nol.\n\n# Episode 1 — Mulai\n\nIsi episode satu.','novel.md');
assert.equal(parsed.chapters.length,2);
assert.equal(parsed.chapters[0].episode_number,0);
const chapter0=parsed.chapters.map((p,n)=>({...p,include:true,key:String(n)}));
assert.equal(i.validateImport(chapter0,[]).length,0);
assert.equal(i.validateImport(chapter0,[{episode_number:0,content_md:'Beda'}]).length,1);
assert.equal(i.assignEpisodeNumbers([...chapter0,{...chapter0[0],key:'unassigned',episode_number:null,content_md:'Beda isi'}],[])[2].episode_number,2);

// Single-episode parser MUST NOT drop narrative paragraphs after headings.
const reader=vm.createContext({console,plainMarkdown:(x)=>x.replace(/\*\*([^*]+)\*\*/g,'$1')});
vm.runInContext(compiled(['src/utils/episodeChapter.ts'],
 '\nthis.fromEpisode=chapterFromEpisode;'),reader);
const ep=reader.fromEpisode(0,'Episode 0','Prolog','Paragraf pertama.\n\n### Bagian II\n\n**Paragraf terakhir**.');
assert.equal(ep.paragraphs.length,3);
assert.ok(ep.plainText.includes('Paragraf terakhir'));
assert.equal(ep.id,'secure-episode-0-part-0');

// The public API returns only one released episode, including Episode 0.
let handler;let mode='ok';const body='Paragraph one.\n\n'+('Long narrative line. '.repeat(500));
const db={rpc:async()=>({data:mode!=='limited',error:null}),from:(table)=>({
 select(){return this;},eq(){return this;},lte(){return this;},
 async maybeSingle(){if(table==='qr_books')return {data:mode==='private'?null:{id:'novel'},error:null};
 return {data:mode==='unreleased'?null:{episode_number:0,title:'Episode 0',arc_title:'Prolog',content_md:body,release_at:mode==='future'?'2099-01-01T00:00:00Z':'2026-01-01T00:00:00Z',is_enabled:true},error:null};}
})};
const code=readFileSync('supabase/functions/secure-episode/index.ts','utf8');
const js=ts.transpileModule(code.replace(/^import \{ createClient \} from .*;\s*$/m,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const ctx={exports:{},Deno:{env:{get:k=>({SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'local-key',READER_RATE_SALT:'local-salt'})[k]},serve:fn=>{handler=fn;}},crypto:webcrypto,createClient:()=>db,Response,TextEncoder,Uint8Array,console};
vm.runInNewContext(js,ctx);
const call=async(episodeNumber=0)=>handler(new Request('https://test.invalid',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bookId:'novel',episodeNumber})}));
let result=await call();assert.equal(result.status,200);const data=await result.json();assert.equal(data.content,body);assert.equal(data.episodeNumber,0);assert.ok(!('totalParts' in data));
assert.equal(result.headers.get('Cache-Control'),'private, no-store, max-age=0');
mode='private';assert.equal((await call()).status,404);
mode='unreleased';assert.equal((await call()).status,404);
mode='future';assert.equal((await call()).status,404);
mode='limited';assert.equal((await call()).status,429);
mode='ok';assert.equal((await call(-1)).status,400);
assert.equal((await handler(new Request('https://test.invalid',{method:'OPTIONS'}))).status,204);

// Static compatibility: route must not accidentally convert episode=0 into undefined.
const app=readFileSync('src/App.tsx','utf8');
assert.ok(app.includes("raw!==null&&/^\\d+$/.test(raw)?Number(raw):undefined"));
assert.ok(!readFileSync('src/SecureReaderApp.tsx','utf8').includes('loadReaderSegment'));
const sql=readFileSync('supabase/migrations/20261012060000_episode_zero_v43.sql','utf8');
assert.ok(sql.includes('episode_number >= 0'));
assert.ok(sql.includes('ep.episode_number < 0'));

// Syntax on all project .ts and .tsx sources.
let files=0;const walk=(dir)=>{for(const e of readdirSync(dir,{withFileTypes:true})){const full=dir+'/'+e.name;if(e.isDirectory())walk(full);else if(/\.tsx?$/.test(e.name)){
 const source=readFileSync(full,'utf8');const parsed=ts.createSourceFile(full,source,ts.ScriptTarget.Latest,true,e.name.endsWith('tsx')?ts.ScriptKind.TSX:ts.ScriptKind.TS);
 assert.equal(parsed.parseDiagnostics.length,0,'Syntax: '+full+' '+parsed.parseDiagnostics.map(d=>d.messageText).join('; '));files++;
}}};
walk('src');walk('supabase/functions');
console.log('PASS V4.3: Episode 0, frontmatter, full-episode parser, server release checks, no-store, and '+files+' TS/TSX files syntax.');
