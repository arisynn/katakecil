import type {Episode} from '../../data/library';
export type Manuscript={title:string;arc:string;body:string};
export type SaveReason='automatic'|'checkpoint'|'resolve'|'restore';
export const manuscriptOf=(e:Episode):Manuscript=>({title:e.title,arc:e.arc_title,body:e.content_md});
export const sameManuscript=(a:Manuscript,b:Manuscript)=>a.title===b.title&&a.arc===b.arc&&a.body===b.body;
export type SaveOperation={id:string;expected:number;document:Manuscript;reason:SaveReason};
export class EditorConflict extends Error {}

/** RAM only. Serialized writes retry an uncertain operation with its exact UUID and payload. */
export class EditorSession {
 version:number;
 saved:Manuscript;
 blocked=false;
 pending:SaveOperation|null=null;
 private queue:Promise<unknown>=Promise.resolve();
 constructor(ep:Episode,private write:(op:SaveOperation)=>Promise<Episode>,private committed:(ep:Episode,doc:Manuscript)=>void){
  this.version=ep.editor_version??0;this.saved=manuscriptOf(ep);
 }
 save(document:Manuscript,reason:SaveReason='automatic',expected?:number):Promise<void>{
  const snapshot={...document};
  const run=async()=>{
   if(this.blocked&&reason==='automatic')throw new EditorConflict('Bab berubah di tab lain. Tinjau perubahan sebelum menyimpan.');
   const commit=async()=>{
    const op=this.pending!;
    try{
     const ep=await this.write(op);
     this.version=ep.editor_version;this.saved={...op.document};this.pending=null;this.blocked=false;
     this.committed(ep,this.saved);
    }catch(error){if(error instanceof EditorConflict){this.pending=null;this.blocked=true;}throw error;}
   };
   if(this.pending){const previous=this.pending;await commit();if(sameManuscript(previous.document,snapshot)&&previous.reason===reason)return;}
   if(reason==='automatic'&&sameManuscript(snapshot,this.saved))return;
   if(expected!==undefined){this.version=expected;this.blocked=false;}
   this.pending={id:crypto.randomUUID(),expected:this.version,document:snapshot,reason};
   await commit();
  };
  const next=this.queue.catch(()=>undefined).then(run);this.queue=next;return next;
 }
}

/** A field changed on only one side can be suggested safely; review is always explicit. */
export function suggestMerge(base:Manuscript,local:Manuscript,remote:Manuscript):Manuscript{
 const pick=(key:keyof Manuscript)=>local[key]===base[key]?remote[key]:local[key];
 return {title:pick('title'),arc:pick('arc'),body:pick('body')};
}
