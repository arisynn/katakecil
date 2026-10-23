import React, { useLayoutEffect, useRef } from 'react';
import { ChapterText } from './ChapterText';
import { textStyles, type ReaderGeometry } from './ReaderPage';
import type { Chapter, ReadingSettings } from '../types/reader';

interface Props {
  chapters: Chapter[];
  settings: ReadingSettings;
  geometry: ReaderGeometry;
  hideIntro?: boolean;
  onMeasured: (counts: number[], nodes: HTMLElement[]) => void;
}

export function PageMeasurer({ chapters, settings, geometry, onMeasured, hideIntro=false }: Props) {
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled || refs.current.length !== chapters.length) return;
      const nodes = refs.current.filter((n): n is HTMLDivElement => !!n);
      if (nodes.length !== chapters.length) return;
      const counts = nodes.map(node => Math.max(1, Math.ceil((node.scrollWidth - 1) / Math.max(1, geometry.bodyWidth))));
      onMeasured(counts, nodes);
    };
    const images=refs.current.flatMap(node=>Array.from(node?.querySelectorAll('img')||[]));
    images.forEach(image=>{image.addEventListener('load',measure);image.addEventListener('error',measure);});
    measure();
    document.fonts?.ready.then(measure).catch(() => {});
    return () => { cancelled = true;images.forEach(image=>{image.removeEventListener('load',measure);image.removeEventListener('error',measure);}); };
  }, [chapters, geometry.bodyWidth, geometry.bodyHeight, settings.fontSize, settings.fontFamily, settings.lineHeight, settings.textAlign, onMeasured, hideIntro]);
  return <div className="reader-measure-host" aria-hidden="true">
    {chapters.map((chapter, i) => <div key={chapter.id} ref={node => { refs.current[i] = node; }} className="reader-columns" style={{ ...textStyles(settings), '--reader-body-height': `${geometry.bodyHeight}px`, width: geometry.bodyWidth, height: geometry.bodyHeight, columnWidth: geometry.bodyWidth } as React.CSSProperties}><ChapterText chapter={chapter} hideIntro={hideIntro}/></div>)}
  </div>;
}
