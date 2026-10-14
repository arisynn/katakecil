/** Presentation-only chapter headings. Never rewrite titles or episode records. */
export type ReaderHeading = { eyebrow: string; title: string };

export function readerHeading(title: string, episodeNumber?: number): ReaderHeading {
  const original = (title || '').trim();
  const special = /^(prolog|epilog)(?:\s*[:—–-]\s*(.*))?$/i.exec(original);
  if (special) return { eyebrow: special[1].toLocaleUpperCase('id-ID'), title: (special[2] || '').trim() };

  const validNumber = Number.isSafeInteger(episodeNumber) && (episodeNumber ?? -1) >= 0;
  const prefix = /^(?:(?:bab|episode)\s+)?(\d{1,5})(?:\s*[.:—–-]\s*|\s+)(.+)$/i.exec(original);
  const standalone = /^(?:bab|episode)\s+(\d{1,5})$/i.exec(original);
  const embeddedNumber = prefix ? Number(prefix[1]) : standalone ? Number(standalone[1]) : undefined;
  const number = validNumber ? episodeNumber! : embeddedNumber;
  const stripPrefix = prefix && (!validNumber || embeddedNumber === episodeNumber);
  const stripStandalone = standalone && (!validNumber || embeddedNumber === episodeNumber);
  return {
    eyebrow: number !== undefined ? `BAB ${number}` : 'CERITA',
    title: stripPrefix ? prefix[2].trim() : stripStandalone ? '' : original,
  };
}
