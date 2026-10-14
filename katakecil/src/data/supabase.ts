import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() || '';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim() || '';
export const isConfigured = Boolean(url && key);
/** Public publishable key only. Never place Supabase secret/service role in VITE_ vars. */
export const supabase = isConfigured ? createClient(url, key, {
  global: { fetch: (input,init) => fetch(input,{...init,cache:'no-store'}) },
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
}) : null;
