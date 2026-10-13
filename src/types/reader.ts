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
export interface Chapter {
  id: string;
  title: string;
  arc?: string;
  paragraphs: string[];
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
}
