// A single history entry lets browser Back dismiss app UI before leaving the site.
// Native Android uses the same back action through Capacitor's App listener.
export function installBackNavigation(options: {
  window: Window; canGoBack: () => boolean; back: () => void; native?: boolean;
}) {
  const {window: win, canGoBack, back} = options;
  let armed = false, returning = false, destroyed = false;
  function sync() {
    if (destroyed || options.native || returning) return;
    if (canGoBack() && !armed) {
      win.history.pushState({...win.history.state, katakecilBack: true}, '');
      armed = true;
    } else if (!canGoBack() && armed) {
      armed = false; returning = true; win.history.back();
    }
  }
  function pop() {
    if (returning) { returning = false; sync(); return; }
    if (!armed) return;
    armed = false; back(); sync();
  }
  if (!options.native) {
    win.addEventListener('popstate', pop);
    if (win.history.state?.katakecilBack) { returning = true; win.history.back(); }
  }
  return {sync, back: () => { if (canGoBack()) back(); sync(); }, destroy() {
    destroyed = true; win.removeEventListener('popstate', pop);
  }};
}
