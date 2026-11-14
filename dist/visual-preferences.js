export const VISUAL_DEFAULTS=Object.freeze({iconPack:'katakecil',loadingStyle:'wordmark',readerAmbientGlow:false});
export function normalizeVisualPreferences(input={}){
 return{iconPack:input?.iconPack==='lucide'?'lucide':'katakecil',loadingStyle:['wordmark','pulse','dots'].includes(input?.loadingStyle)?input.loadingStyle:'wordmark',readerAmbientGlow:input?.readerAmbientGlow===true};
}
// Native launch can render before Store exists; blocked/corrupt storage uses defaults.
export function readVisualPreferences(storage){
 try{return normalizeVisualPreferences(JSON.parse((storage===undefined?globalThis.localStorage:storage)?.getItem('lumina_device_settings')||'{}'));}
 catch{return{...VISUAL_DEFAULTS};}
}
