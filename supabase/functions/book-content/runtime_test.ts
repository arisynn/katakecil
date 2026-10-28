// @ts-types="../_shared/studio-content.d.mts"
import { contentRequest, readEpubConfig } from "../_shared/studio-content.mjs";

const assert = (condition: unknown, message = "Assertion failed") => { if (!condition) throw Error(message); };
const id = "00000000-0000-4000-8000-000000000001";
const config = readEpubConfig({ SUPABASE_URL: "https://synthetic.supabase.co", SUPABASE_PUBLIC_KEY: "test-public-only", SUPABASE_SERVICE_ROLE_KEY: "test-server-only", EPUB_SITE_ORIGIN: "https://reader.example.test" });
const request = () => new Request(`https://synthetic.supabase.co/book-content?id=${id}`, { headers: { origin: "https://reader.example.test" } });
const release = { id, book_id: "qa", version_id: "v1", title: "Kata Pengantar", kind: "page", display_number: null, is_enabled: true, release_at: "2020-01-01T00:00:00Z", book: { is_published: true, deleted_at: null } };

Deno.test("Edge renders the frozen Markdown snapshot and rechecks publication", async () => {
  let reads = 0;
  const repo = { release: async () => { reads++; return release; }, version: async () => ({ content_md: "Teks dengan kata_di_dalam dan **tebal**.\n\n<script>attack()</script>" }), file: async () => { throw Error("Unexpected source"); } };
  const response = await contentRequest(request(), config, repo), value = await response.json();
  assert(response.status === 200 && reads === 2);
  assert(value.html.includes("kata_di_dalam") && value.html.includes("<strong>tebal</strong>") && !value.html.includes("attack"));
  assert(value.kind === "page" && value.displayNumber === null && response.headers.get("cache-control")?.includes("no-store"));
  reads = 0;
  const withdrawn = await contentRequest(request(), config, { ...repo, release: async () => ++reads === 1 ? release : null });
  assert(withdrawn.status === 404, "Withdrawal must win before returning the body");
});

Deno.test("Edge verifies intact EPUB bytes and exposes only the released anchor range", async () => {
  const bytes = await Deno.readFile(Deno.env.get("STUDIO_EPUB_FIXTURE")!);
  const sha = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))).map(b => b.toString(16).padStart(2, "0")).join("");
  const doc = { source: { bucket: "studio-sources", path: "qa/original.epub", byte_size: bytes.length, sha256: sha, indices: [0], ranges: [{ start: "OPS/all.xhtml#one", end: "OPS/all.xhtml#two" }] } };
  const repo = { release: async () => release, version: async () => doc, file: async () => new Blob([bytes], { type: "application/epub+zip" }) };
  const response = await contentRequest(request(), config, repo), value = await response.json();
  assert(response.status === 200, JSON.stringify(value));
  assert(value.html.includes("PUBLIC_FIRST_BODY") && !value.html.includes("FUTURE_SECOND_SECRET") && !value.html.includes("THIRD_SECRET_BODY"));
  assert(value.html.includes("data:image/png;base64,") && !value.html.includes("EPUB_ATTACK") && !value.html.includes("evil.test"));
  const invalid = await contentRequest(request(), config, { ...repo, file: async () => new Blob([new Uint8Array(bytes.length)]) });
  assert(invalid.status === 503, "Changed original bytes must be rejected");
});
