import React from 'react';
import type { Chapter, ReaderInline } from '../types/reader';
import { readerHeading } from '../utils/readerHeading';

function richInline(node:ReaderInline,index:number){
 let content:React.ReactNode=node.text;
 if(node.script==='sup')content=<sup>{content}</sup>;else if(node.script==='sub')content=<sub>{content}</sub>;
 if(node.code)content=<code>{content}</code>;if(node.italic)content=<em>{content}</em>;if(node.bold)content=<strong>{content}</strong>;
 if(node.href)content=<a href={node.href} target="_blank" rel="noopener noreferrer">{content}</a>;
 else if(node.internal)content=<a href="#" data-reader-anchor={node.internal}>{content}</a>;
 return <React.Fragment key={index}>{content}</React.Fragment>;
}

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
      {chapter.blocks?chapter.blocks.map((block,i)=>block.kind==='image'&&block.image?
        <figure key={i} data-paragraph-index={i} className="reader-illustration"><img src={block.image.src} alt={block.image.alt} width={block.image.width} height={block.image.height} decoding="async"/><figcaption>{block.text}</figcaption></figure>:
        <p key={i} data-paragraph-index={i} className={`reader-rich-${block.kind}`}>{block.nodes.map(richInline)}</p>
      ):chapter.paragraphs.map((p, i) => <p key={i} data-paragraph-index={i}>{inline(p)}</p>)}
    </div>
  );
}
