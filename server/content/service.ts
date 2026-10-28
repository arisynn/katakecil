import {Buffer} from 'node:buffer';
import { createClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";
import sanitizeHtml from "sanitize-html";
import { marked } from "marked";
import { readEpubConfig, serverDom, type EpubConfig } from "../epub/service.ts";
import { openEpub } from "../../src/features/epub/archive.ts";
export { readEpubConfig };
export function safeHtml(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [
      "p",
      "div",
      "section",
      "article",
      "h1",
      "h2",
      "h3",
      "h4",
      "strong",
      "b",
      "em",
      "i",
      "u",
      "s",
      "blockquote",
      "pre",
      "code",
      "br",
      "hr",
      "ul",
      "ol",
      "li",
      "a",
      "img",
      "figure",
      "figcaption",
      "sup",
      "sub",
      "table",
      "thead",
      "tbody",
      "tr",
      "th",
      "td",
    ],
    allowedAttributes: {
      a: ["href", "rel", "target", "data-epub-href"],
      img: ["src", "alt", "width", "height"],
      "*": ["dir", "id"],
    },
    allowedSchemes: ["https"],
    allowedSchemesByTag: { img: ["data"] },
    allowProtocolRelative: false,
    transformTags: {
      a: (_tag, attrs) => ({ tagName: "a", attribs: { ...attrs, rel: "noopener noreferrer", target: "_blank" } }),
    },
    exclusiveFilter: (frame) =>
      frame.tag === "img" && !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(frame.attribs.src || ""),
  });
}
export function contentRepository(config: EpubConfig) {
  const options = { auth: { persistSession: false, autoRefreshToken: false } },
    reader = createClient(config.url, config.publicKey, options),
    admin = createClient(config.url, config.secretKey, options);
  return {
    async release(id: string) {
      const { data, error } = await reader
        .from("qr_studio_releases")
        .select("*,book:qr_books!inner(id,is_published,deleted_at)")
        .eq("id", id)
        .eq("is_enabled", true)
        .lte("release_at", new Date().toISOString())
        .eq("book.is_published", true)
        .is("book.deleted_at", null)
        .maybeSingle();
      if (error) throw Error("Unavailable");
      return data;
    },
    async version(id: string, section: string) {
      const { data, error } = await admin
        .from("qr_studio_versions")
        .select("document")
        .eq("id", id)
        .eq("section_id", section)
        .single();
      if (error) throw Error("Unavailable");
      return data.document as Record<string, any>;
    },
    async file(bucket: string, path: string) {
      const { data, error } = await admin.storage.from(bucket).download(path);
      if (error || !data) throw Error("Unavailable");
      return data;
    },
  };
}
type Repository = ReturnType<typeof contentRepository>;
const visible = (r: any) =>
  r?.is_enabled && r.release_at && Date.parse(r.release_at) <= Date.now() && r.book?.is_published && !r.book.deleted_at;
export async function contentRequest(request: Request, config: EpubConfig | null, provided?: Repository) {
  const origin = request.headers.get("origin"),
    allowed = config && origin && [config.origin, "https://localhost"].includes(origin);
  const headers: Record<string, string> = {
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    Vary: "Origin",
  };
  if (allowed) headers["Access-Control-Allow-Origin"] = origin!;
  const reply = (status: number, body: unknown) => Response.json(body, { status, headers });
  if (!config) return reply(503, { error: "Layanan baca belum dikonfigurasi." });
  if (origin && !allowed) return reply(403, { error: "Origin tidak diizinkan." });
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: { ...headers, "Access-Control-Allow-Methods": "GET,OPTIONS" } });
  if (request.method !== "GET") return reply(405, { error: "Gunakan GET." });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) return reply(400, { error: "Identitas tidak valid." });
  try {
    const repo = provided ?? contentRepository(config),
      release = await repo.release(id);
    if (!visible(release)) return reply(404, { error: "Bagian belum terbit." });
    const doc = await repo.version(release.version_id, id);
    let html = doc.content_html || "",
      markdown = doc.content_md || "";
    if (doc.source) {
      const source = doc.source;
      if (
        !["studio-sources", "book-epubs"].includes(source.bucket) ||
        !source.path.startsWith(release.book_id + "/") ||
        !Array.isArray(source.indices) ||
        source.indices.length > 600
      )
        throw Error("Invalid source");
      const file = await repo.file(source.bucket, source.path);
      if (
        file.size !== source.byte_size ||
        file.size > 18_000_000 ||
        createHash("sha256")
          .update(Buffer.from(await file.arrayBuffer()))
          .digest("hex") !== source.sha256
      )
        throw Error("Integrity");
      const archive = await openEpub(file, serverDom);
      const chunks = [];
      for (const range of source.ranges ??
        source.indices.map((index: number) => ({
          start: archive.metadata.toc[index].href,
          end: archive.metadata.toc[index + 1]?.href ?? null,
        }))) {
        const rendered = await archive.renderRange(range.start, range.end);
        chunks.push(rendered.html);
        rendered.dispose();
      }
      html = chunks.join("\n");
      markdown = "";
    }
    const current = await repo.release(id);
    if (!visible(current) || current.version_id !== release.version_id)
      return reply(404, { error: "Bagian telah berubah." });
    const result = {
      html: safeHtml(html || (marked.parse(markdown, { async: false }) as string)),
      markdown,
      title: release.title,
      kind: release.kind,
      displayNumber: release.display_number,
      sourceVersion: release.version_id,
    };
    if (Buffer.byteLength(JSON.stringify(result)) > 4_500_000) return reply(413, { error: "Bagian terlalu besar." });
    return reply(200, result);
  } catch {
    return reply(503, { error: "Bacaan belum dapat dimuat. Coba lagi." });
  }
}
