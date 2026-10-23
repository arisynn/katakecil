import {readConfig,subscriptionRequest} from '../_shared/web-push/core.ts';
import {repository} from '../_shared/web-push/repository.ts';
const settings=readConfig(key=>Deno.env.get(key));
Deno.serve(async request=>{const config=await settings;return subscriptionRequest(request,'subscribe',config,config?repository(config):undefined);});
