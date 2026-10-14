/** Reader-only collection. Stores opaque book IDs, never manuscript content. */
import { useEffect, useState } from 'react';
const KEY = 'katakecil:v6:collection';
function read(): string[] {
  try { const value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value.filter((x): x is string => typeof x === 'string').slice(0, 500) : []; }
  catch { return []; }
}
export function useCollection() {
  const [ids, setIds] = useState<string[]>(read);
  useEffect(() => {
    const sync = () => setIds(read());
    window.addEventListener('storage', sync);
    window.addEventListener('katakecil:collection', sync);
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('katakecil:collection', sync); };
  }, []);
  const toggle = (id: string) => {
    const current = read();
    const next = current.includes(id) ? current.filter(x => x !== id) : [...current, id];
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* private mode */ }
    setIds(next);
    window.dispatchEvent(new Event('katakecil:collection'));
  };
  return { ids, toggle, has: (id: string) => ids.includes(id) };
}
