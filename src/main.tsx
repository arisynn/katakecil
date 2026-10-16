import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import PwaExperience from './features/pwa/PwaExperience';
import './index.css';
import './design/v72.css';
import './design/v73.css';
import './design/v74.css';
import {installNavigation} from './utils/nav';
import {cleanPreviewStorage} from './utils/privacy';
installNavigation();
cleanPreviewStorage();

createRoot(document.getElementById('root')!).render(<><PwaExperience/><App /></>);
