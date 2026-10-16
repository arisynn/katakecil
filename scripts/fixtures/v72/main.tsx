// Synthetic fixtures only. Excluded from production build entry points.
import React, {useState} from 'react';
import ChapterEditorLoader from '../../../src/features/studio/components/ChapterEditorLoader';
import type {Episode,Book} from '../../../src/data/library';
import {createRoot} from 'react-dom/client';
import '../../../src/App';
import '../../../src/design/v72.css';
import '../../../src/design/v73.css';
import '../../../src/design/v74.css';
import PublicLibrary from '../../../src/pages/PublicLibrary';
import ReaderApp from '../../../src/ReaderApp';
import SecureReaderApp from '../../../src/SecureReaderApp';
import {ContentsPanel} from '../../../src/components/ReaderPanels';
import {THEMES} from '../../../src/utils/theme';
import ManuscriptImporter from '../../../src/pages/ManuscriptImporter';
import PwaExperience from '../../../src/features/pwa/PwaExperience';
import {installNavigation,navigate} from '../../../src/utils/nav';
import {useLeaveGuard} from '../../../src/hooks/useLeaveGuard';
import {useUiTheme} from '../../../src/hooks/useUiTheme';
import {cleanPreviewStorage} from '../../../src/utils/privacy';
const params=new URLSearchParams(location.search);const mode=params.get('mode');const number=Number(params.get('ep')??12);
const content='SENTINEL_QA_V72_PRIVATE_8372. Ini kalimat sintetis untuk pengujian.\n\n## Heading internal\n\n'+Array.from({length:30},(_,i)=>`Paragraf ${i+1}. Perjalanan tokoh sintetis menuju halaman berikutnya. Tidak berasal dari karya penulis.`).join('\n\n');
const title=`Bab ${number} — Judul panjang tentang perjalanan malam yang melewati batas kota`;
const data={episodeNumber:number,title,arc:'Arc II — Perjalanan panjang menuju kota',content};
function EditorFixture(){
 const {theme}=useUiTheme();
 const [ep,setEp]=useState<Episode>({id:'00000000-0000-4000-8000-000000000012',book_id:'synthetic',episode_number:12,title:'Judul metadata usang',arc_title:'Arc usang',content_md:'',is_enabled:false,release_at:null,created_at:'2026-01-01T00:00:00Z',updated_at:'2026-01-01T00:00:00Z'});
 const book:Book={id:'synthetic',slug:'synthetic',title:'Synthetic QA',synopsis:'',genre:'Fiksi',cover_url:null,status:'ongoing',is_published:false,is_featured:false,created_at:ep.created_at,updated_at:ep.updated_at};
 return <div className="studio-app v6-studio-app" data-kk-theme={theme}><ChapterEditorLoader ep={ep} book={book} onUpdate={setEp} onDelete={async()=>{}}/></div>;
}
function Guard(){useLeaveGuard(true,()=>window.confirm('Tinggalkan perubahan?'));return <button onClick={()=>navigate('?mode=guard&step=next')}>Navigasi</button>;}
installNavigation();cleanPreviewStorage();
createRoot(document.getElementById('root')!).render(<><PwaExperience/>{mode==='import'?<div className="studio-app" data-kk-theme="light"><main className="studio-content"><ManuscriptImporter books={[]} episodes={[]} onChanged={async()=>{}}/></main></div>:mode==='editor'?<EditorFixture/>:mode==='detail'?<PublicLibrary path="/cerita/synthetic"/>:mode==='guard'?<Guard/>:mode==='public'?<SecureReaderApp bookId="synthetic" bookTitle="Synthetic QA" episodeNumber={number} onExit={()=>{}}/>:mode==='toc'?<div className="quiet-app"><ContentsPanel chapters={[0,12,48,9999].map(n=>({id:`fixture-${n}`,title:`Bab ${n} — Judul panjang yang tetap sejajar saat berpindah baris pada layar kecil`,arc:'Arc II — Judul arc panjang',displayNumber:n,paragraphs:[],plainParagraphs:[],plainText:'',level:2,wordCount:0,estimatedMinutes:0,startPageIndex:0}))} currentChapterId="fixture-12" bookmarks={[]} completedEpisodeNumbers={[48]} theme={THEMES.white} onClose={()=>{}} onChapter={()=>{}} onBookmark={()=>{}} onDeleteBookmark={()=>{}}/></div>:<ReaderApp bookId="preview-synthetic" bookTitle="Synthetic QA" episodeNumber={number} previewStory={{id:'preview-synthetic',title:'Synthetic QA',path:'',content,previewEpisode:data}} onExit={()=>{}}/>}</>);
