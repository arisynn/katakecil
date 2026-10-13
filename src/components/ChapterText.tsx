import React from 'react';
import type { Chapter } from '../types/reader';
import { readerHeading } from '../utils/readerHeading';

/** One DOM content tree shared by the pagination measurer and visible reader. */
export function ChapterText({ chapter, hideIntro=false }: { chapter: Chapter; hideIntro?: boolean }) {
  const inline = (text: string) => text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|_[^_]+_|`[^`]+`)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>;
    if (part.startsWith('*') && part.endsWith('*')) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith('_') && part.endsWith('_')) return <em key={index}>{part.slice(1, -1)}</em>;
    if (part.startsWith('`') && part.endsWith('`')) return <span key={index}>{part.slice(1, -1)}</span>;
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
  const heading = readerHeading(chapter.title, chapter.displayNumber);
  return (
    <div className="chapter-content">
      {!hideIntro && <div className="chapter-intro">
        <div className="chapter-arc">{heading.eyebrow}</div>
        {heading.title && <h2>{heading.title}</h2>}
      </div>}
      {chapter.paragraphs.map((p, i) => <p key={i} data-paragraph-index={i}>{inline(p)}</p>)}
    </div>
  );
}
