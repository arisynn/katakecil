const encoder=new TextEncoder();
export const bytes=(value:string)=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),char=>char.charCodeAt(0));
export const base64url=(value:Uint8Array)=>btoa(String.fromCharCode(...value)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const hex=(value:ArrayBuffer)=>Array.from(new Uint8Array(value)).map(byte=>byte.toString(16).padStart(2,'0')).join('');
export const hash=async(value:string)=>hex(await crypto.subtle.digest('SHA-256',encoder.encode(value)));
export async function hmac(secret:string,value:string){const key=await crypto.subtle.importKey('raw',encoder.encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return hex(await crypto.subtle.sign('HMAC',key,encoder.encode(value)));}
export async function equalSecret(actual:string,expected:string){const a=bytesDigest(await hash(actual)),b=bytesDigest(await hash(expected));let difference=0;for(let i=0;i<a.length;i++)difference|=a[i]^b[i];return difference===0;}
const bytesDigest=(value:string)=>Uint8Array.from(value.match(/../g)!,part=>Number.parseInt(part,16));
export async function validVapid(publicKey:string,privateKey:string){
 try{if(!/^[\w-]{87}$/.test(publicKey)||!/^[\w-]{43}$/.test(privateKey))return false;
  const point=bytes(publicKey);if(point.length!==65||point[0]!==4)return false;
  const verify=await crypto.subtle.importKey('raw',point,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
  const sign=await crypto.subtle.importKey('jwk',{kty:'EC',crv:'P-256',x:base64url(point.slice(1,33)),y:base64url(point.slice(33)),d:privateKey},{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
  const probe=encoder.encode('KataKecil VAPID configuration check');
  return crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},verify,await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},sign,probe),probe);
 }catch{return false;}
}
