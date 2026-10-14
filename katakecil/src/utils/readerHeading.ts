import {numberValue} from './importStructure';
/** Presentation-only chapter headings. Never rewrite titles or episode records. */
export type ReaderHeading = { eyebrow: string; title: string };

export function readerHeading(title: string, episodeNumber?: number): ReaderHeading {
  const original = (title || '').trim();
  const special = /^(prolog|prologue|epilog|epilogue)(?:\s*[:—–-]\s*(.*))?$/i.exec(original);
  if (special) return { eyebrow: special[1].toLocaleUpperCase('id-ID'), title: (special[2] || '').trim() };

  const validNumber = Number.isSafeInteger(episodeNumber) && (episodeNumber ?? -1) >= 0;
  const prefix = /^(?:(?:bab|episode|chapter|chap\.?)\s+)?(\d{1,5}|[IVXLCDM]+)(?:\s*[.:—–-]\s*|\s+)(.+)$/i.exec(original);
  const standalone = /^(?:bab|episode|chapter|chap\.?)\s+(\d{1,5}|[IVXLCDM]+)$/i.exec(original);
  const embeddedNumber = prefix ? numberValue(prefix[1]) ?? undefined : standalone ? numberValue(standalone[1]) ?? undefined : undefined;
  const number = validNumber ? episodeNumber! : embeddedNumber;
  const stripPrefix = prefix && (!validNumber || embeddedNumber === episodeNumber);
  const stripStandalone = standalone && (!validNumber || embeddedNumber === episodeNumber);
  return {
    eyebrow: number !== undefined ? `BAB ${number}` : 'CERITA',
    title: stripPrefix ? prefix[2].trim() : stripStandalone ? '' : original,
  };
}
