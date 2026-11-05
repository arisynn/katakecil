// Only the two author-approved, fully released novels may use a private ready-to-read edition.
export const COMPLETED_BOOKS=new Set(['apa-itu-rumah','masa-panen-google-play-ready-1']);
export const EDITION_VERSION='reader-edition-4';
export function privateEditionPath(book:{id:string;status:string;revision:string;next_release_at:string|null}){
 if(!COMPLETED_BOOKS.has(book.id)||book.status!=='completed'||book.next_release_at||!/^[a-f\d]{64}$/.test(book.revision))return null;
 return `reader-editions/${book.id}/${book.revision}.epub`;
}
