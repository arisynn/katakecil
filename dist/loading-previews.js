import {loadingLogo} from './loading-logo.js?v=2';

// Inspect the chosen animation without artificially delaying book loading.
export function loadingPreviews(){
 return `<section class="loading-previews"><div class="loading-preview-stage">${loadingLogo()}</div></section>`;
}
