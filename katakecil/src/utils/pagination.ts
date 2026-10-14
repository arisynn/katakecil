import type { Chapter, ParsedBook, PageLocation, TextAnchor } from '../types/reader';

export function plainMarkdown(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '$1').replace(/_([^_]+)_/g, '$1').replace(/`([^`]+)`/g, '$1');
}

/** Retain manuscript text, splitting only on existing blank lines. */
const stableId = (value: string) => value.toLocaleLowerCase('id').normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90);

export function parseMarkdown(markdown: string): ParsedBook {
  const lines = markdown.split(/\r?\n/);
  let title = 'Tanpa Judul';
  let arc = '';
  const chapters: Chapter[] = [];
  let current: { title: string; arc: string; paragraphs: string[] } | null = null;
  let pending: string[] = [];

  const flushParagraph = () => {
    if (!pending.length) return;
    if (!current) current = { title: 'Pengantar', arc, paragraphs: [] };
    current.paragraphs.push(pending.join(' ').trim());
    pending = [];
  };
  const flushChapter = () => {
    flushParagraph();
    if (!current) return;
    const paragraphs = current.paragraphs;
    const plainParagraphs = paragraphs.map(plainMarkdown);
    const plainText = plainParagraphs.join('\n\n');
    chapters.push({
      id: `chapter-${stableId(current.arc + '-' + current.title) || chapters.length + 1}`, 
      title: current.title,
      arc: current.arc,
      level: 2,
      paragraphs,
      plainParagraphs,
      plainText,
      wordCount: plainText.trim().split(/\s+/).filter(Boolean).length,
      estimatedMinutes: Math.max(1, Math.ceil(plainText.trim().split(/\s+/).filter(Boolean).length / 220)),
      startPageIndex: 0,
    });
    current = null;
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (/^#\s+/.test(line)) { flushParagraph(); title = line.replace(/^#\s+/, ''); }
    else if (/^##\s+/.test(line)) { flushChapter(); arc = line.replace(/^##\s+/, ''); }
    else if (/^###\s+/.test(line)) { flushChapter(); current = { title: line.replace(/^###\s+/, ''), arc, paragraphs: [] }; }
    else if (line === '') flushParagraph();
    else pending.push(line);
  }
  flushChapter();
  return { title, chapters };
}

/** Browser-measured chapter column counts produce global page locations. */
export function createPageMap(counts: number[]): PageLocation[] {
  return counts.flatMap((count, chapterIndex) => Array.from({ length: Math.max(1, count) }, (_, columnIndex) => ({ chapterIndex, columnIndex })));
}

/** Derive the exact visual column of a text offset using browser Range geometry. */
function columnAtOffset(container: HTMLElement, chapter: Chapter, offset: number, columnWidth: number): number {
  const paraNodes = Array.from(container.querySelectorAll<HTMLElement>('[data-paragraph-index]'));
  if (!paraNodes.length) return 0;
  let paragraphIndex = 0;
  let localOffset = Math.max(0, offset);
  for (; paragraphIndex < chapter.plainParagraphs.length - 1; paragraphIndex++) {
    const length = chapter.plainParagraphs[paragraphIndex].length;
    if (localOffset <= length) break;
    localOffset -= length + 2;
  }
  const paragraph = paraNodes[Math.min(paragraphIndex, paraNodes.length - 1)];
  if (!paragraph) return 0;
  const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT);
  let target: Text | null = null;
  let node: Text | null;
  while ((node = walker.nextNode() as Text | null)) {
    target = node;
    if (localOffset <= node.length) break;
    localOffset -= node.length;
  }
  if (!target) return 0;
  const range = document.createRange();
  range.setStart(target, Math.max(0, Math.min(localOffset, target.length)));
  range.collapse(true);
  const rect = range.getClientRects()[0];
  if (!rect) return 0;
  const relativeX = rect.left - container.getBoundingClientRect().left;
  return Math.max(0, Math.floor((relativeX + 1) / Math.max(1, columnWidth)));
}

export function anchorColumn(container: HTMLElement | null, chapter: Chapter, offset: number, width: number): number {
  return container ? columnAtOffset(container, chapter, offset, width) : 0;
}

/** Locate the first real text character on the requested page; no guessed character limits. */
export function columnAnchor(container: HTMLElement | null, chapter: Chapter, columnIndex: number, width: number): TextAnchor {
  if (!container || columnIndex <= 0 || !chapter.plainText.length) return { chapterId: chapter.id, offset: 0 };
  let low = 0;
  let high = chapter.plainText.length;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (columnAtOffset(container, chapter, mid, width) < columnIndex) low = mid + 1;
    else high = mid;
  }
  return { chapterId: chapter.id, offset: low };
}

export function getSnippet(chapter: Chapter, offset: number, length = 90): string {
  const start = Math.min(Math.max(0, offset), chapter.plainText.length);
  return chapter.plainText.slice(start, start + length).replace(/\s+/g, ' ').trim() || chapter.title;
}
