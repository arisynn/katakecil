// Synthetic QA only; this fixture is excluded from the production build.
import {useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../../src/App';
import '../../../src/design/v72.css';
import '../../../src/design/v73.css';
import '../../../src/design/v74.css';
import '../../../src/design/v75.css';
import {Books} from '../../../src/features/studio/components/BookManagement';
import ManuscriptImporter from '../../../src/pages/ManuscriptImporter';
import TrashManager from '../../../src/pages/TrashManager';
import {ScheduleManager} from '../../../src/pages/StudioManagement';
import PublicLibrary from '../../../src/pages/PublicLibrary';
import {getStudioLibrary,type Book,type Episode} from '../../../src/data/library';
import {useUiTheme} from '../../../src/hooks/useUiTheme';
import {installNavigation} from '../../../src/utils/nav';
installNavigation();
function Fixture(){
 const {theme}=useUiTheme();
 const [mode,setMode]=useState(new URLSearchParams(location.search).get('mode')||'books');
 const [library,setLibrary]=useState<{books:Book[];episodes:Episode[]}>({books:[],episodes:[]});
 const refresh=async()=>{setLibrary(await getStudioLibrary());};
 useEffect(()=>{void refresh();const sync=()=>{setMode(location.pathname==='/studio/cerita'?'books':new URLSearchParams(location.search).get('mode')||'books');};window.addEventListener('quiet:navigate',sync);return ()=>window.removeEventListener('quiet:navigate',sync);},[]);
 if(mode==='home')return <PublicLibrary path="/"/>;
 return <div className="studio-app v6-studio-app" data-kk-theme={theme}><main className="studio-content">{mode==='import'?<ManuscriptImporter {...library} onChanged={refresh}/>:mode==='trash'?<TrashManager onChanged={refresh}/>:mode==='schedule'?<ScheduleManager {...library} onChanged={refresh}/>:<Books {...library} onChanged={refresh} onCreate={()=>{}}/>}</main></div>;
}
createRoot(document.getElementById('root')!).render(<Fixture/>);
