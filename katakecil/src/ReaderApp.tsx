import SecureReaderApp from './SecureReaderApp';
import type {StoryFile} from './types/reader';
/** Preview shares the public renderer, but receives an authorized in-memory snapshot. */
export default function ReaderApp({bookId,bookTitle,onExit,previewStory,episodeNumber}:{bookId:string;bookTitle:string;onExit:()=>void;previewStory?:StoryFile;episodeNumber?:number}){
  if(!previewStory?.previewEpisode)return <div role="alert">Pratinjau tidak tersedia. <button onClick={onExit}>Kembali ke editor</button></div>;
  return <SecureReaderApp bookId={bookId} bookTitle={bookTitle} onExit={onExit} episodeNumber={episodeNumber} previewEpisode={previewStory.previewEpisode}/>;
}
