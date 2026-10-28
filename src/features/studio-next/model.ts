export type SectionKind = "chapter" | "prologue" | "epilogue" | "page" | "divider";
export type EpubSource = {
  bucket: string;
  path: string;
  sha256: string;
  byte_size: number;
  indices: number[];
  ranges?: { start: string; end: string | null }[];
};
export type ContentDocument = {
  title: string;
  arc_title: string;
  kind: SectionKind;
  display_number: number | null;
  content_md: string;
  content_html?: string;
  source: EpubSource | null;
};
export type ContentItem = ContentDocument & {
  id: string;
  book_id: string;
  reader_number: number;
  position: number;
  revision: number;
  deleted_at: string | null;
  updated_at: string;
  release_at: string | null;
  published_revision: number | null;
  is_enabled: boolean;
};
export type Candidate = ContentDocument & {
  key: string;
  include: boolean;
  issues: string[];
  reviewed: boolean;
  origin: string;
};
export const kindNames: Record<SectionKind, string> = {
  chapter: "Bab",
  prologue: "Prolog",
  epilogue: "Epilog",
  page: "Halaman buku",
  divider: "Pemisah bagian",
};
export const narrative = (kind: SectionKind) => ["chapter", "prologue", "epilogue"].includes(kind);
export function inferKind(title: string, path = ""): SectionKind {
  const value = title.trim().replace(/^#+\s*/, "");
  if (/^(prolog|prologue)\b/i.test(value)) return "prologue";
  if (/^(epilog|epilogue)\b/i.test(value)) return "epilogue";
  if (/^(arc|bagian|part|volume|jilid)\s+[\divxlcdm]+\b/i.test(value)) return "divider";
  if (
    /^(sampul|cover|halaman judul|title\s*page|half\s*title|hak cipta|copyright|kata pengantar|pengantar|prakata|preface|foreword|dedikasi|persembahan|dedication|ucapan terima kasih|acknowledg|tentang penulis|about (the )?author|catatan penulis|catatan akhir|daftar isi|contents|toc|kolofon|colophon|imprint)\b/i.test(
      value,
    )
  )
    return "page";
  if (
    path &&
    /^(cover|titlepage|copyright|toc|preface|foreword|dedication|acknowledgments|about[-_ ]author)\b/i.test(
      path.split("/").at(-1) ?? "",
    )
  )
    return "page";
  return "chapter";
}
export function plain(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/[#*_`>~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function normalizedTitle(value: string) {
  return plain(value)
    .normalize("NFC")
    .toLocaleLowerCase("id-ID")
    .replace(/[\p{P}\p{S}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}
export function cleanLeadingTitle(body: string, title: string) {
  const lines = body
    .replace(/^\uFEFF/, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .split("\n");
  if (lines.length && normalizedTitle(lines[0]) === normalizedTitle(title)) lines.shift();
  return lines.join("\n").trim();
}
export function contentIssues(doc: ContentDocument): string[] {
  const text = plain(cleanLeadingTitle(doc.content_md, doc.title));
  if (!doc.title.trim()) return ["Judul belum diisi."];
  if (narrative(doc.kind) && !text) return ["Bagian ini hanya berisi judul atau belum memiliki naskah."];
  if (narrative(doc.kind) && text.split(/\s+/).length < 4)
    return ["Naskah sangat pendek. Pastikan ini memang isi cerita."];
  return [];
}
export function heading(kind: SectionKind, title: string, number?: number | null) {
  if (kind === "chapter")
    return {
      eyebrow: number == null ? "CERITA" : `BAB ${number}`,
      title: title.replace(/^(?:bab|chapter|episode|chap\.?)\s+(?:\d+|[ivxlcdm]+)\s*[:.—–-]?\s*/i, "").trim(),
    };
  if (kind === "prologue" || kind === "epilogue")
    return {
      eyebrow: kind === "prologue" ? "PROLOG" : "EPILOG",
      title: title.replace(/^(?:prolog(?:ue)?|epilog(?:ue)?)\b\s*[:.—–-]?\s*/i, "").trim(),
    };
  return { eyebrow: kind === "divider" ? "BAGIAN" : "HALAMAN BUKU", title };
}
export function status(item: Pick<ContentItem, "release_at" | "is_enabled">) {
  return !item.is_enabled || !item.release_at
    ? "Draf"
    : Date.parse(item.release_at) > Date.now()
      ? "Terjadwal"
      : "Terbit";
}
export function documentOf(item: ContentDocument): ContentDocument {
  return {
    title: item.title,
    arc_title: item.arc_title,
    kind: item.kind,
    display_number: item.display_number,
    content_md: item.content_md,
    content_html: item.content_html || "",
    source: item.source,
  };
}
export type ReleaseSlot = { day: number; count: number };
export function releaseSlots(
  count: number,
  start: string,
  time: string,
  slots: ReleaseSlot[],
  now = Date.now(),
): string[] {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(time) || !slots.some((s) => s.count > 0))
    throw Error("Pilih tanggal, waktu, dan sedikitnya satu hari rilis.");
  const date = new Date(`${start}T${time}:00+07:00`);
  if (!Number.isFinite(date.getTime())) throw Error("Tanggal tidak valid.");
  const result: string[] = [];
  for (let day = 0; result.length < count && day < 3650; day++) {
    const when = new Date(date.getTime() + day * 86400000),
      weekday = new Date(when.getTime() + 7 * 3600000).getUTCDay();
    if (when.getTime() <= now) continue;
    const number = Math.min(20, Math.max(0, slots.find((s) => s.day === weekday)?.count ?? 0));
    for (let n = 0; n < number && result.length < count; n++) result.push(when.toISOString());
  }
  if (result.length !== count) throw Error("Jadwal terlalu jauh. Kurangi jumlah isi yang dipilih.");
  return result;
}
