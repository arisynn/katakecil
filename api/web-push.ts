import {readConfig,subscriptionRequest} from '../server/web-push/service.ts';
export const GET=(request:Request)=>subscriptionRequest(request,readConfig());
export const POST=(request:Request)=>subscriptionRequest(request,readConfig());
