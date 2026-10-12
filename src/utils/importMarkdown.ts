/** Parse one episode `.md` or a whole ARC manuscript containing `### Episode N — Name` headings.
 * Runs ONLY in the authenticated Studio. Content is NEVER bundled into the public build.
 */
export type ImportedEpisode = { episode_number: number | null; arc_title: string; title: string; content_md: string };
export function parseMarkdownUpload(source: string, filename: string): ImportedEpisode[] {
  const markdown = source.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  const arcTitle = markdown.match(/^##\s+(ARC\b[^\n]+)$/im)?.[1]?.trim() ?? '';
  const heads = [...markdown.matchAll(/^#{1,3}\s+(?:Episode|Bab)\s+(\d+)\s*(?:[—–:\-.]\s*)?([^\n]*)$/gim)];
  if (heads.length) return heads.map((m, i) => ({
    episode_number: Number(m[1]),
    arc_title: arcTitle,
    title: `Episode ${m[1]}${m[2]?.trim() ? ` — ${m[2].trim()}` : ''}`,
    content_md: markdown.slice(m.index! + m[0].length, i + 1 < heads.length ? heads[i+1].index! : markdown.length)
      .replace(/^##\s+ARC\b[^\n]*\n*/gim, '').trim(),
  }));
  return [{
    episode_number: null,
    arc_title: arcTitle,
    title: filename.replace(/\.(?:md|txt)$/i,'').replace(/^\d+[\s_.-]+/,'').replace(/[_-]/g,' ').slice(0,180).trim() || 'Episode baru',
    content_md: markdown.replace(/^#{1,3}\s+[^\n]+\n+/, '').trim(),
  }];
}
