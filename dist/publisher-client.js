const PROJECT='https://hrbcwymdqigtfmpmsdsi.supabase.co';
const PUBLIC_KEY='sb_publishable_lttlEUXKFSzkOk9Jizy8TQ_dXdS1ex-';
export function createPublisherClient(){
 let key='',clientPromise;
 const auth=()=>clientPromise||=(import('./vendor/supabase.js?v=1').then(({createClient})=>createClient(PROJECT,PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:true}})));
 async function token(){if(key)return key;const client=await auth(),{data:{session}}=await client.auth.getSession();return session?.access_token||'';}
 async function request(action,{id,body,mime}={}){
  const access=await token();if(!access)throw Error('Sign in to Publisher first.');
  const url=new URL(PROJECT+'/functions/v1/katakecil-publisher');url.searchParams.set('action',action);if(id)url.searchParams.set('id',id);
  const response=await fetch(url,{method:body?'POST':'GET',credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(60000),headers:{Authorization:'Bearer '+access,...(body?{'Content-Type':mime||'application/json'}:{})},body:body?(body instanceof Blob?body:JSON.stringify(body)):undefined});
  if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(response.status===409?'This book changed. Reload it before publishing.':data.error||'Publisher request failed.');}
  return action==='download'?response.blob():response.json();
 }
 return{request,
  async resume(){const value=await token();if(!value)return false;await request('status');return true;},
  async login(email,password){key='';const client=await auth(),{error}=await client.auth.signInWithPassword({email,password});if(error)throw error;await request('status');},
  async loginKey(value){key=value.trim();try{await request('status');}catch(error){key='';throw error;}},
  async signup(email,password){const client=await auth(),{error,data}=await client.auth.signUp({email,password,options:{emailRedirectTo:'https://katakecil.vercel.app/?publisher=1'}});if(error)throw error;return !!data.session;},
  async recover(email){const client=await auth(),{error}=await client.auth.resetPasswordForEmail(email,{redirectTo:'https://katakecil.vercel.app/?publisher=1'});if(error)throw error;},
  async updatePassword(password){const client=await auth(),{error}=await client.auth.updateUser({password});if(error)throw error;},
  async logout(){key='';if(clientPromise)await(await clientPromise).auth.signOut({scope:'local'});},
 };
}
