import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createDatabase, author, rpc } from "./test-v75.mjs";
import { loadTs } from "./test-utils/load-ts.mjs";
const { inferKind, heading, contentIssues, cleanLeadingTitle, releaseSlots } = loadTs(
  "src/features/studio-next/model.ts",
);
const { safeHtml, contentRequest } = loadTs("server/content/service.ts");
assert.equal(inferKind("Kata Pengantar"), "page");
assert.equal(inferKind("Epilog Hal Hal Kecil"), "epilogue");
assert.equal(heading("page", "Kata Pengantar", 1).eyebrow, "HALAMAN BUKU");
assert.equal(heading("epilogue", "Epilog Hal Hal Kecil").title, "Hal Hal Kecil");
assert(contentIssues({ kind: "chapter", title: "Pulang", content_md: "Pulang" }).length);
assert.equal(cleanLeadingTitle("# Pulang\n\nAku kembali.", "Pulang"), "Aku kembali.");
assert.equal(cleanLeadingTitle("Pulang adalah hal yang kurindukan.", "Pulang"), "Pulang adalah hal yang kurindukan.");
const slots = releaseSlots(
  5,
  "2030-01-01",
  "19:00",
  [
    { day: 4, count: 1 },
    { day: 0, count: 2 },
  ],
  Date.parse("2029-01-01"),
);
assert.equal(slots.length, 5);
assert.equal(slots[1], slots[2]);
assert(slots.every((d) => new Date(Date.parse(d) + 7 * 3600000).getUTCHours() === 19));
assert(
  !safeHtml(
    '<script>attack()</script><p onclick="attack()">A<img src="https://evil.test/x"/><a href="javascript:x">B</a></p>',
  ).includes("attack"),
);
assert(!safeHtml('<img src="data:image/svg+xml;base64,AAAA"/>').includes("img"));
const db = await createDatabase();
await db.exec(
  `grant select,insert,update on qr_books to authenticated;grant select on qr_books to anon;alter table qr_books enable row level security;create policy qa_books_author on qr_books for all to authenticated using(exists(select 1 from qr_author_members where user_id=auth.uid())) with check(exists(select 1 from qr_author_members where user_id=auth.uid()));create policy qa_books_public on qr_books for select to anon using(is_published and deleted_at is null);`,
);
await db.exec(readFileSync("supabase/migrations/20261023112934_intact_epub_books.sql", "utf8"));
await db.exec(readFileSync("supabase/migrations/20261023234835_studio_workspace.sql", "utf8"));
const asAuthor = async () => {
  await db.exec("reset role");
  await db.query("select set_config('test.uid',$1,false)", [author]);
  await db.exec("set role authenticated");
};
const call = (action, payload, id = crypto.randomUUID()) =>
  rpc(db, "qr_studio_mutate", { p_request_id: id, p_action: action, p_payload: payload });
const doc = (title, kind = "chapter", body = null) => ({
  title,
  kind,
  display_number: kind === "chapter" ? 1 : null,
  arc_title: "",
  content_md: body ?? `Isi cerita ${title} yang lengkap dan bukan hanya sebuah judul.`,
  source: null,
});
await asAuthor();
const id = crypto.randomUUID(),
  payload = {
    book_id: "workspace-qa",
    new_title: "Buku Uji",
    items: [
      { document: doc("Kata Pengantar", "page") },
      { document: doc("Pulang") },
      { document: doc("Epilog Hal Hal Kecil", "epilogue") },
    ],
  };
const saved = await call("import", payload, id);
assert.equal(saved.changed, 3);
assert.deepEqual(await call("import", payload, id), saved);
await assert.rejects(call("import", { ...payload, new_title: "Different" }, id), /berbeda/);
let rows = (await db.query("select * from qr_studio_contents order by position")).rows;
const chapter = rows[1],
  page = rows[0];
assert.equal(page.display_number, null);
assert.equal(chapter.display_number, 1);
const firstRelease = {
  book_id: "workspace-qa",
  mode: "now",
  items: [
    { id: page.id, expected: 1 },
    { id: chapter.id, expected: 1 },
  ],
};
await call("release", firstRelease);
const published = (
  await db.query(
    "select v.document from qr_studio_versions v join qr_studio_releases r on r.version_id=v.id where r.id=$1",
    [chapter.id],
  )
).rows[0].document;
const edit = await call("save", {
  book_id: "workspace-qa",
  item: {
    id: chapter.id,
    expected: 1,
    document: doc("Pulang", "chapter", "Draf revisi ini belum boleh terlihat oleh pembaca."),
  },
});
assert.equal(edit.revision, 2);
assert.deepEqual(
  (
    await db.query(
      "select v.document from qr_studio_versions v join qr_studio_releases r on r.version_id=v.id where r.id=$1",
      [chapter.id],
    )
  ).rows[0].document,
  published,
  "Autosave never changes the release snapshot",
);
await assert.rejects(
  call("save", { book_id: "workspace-qa", item: { id: chapter.id, expected: 1, document: doc("Stale") } }),
  /berubah/,
);
await call("release", { book_id: "workspace-qa", mode: "apply", items: [{ id: chapter.id, expected: 2 }] });
assert.equal(
  (await db.query("select published_revision from qr_studio_releases where id=$1", [chapter.id])).rows[0]
    .published_revision,
  2,
);
await call("release", {
  book_id: "workspace-qa",
  mode: "schedule",
  items: [{ id: rows[2].id, expected: 1, release_at: "2099-01-01T12:00:00Z" }],
});
await db.exec("reset role;set role anon");
assert.equal((await db.query("select * from qr_studio_releases")).rows.length, 2);
await assert.rejects(db.query("select * from qr_studio_contents"), /permission denied/);
await assert.rejects(db.query("select * from qr_studio_versions"), /permission denied/);
await assert.rejects(db.query("select * from qr_studio_sources"), /permission denied/);
assert.equal((await db.query("select book_id from qr_studio_books")).rows.length, 1);
await asAuthor();
await call("order", { book_id: "workspace-qa", ids: rows.map((r) => r.id).reverse() });
assert.equal(
  (await db.query("select reader_number from qr_studio_contents where id=$1", [chapter.id])).rows[0].reader_number,
  chapter.reader_number,
);
const duplicate = await call("import", { ...payload, new_title: "" });
assert.equal(duplicate.skipped, 2); // chapter was revised; importing its old text is a distinct draft.
await assert.rejects(
  call("import", {
    book_id: "rollback-new",
    new_title: "Rollback",
    mode: "now",
    items: [{ document: doc("OnlyTitle", "chapter", "OnlyTitle") }],
  }),
  /hanya judul/,
);
assert.equal((await db.query("select count(*)::int n from qr_books where id='rollback-new'")).rows[0].n, 0);
await call("trash", { book_id: "workspace-qa", id: chapter.id });
await db.exec("reset role;set role anon");
assert.equal((await db.query("select * from qr_studio_releases where id=$1", [chapter.id])).rows.length, 0);
await asAuthor();
await call("restore", { book_id: "workspace-qa", id: chapter.id });
assert.equal(
  (await db.query("select is_enabled from qr_studio_releases where id=$1", [chapter.id])).rows[0].is_enabled,
  false,
);
await db.exec("reset role");
await db.query("select set_config('test.uid',$1,false)", ["00000000-0000-4000-8000-000000000099"]);
await db.exec("set role authenticated");
assert.equal((await db.query("select * from qr_studio_contents")).rows.length, 0);
await assert.rejects(call("adopt", { book_id: "workspace-qa" }), /izin penulis/);
await db.exec("reset role");
await db.exec(
  `grant select(id,book_id,episode_number,title,arc_title,is_enabled,release_at,deleted_at)on qr_episodes to authenticated;insert into qr_books(id,slug,title,is_published,deleted_at)values('legacy-adopt','legacy-adopt','Legacy',true,null);`,
);
const legacy = (
  await db.query(
    "insert into qr_episodes(book_id,episode_number,title,arc_title,content_md,is_enabled,release_at)values('legacy-adopt',5,'Lima','','Isi lama yang sudah disimpan dengan lengkap.',true,now()-interval '1 day')returning *",
  )
).rows[0];
await asAuthor();
await rpc(db, "qr_episode_save_v74", {
  p_episode_id: legacy.id,
  p_request_id: crypto.randomUUID(),
  p_expected_version: 0,
  p_document: { title: "Lima", arc: "", body: "Isi baru sebelum migrasi yang tetap harus dipertahankan." },
  p_reason: "automatic",
});
await db.exec("reset role;revoke usage on schema kk_private from authenticated");
await db.exec(readFileSync("supabase/migrations/20261023235008_studio_revision_schema_access.sql","utf8"));
await asAuthor();
await call("adopt", { book_id: "legacy-adopt" });
const adopted = (await db.query("select * from qr_studio_contents where id=$1", [legacy.id])).rows[0];
assert.equal(adopted.reader_number, 5);
assert.equal(adopted.revision, 2);
assert(adopted.content_md.includes("Isi baru"));
assert((await db.query("select * from qr_studio_versions where section_id=$1", [legacy.id])).rows.length >= 2);
await assert.rejects(
  db.query("update qr_studio_versions set document='{}'where section_id=$1", [legacy.id]),
  /permission denied/,
);
await db.exec("reset role;set role anon");
assert.equal((await db.query("select * from qr_epub_releases where book_id='legacy-adopt'")).rows.length, 0);
await db.close();
const release = {
  id: crypto.randomUUID(),
  book_id: "qa",
  version_id: crypto.randomUUID(),
  title: "Pulang",
  kind: "chapter",
  display_number: 1,
  is_enabled: true,
  release_at: "2020-01-01",
  book: { is_published: true, deleted_at: null },
};
let row = release,
  reads = 0;
const repo = {
  release: async () => row,
  version: async () => {
    reads++;
    return { content_md: "Naskah yang sudah terbit.", content_html: "<p>Naskah yang sudah terbit.</p>" };
  },
  file: async () => {
    throw Error("Unexpected original download");
  },
};
const config = {
    url: "https://synthetic.supabase.co",
    publicKey: "sb_publishable_synthetic",
    secretKey: "private-test",
    origin: "https://qa.test",
  },
  request = new Request(`https://qa.test/api/book-content?id=${release.id}`);
assert.equal((await contentRequest(request, config, repo)).status, 200);
for (const override of [{ is_enabled: false }, { release_at: "2099-01-01" }, { book: { is_published: false } }]) {
  row = { ...release, ...override };
  const before = reads;
  assert.equal((await contentRequest(request, config, repo)).status, 404);
  assert.equal(reads, before);
}
assert.equal((await contentRequest(request, null, repo)).status, 503);
console.log(
  "PASS workspace: semantic headings, body checks, Thursday/Sunday slot counts, real SQL/RLS, private drafts and immutable release snapshots, conflicts, durable idempotency, atomic publishing rollback, stable identities, duplicate handling, trash/restore, safe HTML and public HTTP gates. No production writes.",
);
