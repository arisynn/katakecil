import ts from 'typescript';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),cache=new Map();
export function loadTs(path){
 const full=resolve(path);if(cache.has(full))return cache.get(full).exports;
 const module={exports:{}};cache.set(full,module);
 const source=ts.transpileModule(readFileSync(full,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText;
 const localRequire=name=>{if(!name.startsWith('.'))return require(name);let target=resolve(dirname(full),name);if(!existsSync(target))target+='.ts';return loadTs(target);};
 new Function('require','module','exports',source)(localRequire,module,module.exports);return module.exports;
}
