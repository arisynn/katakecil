export type ThemeMode = 'white' | 'night';
export type FontFamily = 'literata' | 'sans' | 'merriweather' | 'mono';
export type LineHeight = 'compact' | 'normal' | 'loose';
export type MarginWidth = 'narrow' | 'normal' | 'wide';
export type TextAlign = 'left' | 'justify';
export type SpreadMode = 'single' | 'spread';

export interface ThemeColors {
  name: ThemeMode;
  label: string;
  bg: string;
  pageBg: string;
  text: string;
  secondaryText: string;
  border: string;
  barBg: string;
  accent: string;
  accentHover: string;
  hoverBg: string;
  cardBg: string;
  selectionBg: string;
}
export interface ReadingSettings {
  theme: ThemeMode;
  fontFamily: FontFamily;
  fontSize: number;
  lineHeight: LineHeight;
  marginWidth: MarginWidth;
  textAlign: TextAlign;
  spreadMode: SpreadMode;
}
export type ReaderInline={text:string;bold?:boolean;italic?:boolean;code?:boolean;script?:'sup'|'sub';href?:string;internal?:string};
export type ReaderBlock={kind:'text'|'heading'|'image'|'quote'|'pre';text:string;nodes:ReaderInline[];image?:{src:string;alt:string;width:number;height:number}};
export interface Chapter {
  id: string;
  title: string;
  arc?: string;
  /** Episode number for the displayed heading; never used to renumber stored data. */
  displayNumber?: number;
  paragraphs: string[];
  blocks?: ReaderBlock[];
  plainParagraphs: string[];
  plainText: string;
  level: number;
  wordCount: number;
  estimatedMinutes: number;
  startPageIndex: number;
}
export interface ParsedBook {
  title: string;
  chapters: Chapter[];
}
export interface PageLocation {
  chapterIndex: number;
  columnIndex: number;
}
export interface TextAnchor {
  chapterId: string;
  offset: number;
}
export interface Bookmark {
  id: string;
  anchor: TextAnchor;
  chapterTitle: string;
  snippet: string;
  createdAt: string;
}
export interface StoryFile {
  id: string;
  title: string;
  path: string;
  content: string;
  episodeNumbers?: number[];
  previewEpisode?: {episodeNumber:number;title:string;arc:string;content:string};
}
