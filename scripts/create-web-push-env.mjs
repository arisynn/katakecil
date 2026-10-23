import {writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import webPush from 'web-push';
const keys=webPush.generateVAPIDKeys();
const values={WEB_PUSH_ENABLED:'false',WEB_PUSH_SITE_ORIGIN:'https://katakecil.vercel.app',WEB_PUSH_SUBJECT:'mailto:REPLACE_WITH_OWNER_EMAIL',WEB_PUSH_VAPID_PUBLIC_KEY:keys.publicKey,WEB_PUSH_VAPID_PRIVATE_KEY:keys.privateKey,WEB_PUSH_DISPATCH_SECRET:randomBytes(32).toString('hex'),SUPABASE_URL:'https://YOUR_PROJECT.supabase.co',SUPABASE_PUBLIC_KEY:'REPLACE_WITH_PUBLIC_KEY',SUPABASE_SERVICE_ROLE_KEY:'REPLACE_WITH_SERVER_SECRET'};
writeFileSync('.env.web-push.local',Object.entries(values).map(([key,value])=>`${key}=${value}`).join('\n')+'\n',{mode:0o600,flag:'wx'});
console.log('Created .env.web-push.local (private, ignored). Keys were not printed. Fill owner/backend settings before enabling.');
