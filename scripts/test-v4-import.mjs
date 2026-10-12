// Runs with `npm run test:v4` after installing dev dependencies (TypeScript).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const md=readFileSync('src/utils/importMarkdown.ts','utf8');
const helpers=readFileSync('src/utils/importManuscript.ts','utf8').replace(/^import .*;\s*$/gm,'');
const compiled=ts.transpileModule([md,helpers].join('\n').replace(/\bexport\s+(?=(?:type|const|function|class)\b)/g,''),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText;
const context=vm.createContext({console,Date,Set,Error,Map,Intl});
vm.runInContext(compiled+'\nthis.__test={parsePlainManuscript,titleInfo,validateImport,assignEpisodeNumbers,mergeAdjacent,splitChapter,changeOrder};',context);
const {parsePlainManuscript,titleInfo,validateImport,assignEpisodeNumbers,mergeAdjacent,splitChapter,changeOrder}=context.__test;
const file=parsePlainManuscript('# Episode 1 — Satu\n\nAwal cerita.\n\n# Episode 2 — Dua\n\nLanjutan ceritanya.','test.md');
assert.equal(file.chapters.length,2);assert.equal(file.chapters[0].episode_number,1);
assert.equal(titleInfo('Bab VII — Angin').number,7);assert.equal(titleInfo('ARC II — Nama').kind,'arc');
const custom=[{key:'a',episode_number:1,title:'Episode 1',content_md:'Isi A',arc_title:'',include:true,confidence:'tinggi',origin:'x'},{key:'b',episode_number:null,title:'Episode 2',content_md:'Isi B',arc_title:'',include:true,confidence:'sedang',origin:'x'}];
assert.equal(assignEpisodeNumbers(custom,[])[1].episode_number,2);
assert.equal(validateImport(custom,[{episode_number:1,content_md:'Isi lainnya'}]).length,1);
assert.equal(validateImport(custom,[{episode_number:9,content_md:'Isi B'}]).length,1);
assert.equal(validateImport(custom,[]).length,0);
assert.equal(mergeAdjacent(custom,0).length,1);
assert.equal(splitChapter(custom,0,2).length,2); // invalid split offset -> unchanged
assert.equal(changeOrder(custom,0,1)[0].key,'b');
console.log('V4 pure importer checks passed (heading parsing, numbering, collisions, and edit operations).');
