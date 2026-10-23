import {epubEpisodeRequest,readEpubConfig} from '../server/epub/service.ts';
export const GET=(request:Request)=>epubEpisodeRequest(request,readEpubConfig());
export const OPTIONS=GET;
