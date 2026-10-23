import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ApplicationExperience from './features/app/ApplicationExperience';
import './index.css';
import './design/v72.css';
import './design/v73.css';
import './design/v74.css';
import './design/v75.css';
import NativeStartup from './native/NativeStartup';
import {installNavigation} from './utils/nav';
import {cleanPreviewStorage} from './utils/privacy';
import {isNativeApp} from './native/platform';
import NativeUpdatePrompt from './native/NativeUpdatePrompt';
installNavigation();
if (isNativeApp) {
  void import('./native/android').then(m => m.installAndroidIntegration()).catch(console.error);
}
cleanPreviewStorage();

createRoot(document.getElementById('root')!).render(<><ApplicationExperience/><App /><NativeStartup/><NativeUpdatePrompt/></>);
