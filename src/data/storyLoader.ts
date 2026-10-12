import type { StoryFile } from '../types/reader';
export const legacyBookId = import.meta.env.VITE_BOOK_ID || 'peta-jalan-pulang';
export const legacyBookTitle = import.meta.env.VITE_BOOK_TITLE || 'Peta Jalan Pulang';
export function emptyStory(bookId=legacyBookId,title=legacyBookTitle):StoryFile {
  return {id:bookId,path:'',title,content:''};
}
// Full public manuscript loading was removed in V4.2 by design.
