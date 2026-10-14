type Guard = () => boolean | Promise<boolean>;
const guards=new Set<Guard>();
let pending=false, installed=false, position=0, lastUrl='', suppress=false;
export function registerLeaveGuard(guard:Guard){guards.add(guard);window.dispatchEvent(new Event('kk:guard-change'));return()=>{guards.delete(guard);window.dispatchEvent(new Event('kk:guard-change'));};}
export async function mayLeave(){for(const guard of guards)if(!(await guard()))return false;return true;}
export function hasPendingWork(){return guards.size>0;}
export function installNavigation(){
  if(installed)return;installed=true;position=Number(history.state?.kkPosition)||0;lastUrl=location.pathname+location.search+location.hash;
  history.replaceState({...history.state,kkPosition:position},'',lastUrl);
  window.addEventListener('popstate',async event=>{
    if(suppress){suppress=false;return;}
    const next=Number(event.state?.kkPosition),old=position;
    if(!guards.size){position=Number.isFinite(next)?next:old;lastUrl=location.pathname+location.search+location.hash;return;}
    event.stopImmediatePropagation();
    const allowed=!pending&&await mayLeave();
    if(allowed){position=Number.isFinite(next)?next:old;lastUrl=location.pathname+location.search+location.hash;window.dispatchEvent(new Event('quiet:navigate'));}
    else if(Number.isFinite(next)&&next!==old){suppress=true;history.go(old-next);}
    else{history.replaceState({...history.state,kkPosition:old},'',lastUrl);}
  },true);
}
export function navigate(path:string){
  if(pending)return;
  void(async()=>{pending=true;try{
    if(!(await mayLeave()))return;
    const before=new CustomEvent('quiet:before-navigate',{cancelable:true,detail:{path}});if(!window.dispatchEvent(before))return;
    if(location.pathname+location.search+location.hash!==path){position++;history.pushState({kkPosition:position},'',path);lastUrl=path;}
    window.dispatchEvent(new Event('quiet:navigate'));window.scrollTo({top:0,behavior:'instant'});
  }finally{pending=false;}})();
}
