import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import {epubFixture} from './test-utils/epub-fixture.mjs';
const directory=await mkdtemp(join(tmpdir(),'katakecil-edge-'));
try{
 const path=join(directory,'fixture.epub');await writeFile(path,await epubFixture());
 // The adapter and shared TypeScript source are checked separately. This command exercises the generated JavaScript in Deno.
 const result=spawnSync('deno',['test','--no-check','--node-modules-dir=manual','--frozen','--config','supabase/functions/book-content/deno.json','--allow-read='+directory,'--allow-env=STUDIO_EPUB_FIXTURE','supabase/functions/book-content/runtime_test.ts'],{stdio:'inherit',env:{...process.env,STUDIO_EPUB_FIXTURE:path}});
 if(result.error)throw result.error;process.exitCode=result.status??1;
}finally{await rm(directory,{recursive:true,force:true});}
