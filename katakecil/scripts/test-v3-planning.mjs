import {readFileSync} from 'node:fs';
import ts from 'typescript';
const js=ts.transpileModule(readFileSync('src/utils/releasePlanning.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const mod={exports:{}};new Function('module','exports',js)(mod,mod.exports);
const {fromWib,toWibDate,toWibInput,monthDays,makeReleasePlan}=mod.exports;
function assert(cond,msg){if(!cond)throw Error(msg)}
assert(fromWib('2026-10-15','19:00')==='2026-10-15T12:00:00.000Z','WIB -> UTC');
assert(toWibDate('2026-10-15T23:30:00.000Z')==='2026-10-16','UTC -> WIB date crossing');
assert(toWibInput('2026-10-15T12:00:00.000Z')==='2026-10-15T19:00','WIB form input');
assert(monthDays(2026,9).filter(x=>x!==null).length===31,'calendar count');
let badDate=false;try{fromWib('2026-02-30','19:00')}catch{badDate=true};assert(badDate,'invalid day rejected');
const ep=(id,number,is_enabled=false,release_at=null)=>({id,book_id:'novel-a',episode_number:number,title:`Ep ${number}`,is_enabled,release_at});
const episodes=[ep('one',1,true,'2026-10-15T12:00:00.000Z'),ep('two',2),ep('three',3),ep('four',4,true,'2026-10-18T12:00:00.000Z')];
const plan=makeReleasePlan({bookId:'novel-a',episodes,weekdays:[4,0],timeWib:'19:00',startDate:'2026-10-15',count:2,nowMs:Date.parse('2026-10-12T00:00:00Z')});
assert(plan[0].episode_id==='two'&&plan[0].release_at==='2026-10-22T12:00:00.000Z','avoid previously scheduled Thu + Sun');
assert(plan[1].episode_id==='three'&&plan[1].release_at==='2026-10-25T12:00:00.000Z','next eligible slot');
let tooMany=false;try{makeReleasePlan({bookId:'novel-a',episodes,weekdays:[4],timeWib:'19:00',startDate:'2026-10-15',count:3,nowMs:0})}catch{tooMany=true};assert(tooMany,'prevent scheduling more drafts than available');
console.log('V3 publication planning tests passed.');
