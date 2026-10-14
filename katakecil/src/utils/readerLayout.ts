import type { ReaderGeometry } from '../components/ReaderPage';
import type { ReadingSettings } from '../types/reader';

export interface ReaderViewport {
  width: number;
  height: number;
  safeTop: number;
  safeBottom: number;
}

/** Single geometry contract for the secure reader and author preview.
 * The measured columns and the rendered leaf MUST use the same dimensions. */
export function readerGeometry(view: ReaderViewport, settings: ReadingSettings): ReaderGeometry {
  const spread = settings.spreadMode === 'spread' && view.width >= 1024;
  const maxWidth = Math.min(view.width, spread ? 1230 : 740);
  const leafWidth = Math.max(1, spread ? (maxWidth - 16) / 2 : maxWidth);
  const mobile = view.width < 600;
  const margin = { narrow: .8, normal: 1, wide: 1.4 }[settings.marginWidth];
  const basePadding = mobile ? Math.min(24, Math.max(16, view.width * .045)) : Math.min(54, Math.max(28, view.width * .038));
  const paddingX = Math.min(76, Math.round(basePadding * margin));
  const paddingTop = Math.max(mobile ? 16 : 24, view.safeTop + (mobile ? 8 : 12));
  const paddingBottom = Math.max(8, view.safeBottom + 4);
  const footerHeight = 20;
  const footerGap = 6;
  return {
    leafWidth,
    bodyWidth: Math.max(1, leafWidth - 2 * paddingX),
    bodyHeight: Math.max(96, view.height - paddingTop - paddingBottom - footerHeight - footerGap),
    pageHeight: view.height,
    paddingX,
    paddingTop,
    paddingBottom,
    footerHeight,
    footerGap,
  };
}

export interface ReaderMenuPlacement { scale: number; offsetY: number }

/** Center the minimized book in the ACTUAL free space between the controls. */
export function readerMenuPlacement(
  viewportHeight: number,
  bookWidth: number,
  bookHeight: number,
  viewportWidth: number,
  headerBottom: number,
  footerTop: number,
): ReaderMenuPlacement {
  const gap = 14;
  const top = Math.max(0, headerBottom + gap);
  const bottom = Math.min(viewportHeight, footerTop - gap);
  const availableHeight = Math.max(1, bottom - top);
  const availableWidth = Math.max(1, viewportWidth - 32);
  const scale = Math.max(.20, Math.min(.84, availableHeight / Math.max(1, bookHeight), availableWidth / Math.max(1, bookWidth)));
  const center = (top + bottom) / 2;
  return { scale: Number(scale.toFixed(4)), offsetY: Number((center - viewportHeight / 2).toFixed(2)) };
}
