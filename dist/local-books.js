import {escapeHTML as esc,icon} from './ui.js?v=14';

export function createLocalBooks(ctx){
 let selected='',busy=false;
 const tr=(en,id)=>ctx.language()==='id'?id:en;
 const find=id=>ctx.books().find(book=>book.id===id&&book.source==='local');
 const fail=error=>ctx.toast(error?.message||tr('The book could not be updated.','Buku belum bisa diperbarui.'));
 function open(){
  selected='';const books=ctx.books().filter(book=>book.source==='local');
  ctx.show(ctx.heading(tr('Personal EPUBs','EPUB pribadi'))+`<div class="local-book-manager"><p class="settings-caption">${tr('These books are stored on this device.','Buku-buku ini disimpan di perangkat ini.')}</p>${books.length?books.map(book=>`<article class="local-book-row"><img src="${esc(book.cover||ctx.fallback(book))}" alt="${tr('Book cover','Sampul buku')}"><div><h3 data-book-content translate="no">${esc(book.title)}</h3><p data-book-content translate="no">${esc(book.author)}</p><div class="local-book-actions"><button class="secondary" data-action="local-cover" data-id="${esc(book.id)}">${icon('appearance')}${tr('Cover','Sampul')}</button><button class="secondary" data-action="local-delete" data-id="${esc(book.id)}">${icon('trash')}${tr('Remove','Hapus')}</button></div></div></article>`).join(''):`<p class="settings-caption">${tr('No personal EPUBs yet. Import one from Advanced settings.','Belum ada EPUB pribadi. Impor melalui pengaturan Lanjutan.')}</p>`}</div>`);
 }
 function coverDialog(id){
  const book=find(id);if(!book)return;selected=id;
  ctx.show(ctx.heading(tr('Book cover','Sampul buku'))+`<div class="local-import-preview"><img src="${esc(book.cover||ctx.fallback(book))}" alt="${tr('Book cover','Sampul buku')}"><h3 data-book-content translate="no">${esc(book.title)}</h3></div><p class="settings-caption">${tr('Choose a JPG, PNG or WebP image, up to 5 MB.','Pilih gambar JPG, PNG atau WebP, maksimal 5 MB.')}</p><div class="dialog-actions"><button class="secondary" data-action="local-manager">${tr('Back','Kembali')}</button><button class="secondary" data-action="local-cover-reset" data-id="${esc(id)}">${tr('Original cover','Sampul asli')}</button><button class="primary" data-action="local-cover-pick">${tr('Choose image','Pilih gambar')}</button></div><input id="local-cover-input" type="file" accept="image/jpeg,image/png,image/webp" hidden>`);
 }
 function confirmDelete(id){
  const book=find(id);if(!book)return;selected=id;
  ctx.show(ctx.heading(tr('Remove personal book?','Hapus buku pribadi?'))+`<p class="note-quote" data-book-content translate="no">${esc(book.title)}</p><p class="settings-caption">${tr('The EPUB and cover are removed from this device. Progress and notes are kept for re-importing the same file.','EPUB dan sampul dihapus dari perangkat ini. Progres dan catatan tetap disimpan untuk impor ulang berkas yang sama.')}</p><div class="dialog-actions"><button class="secondary" data-action="local-manager">${tr('Cancel','Batal')}</button><button class="primary" data-action="local-delete-confirm" data-id="${esc(id)}">${tr('Remove book','Hapus buku')}</button></div>`);
 }
 function announce(){try{const channel=new BroadcastChannel('lumina-library');channel.postMessage({kind:'local-books-changed'});channel.close();}catch{}}
 async function saveCover(id,cover,custom){
  const book=await ctx.saveCover(id,cover,custom);if(!book)throw Error(tr('Storage is unavailable. Please try again.','Penyimpanan belum tersedia. Coba lagi.'));
  ctx.changed(book,id);announce();if(selected===id&&document.querySelector('#local-cover-input'))coverDialog(id);ctx.toast(tr('Cover saved.','Sampul disimpan.'));
 }
 async function changeCover(file){
  const id=selected;if(busy||!find(id))return;busy=true;let image;
  try{
   if(file.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error(tr('Use a JPG, PNG or WebP image up to 5 MB.','Gunakan JPG, PNG atau WebP maksimal 5 MB.'));
   image=await createImageBitmap(file);if(!image.width||!image.height||image.width*image.height>40000000)throw Error(tr('Choose a smaller image.','Pilih gambar yang lebih kecil.'));
   const scale=Math.min(1,600/image.width,900/image.height),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(image.width*scale));canvas.height=Math.max(1,Math.round(image.height*scale));
   const draw=canvas.getContext('2d');draw.fillStyle='#faf9f5';draw.fillRect(0,0,canvas.width,canvas.height);draw.drawImage(image,0,0,canvas.width,canvas.height);await saveCover(id,canvas.toDataURL('image/jpeg',.9),true);
  }catch(error){fail(error);}finally{image?.close();busy=false;}
 }
 async function action(button){
  const id=button.dataset.id;
  switch(button.dataset.action){
   case 'local-manager':if(!busy)open();return true;
   case 'local-cover':if(!busy)coverDialog(id);return true;
   case 'local-cover-pick':if(!busy)document.querySelector('#local-cover-input')?.click();return true;
   case 'local-cover-reset':if(!busy&&find(id)){busy=true;try{const book=find(id),cover=book.epubBuffer?await ctx.original(book.epubBuffer):'';await saveCover(id,cover||ctx.fallback(book),false);}catch(error){fail(error);}finally{busy=false;}}return true;
   case 'local-delete':if(!busy)confirmDelete(id);return true;
   case 'local-delete-confirm':if(busy||id!==selected||!find(id))return true;busy=true;button.disabled=true;try{if(!await ctx.remove(id))throw Error(tr('The book could not be removed.','Buku belum bisa dihapus.'));ctx.changed(null,id);announce();open();ctx.toast(tr('Personal book removed.','Buku pribadi dihapus.'));}catch(error){fail(error);button.disabled=false;}finally{busy=false;}return true;
   default:return false;
  }
 }
 return{action,change:file=>{void changeCover(file);}};
}
