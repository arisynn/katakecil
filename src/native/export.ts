import { Directory, Encoding, Filesystem } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/** Share a user-requested Studio export using a scoped cache file/content URI. */
export async function shareStudioExport(name: string, contents: string) {
  const filename = name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const file = await Filesystem.writeFile({
    path: `exports/${filename}`, data: contents,
    directory: Directory.Cache, encoding: Encoding.UTF8, recursive: true,
  });
  // The receiving application may read after the share sheet returns, so let
  // Android manage this cache file's lifetime rather than deleting it early.
  await Share.share({ title: 'Ekspor KataKecil', files: [file.uri], dialogTitle: 'Simpan atau bagikan ekspor' });
}

/** Binary exports must be written as base64 without a UTF-8 encoding option. */
export async function shareStudioBlob(name:string,blob:Blob){
 const data=await new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=()=>reject(reader.error);reader.readAsDataURL(blob);});
 const file=await Filesystem.writeFile({path:`exports/${name.replace(/[^a-zA-Z0-9._-]/g,'_')}`,data,directory:Directory.Cache,recursive:true});
 await Share.share({title:'Ekspor KataKecil',files:[file.uri],dialogTitle:'Simpan atau bagikan ekspor'});
}
