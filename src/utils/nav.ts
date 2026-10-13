export function navigate(path: string) {
  // Editors can flush pending changes before the route unmounts.
  const before = new CustomEvent('quiet:before-navigate', {
    cancelable: true,
    detail: { path },
  });
  if (!window.dispatchEvent(before)) return;
  if (window.location.pathname !== path) window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('quiet:navigate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}
