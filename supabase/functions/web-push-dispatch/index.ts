import {dispatchRequest,readConfig} from '../_shared/web-push/core.ts';
import {repository} from '../_shared/web-push/repository.ts';
import {sender} from '../_shared/web-push/transport.ts';
const settings=readConfig(key=>Deno.env.get(key));
Deno.serve(async request=>{const config=await settings;return dispatchRequest(request,config,config?repository(config):undefined,config?sender(config):undefined);});
