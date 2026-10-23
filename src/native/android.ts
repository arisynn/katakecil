import { registerPlugin, SystemBars, SystemBarsStyle } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { supabase } from '../data/supabase';
import { mayLeave, navigate } from '../utils/nav';
import {consumeNotificationRoute,installNotificationRouting} from './notifications';

const ReaderChrome = registerPlugin<{setBackground(options: {color: string}): Promise<void>}>('ReaderChrome');

/** Installed once, only by the native bootstrap. Browser behavior stays in the PWA. */
export async function installAndroidIntegration() {
  // Let Capacitor inset the entire viewport, including fixed reader controls, on
  // both older WebViews and Android's mandatory edge-to-edge window layout.
  const viewport = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
  viewport?.setAttribute('content', viewport.content.replace('viewport-fit=cover', 'viewport-fit=auto'));
  if ('serviceWorker' in navigator) {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
  }
  document.documentElement.dataset.nativeApp = 'android';
  const syncBars = () => {
    const dark = document.documentElement.dataset.appTheme === 'dark';
    void Promise.all([
      ReaderChrome.setBackground({color: dark ? '#081425' : '#F4F8FD'}),
      SystemBars.setStyle({ style: dark ? SystemBarsStyle.Dark : SystemBarsStyle.Light }),
    ]).catch(console.warn);
  };
  new MutationObserver(syncBars).observe(document.documentElement, { attributes: true, attributeFilter: ['data-app-theme'] });
  syncBars();

  // Never finish the activity on one accidental Back. Existing navigation guards
  // still protect an unsaved editor/import operation when history goes back.
  let handlingBack = false;
  await App.addListener('backButton', () => {
    if (handlingBack) return;
    handlingBack = true;
    void (async () => {
      try {
        const overlay = [...document.querySelectorAll<HTMLElement>('[role="dialog"],[role="menu"]')].find(el => el.getClientRects().length);
        if (overlay) {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
          return;
        }
        if (Number(history.state?.kkPosition) > 0) { history.back(); return; }
        if (location.pathname !== '/') { navigate('/'); return; }
        if (await mayLeave()) await App.minimizeApp();
      } finally { window.setTimeout(() => { handlingBack = false; }, 250); }
    })();
  });

  await installNotificationRouting().catch(console.warn);

  // Password auth uses the existing origin-scoped persistent SDK storage.
  // Refresh when resumed, including after device sleep; never remount Studio.
  await App.addListener('appStateChange', ({ isActive }) => {
    if (isActive) {supabase?.auth.startAutoRefresh();void consumeNotificationRoute().catch(console.warn);}
    else supabase?.auth.stopAutoRefresh();
  });

  document.addEventListener('click', event => {
    const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>('a[href]');
    if (!anchor || anchor.hasAttribute('download')) return;
    const url = new URL(anchor.href, location.href);
    if (url.origin !== location.origin && /^https?:$/.test(url.protocol)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      void Browser.open({ url: url.href }).catch(console.warn);
    }
  }, true);
}
