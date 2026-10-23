import {useLayoutEffect,useRef} from 'react';
import {registerLeaveGuard} from '../utils/nav';
export function useLeaveGuard(active:boolean,guard:()=>boolean|Promise<boolean>){
  const latest=useRef(guard);latest.current=guard;
  useLayoutEffect(()=>{if(!active)return;const remove=registerLeaveGuard(()=>latest.current());
    const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',unload);
    return()=>{remove();window.removeEventListener('beforeunload',unload);};
  },[active]);
}
