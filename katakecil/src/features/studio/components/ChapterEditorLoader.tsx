import {useEffect,useState,type ComponentProps} from 'react';
import {getAuthorEpisode,type Episode} from '../../../data/library';
import ChapterEditor from './ChapterEditor';
export default function ChapterEditorLoader(props:ComponentProps<typeof ChapterEditor>){
 const [episode,setEpisode]=useState<Episode|null>(null),[error,setError]=useState(''),[attempt,setAttempt]=useState(0);
 useEffect(()=>{let active=true;setError('');setEpisode(null);getAuthorEpisode(props.ep.id).then(e=>{if(active)setEpisode(e);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[props.ep.id,attempt]);
 if(error)return <div className="studio-error" role="alert">{error} <button onClick={()=>setAttempt(x=>x+1)}>Coba lagi</button></div>;
 if(!episode)return <p role="status">Memuat isi bab…</p>;
 return <ChapterEditor {...props} ep={episode} onUpdate={e=>{setEpisode(e);props.onUpdate(e);}}/>;
}
