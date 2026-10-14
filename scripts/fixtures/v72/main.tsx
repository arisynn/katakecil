// Synthetic fixtures only. Excluded from production build entry points.
import React from 'react';
import {createRoot} from 'react-dom/client';
import '../../../src/App';
import '../../../src/design/v72.css';
import PublicLibrary from '../../../src/pages/PublicLibrary';
import ReaderApp from '../../../src/ReaderApp';
import SecureReaderApp from '../../../src/SecureReaderApp';
import {ContentsPanel} from '../../../src/components/ReaderPanels';
import {THEMES} from '../../../src/utils/theme';
import ManuscriptImporter from '../../../src/pages/ManuscriptImporter';
import PwaExperience from '../../../src/features/pwa/PwaExperience';
import {installNavigation,navigate} from '../../../src/utils/nav';
import {useLeaveGuard} from '../../../src/hooks/useLeaveGuard';
import {cleanPreviewStorage} from '../../../src/utils/privacy';
const params=new URLSearchParams(location.search);const mode=params.get('mode');const number=Number(params.get('ep')??12);
const content='SENTINEL_QA_V72_PRIVATE_8372. Ini kalimat sintetis untuk pengujian.\n\n## Heading internal\n\n'+Array.from({length:30},(_,i)=>`Paragraf ${i+1}. Perjalanan tokoh sintetis menuju halaman berikutnya. Tidak berasal dari karya penulis.`).join('\n\n');
const title=`Bab ${number} — Judul panjang tentang perjalanan malam yang melewati batas kota`;
const data={episodeNumber:number,title,arc:'Arc II — Perjalanan panjang menuju kota',content};
function Guard(){useLeaveGuard(true,()=>window.confirm('Tinggalkan perubahan?'));return <button onClick={()=>navigate('?mode=guard&step=next')}>Navigasi</button>;}
installNavigation();cleanPreviewStorage();
createRoot(document.getElementById('root')!).render(<><PwaExperience/>{mode==='import'?<div className="studio-app" data-kk-theme="light"><main className="studio-content"><ManuscriptImporter books={[]} episodes={[]} onChanged={async()=>{}}/></main></div>:mode==='detail'?<PublicLibrary path="/cerita/synthetic"/>:mode==='guard'?<Guard/>:mode==='public'?<SecureReaderApp bookId="synthetic" bookTitle="Synthetic QA" episodeNumber={number} onExit={()=>{}}/>:mode==='toc'?<div className="quiet-app"><ContentsPanel chapters={[0,12,48,9999].map(n=>({id:`fixture-${n}`,title:`Bab ${n} — Judul panjang yang tetap sejajar saat berpindah baris pada layar kecil`,arc:'Arc II — Judul arc panjang',displayNumber:n,paragraphs:[],plainParagraphs:[],plainText:'',level:2,wordCount:0,estimatedMinutes:0,startPageIndex:0}))} currentChapterId="fixture-12" bookmarks={[]} completedEpisodeNumbers={[48]} theme={THEMES.white} onClose={()=>{}} onChapter={()=>{}} onBookmark={()=>{}} onDeleteBookmark={()=>{}}/></div>:<ReaderApp bookId="preview-synthetic" bookTitle="Synthetic QA" episodeNumber={number} previewStory={{id:'preview-synthetic',title:'Synthetic QA',path:'',content,previewEpisode:data}} onExit={()=>{}}/>}</>);
