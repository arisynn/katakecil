import {dispatchRequest,readConfig} from '../server/web-push/service.ts';
export const maxDuration=180;
export const POST=(request:Request)=>dispatchRequest(request,readConfig());
