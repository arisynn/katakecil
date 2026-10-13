import { useEffect, useState } from 'react';
import type { ReaderViewport } from '../utils/readerLayout';

function safeInsets() {
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)';
  document.body.appendChild(probe);
  const style = getComputedStyle(probe);
  const top = Number.parseFloat(style.paddingTop) || 0;
  const bottom = Number.parseFloat(style.paddingBottom) || 0;
  probe.remove();
  return { safeTop: top, safeBottom: bottom };
}

export function readReaderViewport(): ReaderViewport {
  const visual = window.visualViewport;
  // Native browser zoom must not cause a pagination jump during a pinch.
  const useVisual = visual && Math.abs(visual.scale - 1) < .02;
  return {
    width: Math.max(1, Math.round(useVisual ? visual.width : window.innerWidth)),
    height: Math.max(1, Math.round(useVisual ? visual.height : window.innerHeight)),
    ...safeInsets(),
  };
}

/** Handles Chrome collapsing toolbar, orientation, and browser fullscreen. */
export function useReaderViewport(): ReaderViewport {
  const [view, setView] = useState(readReaderViewport);
  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = readReaderViewport();
        setView(prev => prev.width === next.width && prev.height === next.height &&
          prev.safeTop === next.safeTop && prev.safeBottom === next.safeBottom ? prev : next);
      });
    };
    const visual = window.visualViewport;
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    document.addEventListener('fullscreenchange', update);
    visual?.addEventListener('resize', update);
    visual?.addEventListener('scroll', update);
    update();
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      document.removeEventListener('fullscreenchange', update);
      visual?.removeEventListener('resize', update);
      visual?.removeEventListener('scroll', update);
    };
  }, []);
  return view;
}
