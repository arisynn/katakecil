import { useLayoutEffect, useState } from 'react';
import { readerMenuPlacement, type ReaderMenuPlacement } from '../utils/readerLayout';

const initial: ReaderMenuPlacement = { scale: .68, offsetY: 0 };

/** The menu is measured from rendered controls; no magic vh offsets. */
export function useReaderMenuPlacement(active: boolean, width: number, height: number, bookWidth: number): ReaderMenuPlacement {
  const [placement, setPlacement] = useState(initial);
  useLayoutEffect(() => {
    if (!active) return;
    const shell = document.querySelector<HTMLElement>('.quiet-app');
    const header = shell?.querySelector<HTMLElement>('.reader-control-header');
    const footer = shell?.querySelector<HTMLElement>('.reader-control-footer');
    if (!shell || !header || !footer) return;
    let frame = 0;
    const calculate = () => {
      const host = shell.getBoundingClientRect();
      const top = header.getBoundingClientRect().bottom - host.top;
      const bottom = footer.getBoundingClientRect().top - host.top;
      const next = readerMenuPlacement(height, bookWidth, height, width, top, bottom);
      setPlacement(prev => prev.scale === next.scale && prev.offsetY === next.offsetY ? prev : next);
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(calculate);
    };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    observer?.observe(header);
    observer?.observe(footer);
    // useLayoutEffect measures before the first menu frame, preventing a jump.
    calculate();
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [active, width, height, bookWidth]);
  return placement;
}
