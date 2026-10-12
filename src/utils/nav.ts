export function navigate(path: string) {
  if (window.location.pathname !== path) window.history.pushState({}, '', path);
  window.dispatchEvent(new Event('quiet:navigate'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}
