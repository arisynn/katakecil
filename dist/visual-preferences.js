export const VISUAL_DEFAULTS=Object.freeze({iconPack:'katakecil',loadingStyle:'wordmark'});
export function normalizeVisualPreferences(input={}){
 return{iconPack:input?.iconPack==='lucide'?'lucide':'katakecil',loadingStyle:['wordmark','pulse','dots'].includes(input?.loadingStyle)?input.loadingStyle:'wordmark'};
}
// Native launch can render before Store exists; blocked/corrupt storage uses defaults.
export function readVisualPreferences(storage){
 try{return normalizeVisualPreferences(JSON.parse((storage===undefined?globalThis.localStorage:storage)?.getItem('lumina_device_settings')||'{}'));}
 catch{return{...VISUAL_DEFAULTS};}
}
