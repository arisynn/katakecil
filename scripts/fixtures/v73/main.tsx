// Synthetic integration fixture. Never included by the production entry point.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import '../../../src/App';
import '../../../src/design/v72.css';
import '../../../src/design/v73.css';
import {Cover} from '../../../src/components/Cover';
import {CoverEditor} from '../../../src/features/covers/CoverEditor';
import CoverManager from '../../../src/features/covers/CoverManager';
import {CoverDetail} from '../../../src/features/covers/CoverDetail';
import {BookCard} from '../../../src/features/public/components/StoryCard';
import ManuscriptImporter from '../../../src/pages/ManuscriptImporter';
import {supabase} from '../../../src/data/supabase';
import {installNavigation} from '../../../src/utils/nav';
import type {Book} from '../../../src/data/library';
import type {PreparedCover} from '../../../src/features/covers/model';
const params=new URLSearchParams(location.search),mode=params.get('mode'),theme=params.get('theme')||'light';
document.documentElement.setAttribute('data-app-theme',theme);document.documentElement.setAttribute('data-kk-theme',theme);document.documentElement.setAttribute('data-theme',theme);
const book:Book={id:'qa',slug:'qa',title:'Judul panjang untuk pengujian sampul cerita',synopsis:'Synthetic cover QA',genre:'Fiksi',cover_url:null,status:'ongoing',is_published:true,is_featured:false,created_at:'2026-01-01',updated_at:'2026-01-01'};
function Editor(){const [value,setValue]=useState<PreparedCover|null>(null);return <><CoverEditor value={value} onChange={setValue}/><output hidden data-testid="prepared">{value?JSON.stringify({width:value.width,height:value.height,settings:value.settings,original:value.original.size,normalized:value.normalized.size}):''}</output></>;}
function Recovery(){const [url,setURL]=useState('/missing-cover.png');return <><Cover book={{...book,cover_url:url}}/><button onClick={()=>setURL('/fixture-cover/9x16.png')}>Ganti URL gagal</button></>;}
function Manager(){const [current,setCurrent]=useState(book);return <CoverManager book={current} onChanged={setCurrent}/>;}
function Gallery(){return <div className="v6-public" data-kk-theme={theme}><div className="fixture-gallery" style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:16,maxWidth:700,margin:'auto'}}>{['9x16','3x4','1x1','5x1'].map((ratio,i)=><BookCard key={ratio} book={{...book,id:ratio,title:i===1?book.title:'Judul cerita',cover_url:`/fixture-cover/${ratio}.png`}} count={12} demo={false}/>)}</div><div style={{width:260,margin:'30px auto'}}><CoverDetail book={{...book,cover_url:'/fixture-cover/9x16.png'}}/></div></div>;}
installNavigation();
async function start(){if(supabase&&(mode==='manager'||mode==='import')){const encode=(v:unknown)=>btoa(JSON.stringify(v)).replace(/=+$/g,'').replace(/\+/g,'-').replace(/\//g,'_');const token=`${encode({alg:'HS256',typ:'JWT'})}.${encode({sub:'00000000-0000-4000-8000-000000000001',exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated'})}.c3ludGhldGlj`;const session=await supabase.auth.setSession({access_token:token,refresh_token:'synthetic-refresh'});if(session.error)throw session.error;}
 createRoot(document.getElementById('root')!).render(mode==='gallery'?<Gallery/>:<div className="studio-app v6-studio-app" data-kk-theme={theme}><main className="studio-content" style={{margin:0,maxWidth:850}}>{mode==='manager'?<Manager/>:mode==='recovery'?<Recovery/>:mode==='import'?<ManuscriptImporter books={[]} episodes={[]} onChanged={async()=>{}}/>:<Editor/>}</main></div>);
}void start();
