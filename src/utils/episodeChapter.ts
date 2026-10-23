import {plainMarkdown} from './pagination';
import type {Chapter,ReaderBlock} from '../types/reader';

/** The full episode must remain ONE measured chapter. Markdown headings inside
 * the manuscript are text, not new network/page boundaries, so no later
 * paragraphs can disappear when rendering a released episode.
 */
export function chapterFromEpisode(episodeNumber:number,title:string,arc:string,markdown:string,blocks?:ReaderBlock[]):Chapter {
  const paragraphs=blocks?blocks.map(block=>block.text):markdown.replace(/\r\n?/g,'\n').split(/\n\s*\n/)
    .map(block=>block.trim().split(/\n/).map(line=>line.trim().replace(/^#{1,6}\s+/,'')).filter(Boolean).join(' '))
    .filter(Boolean);
  const plainParagraphs=blocks?blocks.map(block=>block.text):paragraphs.map(plainMarkdown);
  const plainText=plainParagraphs.join('\n\n');
  const wordCount=plainText.trim().split(/\s+/).filter(Boolean).length;
  return {id:`secure-episode-${episodeNumber}-part-0`,title,arc,displayNumber:episodeNumber,paragraphs,blocks,
    plainParagraphs,plainText,level:2,wordCount,estimatedMinutes:Math.max(1,Math.ceil(wordCount/220)),startPageIndex:0};
}
