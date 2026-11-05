import type {SupabaseClient} from '@supabase/supabase-js';
export const ALLOWED_ORIGINS=new Set(['https://katakecil.vercel.app','https://localhost','capacitor://localhost']);
export const digest=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(n=>n.toString(16).padStart(2,'0')).join('');
export async function publisherAccess(token:string,admin:SupabaseClient,options:{projectUrl:string;publicKey:string;ownerHash:string},fetcher:typeof fetch=fetch):Promise<number>{
 if(/^kk_[a-f0-9]{64}$/.test(token)){
  const {data,error}=await admin.from('kk_publisher_tokens').select('is_enabled').eq('token_hash',await digest(token)).maybeSingle();
  return error?503:!data?401:data.is_enabled?200:403;
 }
 if(token.length>4096||!/^[-\w]+\.[-\w]+\.[-\w]+$/.test(token))return 401;
 const {data:{user},error}=await admin.auth.getUser(token);if(error||!user)return 401;
 const membership=await admin.from('kk_author_members').select('user_id').eq('user_id',user.id).maybeSingle();if(membership.error)return 503;if(membership.data)return 200;
 if(!user.email_confirmed_at||!user.email||await digest(user.email.toLowerCase())!==options.ownerHash)return 403;
 // Confirmed-email enrollment is valid only when signup actually requires mailbox verification.
 const response=await fetcher(options.projectUrl+'/auth/v1/settings',{headers:{apikey:options.publicKey},signal:AbortSignal.timeout(10000)});
 if(!response.ok)return 503;const settings=await response.json();if(settings.mailer_autoconfirm!==false)return 403;
 const enrolled=await admin.from('kk_author_members').upsert({user_id:user.id},{onConflict:'user_id'});return enrolled.error?503:200;
}
