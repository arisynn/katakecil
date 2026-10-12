import { readFileSync } from 'node:fs';
import ts from 'typescript';
const src=readFileSync('src/utils/importMarkdown.ts','utf8');
const js=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const module={exports:{}};new Function('module','exports',js)(module,module.exports);
const parse=module.exports.parseMarkdownUpload;
function assert(condition,message){if(!condition)throw Error(`Failed: ${message}`)}
const episodes=parse('## ARC I\n\n### Episode 3 — Pertemuan\n\nHalo dunia.\n\n### Episode 4 — Pulang\n\nDan selamat tinggal.','ARC_01.md');
assert(episodes.length===2,'parse full arc into episodes');
assert(episodes[0].episode_number===3&&episodes[1].episode_number===4,'preserve original numbering');
assert(episodes[0].arc_title==='ARC I','preserve arc');
assert(!episodes[0].content_md.includes('### Episode 4'),'do not mix next chapter content');
const single=parse('Naskah awal.\n\nNaskah berikutnya.','001_Jejak Pertama.md');
assert(single.length===1&&single[0].episode_number===null,'single file as next sequence');
assert(single[0].title==='Jejak Pertama','clean filename title');
console.log('V2 Markdown parser tests passed.');
