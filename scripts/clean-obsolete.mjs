// Remove only audited obsolete files whose bytes still match the old release.
// Default is a dry run; local edits and symlinks are always preserved.
import {readFileSync,existsSync,lstatSync,realpathSync,unlinkSync} from 'node:fs';
import {dirname,resolve,isAbsolute,relative,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const args=process.argv.slice(2);
if(args.some(arg=>arg!=='--apply'))throw Error('Gunakan tanpa argumen untuk cek, atau --apply untuk membersihkan.');
const apply=args.includes('--apply');
const root=realpathSync(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
if(JSON.parse(readFileSync(resolve(root,'package.json'),'utf8')).name!=='katakecil-personal-library')throw Error('Folder proyek bukan KataKecil.');
const entries=JSON.parse(readFileSync(resolve(root,'scripts/obsolete-files.json'),'utf8'));
let matched=0,kept=0,absent=0;
for(const entry of entries){
 const name=entry.path;
 if(typeof name!=='string'||isAbsolute(name)||name.includes('\\')||name.split('/').some(p=>p==='..'||p===''))throw Error('Path daftar pembersihan tidak valid.');
 const target=resolve(root,name),rel=relative(root,target);
 if(rel==='..'||rel.startsWith('..'+sep))throw Error('Path di luar proyek.');
 if(!existsSync(target)){absent++;continue;}
 if(!lstatSync(target).isFile()||realpathSync(target)!==target){kept++;console.log(`LEWATI (symlink/bukan file): ${name}`);continue;}
 const hash=createHash('sha256').update(readFileSync(target)).digest('hex');
 if(hash!==entry.sha256){kept++;console.log(`LEWATI (telah berubah): ${name}`);continue;}
 matched++;
 if(apply)unlinkSync(target);
 console.log(`${apply?'DIHAPUS':'AKAN DIHAPUS'}: ${name}`);
}
console.log(`${apply?'Selesai':'Pratinjau'}: ${matched} file cocok, ${kept} dilewati, ${absent} sudah tidak ada.`);
if(!apply&&matched)console.log('Jalankan npm run clean:obsolete -- --apply setelah meninjau daftar.');
