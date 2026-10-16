import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
export const isConfigured = Boolean(url && key);
/** Public publishable key only. Never place Supabase secret/service role in VITE_ vars. */
export const supabase = isConfigured ? createClient(url, key, {
  global: { fetch: (input,init) => fetch(input,{...init,cache:'no-store'}) },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null;

/** A scoped SDK client lets cancellation stop in-flight Storage uploads too. */
export function abortableStorage(signal:AbortSignal){
 if(!supabase)throw Error('Supabase belum dikonfigurasi.');
 return createClient(url,key,{accessToken:async()=>{const {data}=await supabase.auth.getSession();return data.session?.access_token||null;},global:{fetch:(input,init)=>fetch(input,{...init,signal,cache:'no-store'})}}).storage;
}
