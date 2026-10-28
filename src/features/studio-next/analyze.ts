import { titleInfo, filenameNumber } from "../../utils/importStructure";
import { readZip } from "../import/readZip";
import { openEpub, type EpubDom } from "../epub/archive";
import { inferKind, contentIssues, cleanLeadingTitle, plain, type Candidate, type EpubSource } from "./model";
export type Analysis = {
  title: string;
  parts: Candidate[];
  notes: string[];
  groups?: string[];
  cover?: { data: Blob; name: string };
};
function candidate(title: string, body: string, origin: string, number: number | null = null): Candidate {
  const kind = inferKind(title, origin),
    clean = title.replace(/^(\d{1,4})[ _.-]+/, "").trim() || title;
  const part: Candidate = {
    key: crypto.randomUUID(),
    title: clean,
    kind,
    display_number: kind === "chapter" ? number : null,
    arc_title: "",
    content_md: cleanLeadingTitle(body, clean),
    source: null,
    include: true,
    issues: [],
    reviewed: false,
    origin,
  };
  part.issues = contentIssues(part);
  return part;
}
export function analyzeText(text: string, name: string): Candidate[] {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const marks: { at: number; end: number; title: string; level: number }[] = [];
  let offset = 0,
    fence = "";
  for (const line of normalized.split("\n")) {
    const marker = /^\s*(`{3,}|~{3,})/.exec(line);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (fence === marker[1][0]) fence = "";
    } else if (!fence) {
      const heading = /^ {0,3}(#{1,6})\s+(.+)$/.exec(line);
      if (heading)
        marks.push({ at: offset, end: offset + line.length, title: heading[2].trim(), level: heading[1].length });
      else if (
        /\.txt$/i.test(name) &&
        /^(?:bab|episode|chapter|prolog|epilog|arc|bagian|kata pengantar|hak cipta|tentang penulis)\b/i.test(line)
      )
        marks.push({ at: offset, end: offset + line.length, title: line.trim(), level: 1 });
    }
    offset += line.length + 1;
  }
  marks.sort((a, b) => a.at - b.at);
  const first = marks[0],
    later = marks.slice(1),
    firstIsBook = Boolean(
      first &&
        inferKind(first.title) === "chapter" &&
        titleInfo(first.title).kind === "other" &&
        (later.some((m) => m.level > first.level || titleInfo(m.title).kind === "chapter") ||
          Boolean(later[0] && !normalized.slice(first.end, later[0].at).trim())),
    );
  const depth = Math.min(...marks.filter((m) => !firstIsBook || m !== first).map((m) => m.level));
  const boundaries = marks.filter(
    (m) =>
      (!firstIsBook || m !== first) &&
      (m.level === depth || inferKind(m.title) !== "chapter" || titleInfo(m.title).kind === "chapter"),
  );
  const out: Candidate[] = [];
  const prefix = normalized.slice(firstIsBook ? first.end : 0, boundaries[0]?.at ?? normalized.length).trim();
  if (prefix || !boundaries.length) {
    const title = firstIsBook
      ? first.title
      : name
          .split("/")
          .at(-1)!
          .replace(/\.[^.]+$/, "")
          .replace(/_/g, " ");
    const part = candidate(title, prefix, name, filenameNumber(name));
    if (boundaries.length) {
      part.title = "Pembuka sebelum bab";
      part.issues.push("Teks sebelum batas bab pertama. Pastikan jenisnya.");
    }
    out.push(part);
  }
  for (const [i, m] of boundaries.entries()) {
    const info = titleInfo(m.title);
    out.push(
      candidate(m.title, normalized.slice(m.end, boundaries[i + 1]?.at ?? normalized.length), name, info.number),
    );
  }
  const work = /^(?:readme|outline|laporan|audit|sinopsis|rencana|catatan revisi)(?:\b|[_ -])/i.test(
    name.split("/").at(-1) || "",
  );
  return out.map((p) => ({ ...p, include: !work }));
}
const dom = (): EpubDom => ({
  parse: (s) => new DOMParser().parseFromString(s, "application/xml"),
  create: () => document.implementation.createHTMLDocument(""),
  serialize: (body) => body.innerHTML,
  imageUrl: (blob) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(r.error);
      r.readAsDataURL(blob);
    }),
  revoke: () => {},
});
export async function analyzeFiles(
  files: File[],
  signal: AbortSignal,
  progress: (value: string) => void,
): Promise<Analysis> {
  const result: Analysis = {
    title: files[0]?.name.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ") || "Cerita baru",
    parts: [],
    notes: [],
  };
  for (const file of [...files].sort((a, b) => a.name.localeCompare(b.name, "id", { numeric: true }))) {
    if (signal.aborted) throw new DOMException("Dibatalkan", "AbortError");
    progress(`Membaca ${file.name}…`);
    if (file.size > 20_000_000) throw Error(`${file.name}: maksimal 20 MB.`);
    if (/\.epub$/i.test(file.name)) {
      if (files.length > 1) throw Error("Pilih satu EPUB untuk satu karya. TXT/MD dapat dipilih sekaligus.");
      const archive = await openEpub(file, dom());
      result.title = archive.metadata.title;
      const cover = await archive.cover();
      if (cover) result.cover = { data: cover, name: "sampul-epub.png" };
      for (const [index, item] of archive.metadata.toc.entries()) {
        if (signal.aborted) throw new DOMException("Dibatalkan", "AbortError");
        progress(`Memeriksa bagian ${index + 1} dari ${archive.metadata.toc.length}…`);
        const rendered = await archive.renderSection(index);
        const root = new DOMParser().parseFromString(rendered.html, "text/html");
        const title = item.title,
          rawText = root.body.innerText || root.body.textContent || "",
          part = candidate(title, rawText, file.name);
        let inferredKind = item.kind ?? inferKind(title, item.href);
        const wordCount = plain(part.content_md).split(/\s+/).filter(Boolean).length;
        const hasImage = Boolean(root.querySelector("img,svg,image"));
        if (
          inferredKind === "chapter" &&
          wordCount < 4 &&
          (index === 0 || hasImage) &&
          !/^(?:bab|chapter|episode)\s+\d+/i.test(title.trim())
        ) {
          inferredKind = "page";
        }
        part.kind = inferredKind;
        part.content_html = rendered.html;
        if (!result.cover && part.kind === "page" && (/cover|sampul|halaman judul/i.test(title) || index === 0)) {
          const image = root.querySelector("img");
          if (image?.getAttribute("src")?.startsWith("data:image/"))
            result.cover = { data: await (await fetch(image.getAttribute("src")!)).blob(), name: "sampul-epub.png" };
        }
        part.source = {
          bucket: "studio-sources",
          path: "",
          sha256: "",
          byte_size: file.size,
          indices: [index],
          ranges: [{ start: item.href, end: archive.metadata.toc[index + 1]?.href ?? null }],
        } as EpubSource;
        part.issues = contentIssues(part);
        if (/^Bagian \d+$/.test(title)) part.issues.push("Judul otomatis dari EPUB; bisa diubah bila perlu.");
        // Jangan memblokir penulis saat langsung menerbitkan EPUB
        part.reviewed = true;
        result.parts.push(part);
        rendered.dispose();
      }
    } else if (/\.zip$/i.test(file.name)) {
      const parsedZip = await readZip(file, signal, progress);
      const zip = { parsed: parsedZip };
      if (zip.parsed.covers?.[0]) result.cover = { data: zip.parsed.covers[0].data, name: zip.parsed.covers[0].name };
      const folders = new Set(
        zip.parsed.chapters
          .filter((p) => p.include && p.origin.includes("/"))
          .map((p) => p.origin.split("/")[0])
          .filter((p) => !/^(arc|bagian|part)[ _-]/i.test(p)),
      );
      if (folders.size > 1) {
        result.groups = [...folders];
      }
      if (folders.size > 1)
        result.notes.push("ZIP memiliki beberapa folder. Pastikan semuanya bagian dari satu karya sebelum menyimpan.");
      for (const p of zip.parsed.chapters) {
        if (p.content_md.trim()) {
          for (const part of analyzeText("# " + p.title + "\n\n" + p.content_md, p.origin)) {
            part.arc_title = part.arc_title || p.arc_title;
            part.include = p.include;
            result.parts.push(part);
          }
        } else if (!["ignored"].includes(p.candidate_kind || "")) result.notes.push(`${p.origin}: dilewati.`);
      }
      result.notes.push(...zip.parsed.warnings);
    } else if (/\.(txt|md|markdown)$/i.test(file.name)) {
      if (file.size > 8_000_000) throw Error("TXT/MD maksimal 8 MB per file.");
      const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
      if (text.includes("\0")) throw Error("File bukan teks UTF-8.");
      result.parts.push(...analyzeText(text, file.name));
      if (files.length === 1) {
        const heading = /^#\s+(.+)$/m.exec(text);
        if (heading && !/^(bab|episode|chapter|prolog|epilog)\b/i.test(heading[1])) result.title = heading[1];
      }
    } else throw Error(`Format ${file.name} belum didukung. Gunakan EPUB, ZIP, TXT, atau MD.`);
  }
  if (!result.parts.length) throw Error("Tidak ditemukan isi buku. Periksa file yang dipilih.");
  if (result.parts.length > 1000) throw Error("Maksimal 1000 bagian per upload.");
  let number = 0;
  result.parts = result.parts.map((part) => {
    if (part.kind === "chapter") {
      number = part.display_number ?? number + 1;
      return { ...part, display_number: number };
    }
    return { ...part, display_number: null };
  });
  if (result.groups?.length) result.parts = result.parts.map((p) => ({ ...p, include: false }));
  return result;
}
