export const VISUAL_DEFAULTS=Object.freeze({iconPack:'katakecil',loadingStyle:'pulse',readerAmbientGlow:false});
export function normalizeVisualPreferences(input={}){
 return{iconPack:['katakecil','lucide','katakecil-new','katakecil-lembar'].includes(input?.iconPack)?input.iconPack:'katakecil',loadingStyle:['wordmark','pulse','dots'].includes(input?.loadingStyle)?input.loadingStyle:'pulse',readerAmbientGlow:input?.readerAmbientGlow===true};
}
// Native launch can render before Store exists; blocked/corrupt storage uses defaults.
export function readVisualPreferences(storage){
 try{return normalizeVisualPreferences(JSON.parse((storage===undefined?globalThis.localStorage:storage)?.getItem('lumina_device_settings')||'{}'));}
 catch{return{...VISUAL_DEFAULTS};}
}
