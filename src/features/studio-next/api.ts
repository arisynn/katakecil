import { supabase } from "../../data/supabase";
import { normalizedTitle, type ContentItem, type ContentDocument, type EpubSource } from "./model";
import type { EpubDom } from "../epub/archive";
export type Receipt = {
  book_id: string;
  request_id: string;
  changed: number;
  skipped: number;
  ids: string[];
  revision?: number;
};
export type Operation = { id: string; action: string; payload: Record<string, unknown> };
export const operation = (action: string, payload: Record<string, unknown>): Operation => ({
  id: crypto.randomUUID(),
  action,
  payload,
});
export async function mutate(op: Operation): Promise<Receipt> {
  if (!supabase) throw Error("Studio belum terhubung.");
  const { data, error } = await supabase.rpc("qr_studio_mutate", {
    p_request_id: op.id,
    p_action: op.action,
    p_payload: op.payload,
  });
  if (error) {
    if (["PGRST202", "42883"].includes(error.code))
      throw Error("Pembaruan Studio belum aktif di server. Muat ulang setelah backend selesai diperbarui.");
    throw Object.assign(Error(error.message), { code: error.code });
  }
  if (data?.request_id !== op.id)
    throw Error("Hasil simpan belum dapat dipastikan. Coba lagi dengan operasi yang sama.");
  return data;
}
export async function contents(bookId?: string, full = false): Promise<ContentItem[]> {
  if (!supabase) throw Error("Studio belum terhubung.");
  const rows: ContentItem[] = [];
  for (let start = 0; start < 10000; start += 200) {
    let query = supabase
      .from("qr_studio_contents")
      .select(
        full
          ? "*"
          : "id,book_id,reader_number,position,kind,display_number,title,arc_title,source,revision,deleted_at,updated_at",
      )
      .order("book_id")
      .order("position")
      .order("id")
      .range(start, start + 199);
    if (bookId) query = query.eq("book_id", bookId);
    const { data, error } = await query;
    if (error) throw Error(error.message);
    rows.push(
      ...(data || []).map(
        (row) =>
          ({
            ...(row as Record<string, any>),
            content_md: (row as any).content_md || "",
            content_html: (row as any).content_html || "",
            release_at: null,
            published_revision: null,
            is_enabled: false,
          }) as ContentItem,
      ),
    );
    if ((data?.length ?? 0) < 200) break;
  }
  const released: any[] = [];
  for (let start = 0; start < 10000; start += 200) {
    let query = supabase
      .from("qr_studio_releases")
      .select("id,release_at,is_enabled,published_revision")
      .order("id")
      .range(start, start + 199);
    if (bookId) query = query.eq("book_id", bookId);
    const { data, error } = await query;
    if (error) throw Error(error.message);
    released.push(...(data || []));
    if ((data?.length ?? 0) < 200) break;
  }
  const releases = new Map<string, any>(released.map((r) => [r.id, r] as [string, any]));
  return rows.map((r) => ({ ...r, ...releases.get(r.id) }));
}
export async function content(id: string): Promise<ContentItem> {
  if (!supabase) throw Error("Studio belum terhubung.");
  const { data, error } = await supabase.from("qr_studio_contents").select("*").eq("id", id).single();
  if (error || !data) throw Error(error?.message || "Bagian tidak ditemukan.");
  const { data: release } = await supabase
    .from("qr_studio_releases")
    .select("release_at,is_enabled,published_revision")
    .eq("id", id)
    .maybeSingle();
  return { ...data, ...release };
}
export async function sourceHtml(source: EpubSource) {
  if (!supabase) throw Error("Studio belum terhubung.");
  const { data, error } = await supabase.storage.from(source.bucket).download(source.path);
  if (error || !data) throw Error("Sumber EPUB belum dapat dimuat.");
  const sha = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await data.arrayBuffer())))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  if (sha !== source.sha256) throw Error("Versi sumber EPUB berubah.");
  const dom: EpubDom = {
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
  };
  const { openEpub } = await import("../epub/archive");
  const archive = await openEpub(data, dom),
    parts = [];
  for (const range of source.ranges ??
    source.indices.map((index) => ({
      start: archive.metadata.toc[index].href,
      end: archive.metadata.toc[index + 1]?.href ?? null,
    }))) {
    const section = await archive.renderRange(range.start, range.end);
    const root = new DOMParser().parseFromString(section.html, "text/html");
    const first = root.querySelector("h1,h2,h3");
    const label = archive.metadata.toc.find((t) => t.href === range.start)?.title;
    if (
      first &&
      label &&
      normalizedTitle(first.textContent || "") === normalizedTitle(label) &&
      root.body.textContent?.trim().startsWith(first.textContent?.trim() || "")
    )
      first.remove();
    parts.push(root.body.innerHTML);
    section.dispose();
  }
  return parts.join("\n");
}
export async function previewDocument(row: ContentDocument) {
  return row.source
    ? { html: await sourceHtml(row.source), markdown: row.content_md }
    : { html: row.content_html || "", markdown: row.content_md };
}
