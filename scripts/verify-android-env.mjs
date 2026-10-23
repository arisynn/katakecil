import {loadEnv} from 'vite';
const env = loadEnv('android', process.cwd(), 'VITE_');
const url = env.VITE_SUPABASE_URL?.trim();
const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
let valid = /^sb_publishable_[A-Za-z0-9_-]+$/.test(key || '');
if (key?.startsWith('eyJ')) {
  try { valid = JSON.parse(Buffer.from(key.split('.')[1], 'base64url')).role === 'anon'; } catch {}
}
if (!url || new URL(url).protocol !== 'https:' || !valid) {
  throw Error('Android requires an HTTPS VITE_SUPABASE_URL and a public publishable/anon key. Set .env.android.local or CI variables.');
}
for (const [name,value] of Object.entries(env)) {
  if (/SERVICE_ROLE|SECRET/i.test(name) || /sb_secret_/.test(value)) throw Error(`Forbidden privileged Vite variable: ${name}`);
}
console.log('Android public backend configuration validated (values withheld).');
