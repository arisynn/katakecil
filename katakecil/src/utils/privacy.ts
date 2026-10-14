/** Remove only obsolete preview data belonging to KataKecil; never clear all storage. */
export function cleanPreviewStorage(){try{for(let i=localStorage.length-1;i>=0;i--){const key=localStorage.key(i);if(key&&/^quiet_reader_(?:bookmarks|anchor)_preview-/.test(key))localStorage.removeItem(key);}}catch{}}
