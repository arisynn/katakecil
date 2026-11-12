export const GLASS_DEFAULTS=Object.freeze({glassTransparency:75,glassBlur:20});
export function normalizeGlassPreferences(input={}){
 const number=(key,max)=>typeof input?.[key]==='number'&&Number.isFinite(input[key])?Math.round(Math.max(0,Math.min(max,input[key]))):GLASS_DEFAULTS[key];
 return{glassTransparency:number('glassTransparency',100),glassBlur:number('glassBlur',40)};
}
const rgb=hex=>/^#[a-f\d]{6}$/i.test(hex)?[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)):[250,249,245];
const blend=(front,back,alpha)=>front.map((v,i)=>Math.round(v*alpha+back[i]*(1-alpha)));
function luminance(color){return color.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0);}
export function glassContrast(a,b){const x=luminance(rgb(a)),y=luminance(rgb(b));return(Math.max(x,y)+.05)/(Math.min(x,y)+.05);}
export function glassTokens(input,palette){
 const settings=normalizeGlassPreferences(input),alpha=1-settings.glassTransparency/100;
 const base=rgb(palette.background),glass=String(palette.variables?.['--glass']||'').split(',').map(Number);
 const surface=blend(glass.length===3&&glass.every(Number.isFinite)?glass:base,base,alpha);
 const action=blend(rgb(input.accentColor||'#54756c'),surface,alpha),background='#'+action.map(v=>v.toString(16).padStart(2,'0')).join('');
 const ink=[palette.text,'#151918','#ffffff'].filter(c=>/^#[a-f\d]{6}$/i.test(c)).sort((a,b)=>glassContrast(b,background)-glassContrast(a,background))[0];
 return{'--g-fill-alpha':String(Number(alpha.toFixed(2))),'--g-panel-alpha':String(Number(alpha.toFixed(2))),'--g-blur':settings.glassBlur+'px','--g-action-ink':ink};
}
export function applyGlassAppearance(element,input,palette){for(const [key,value] of Object.entries(glassTokens(input,palette)))element.style.setProperty(key,value);}
