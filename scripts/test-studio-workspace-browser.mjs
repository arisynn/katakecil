import assert from "node:assert/strict";
import { readFileSync, mkdirSync } from "node:fs";
import { spawn } from "node:child_process";
import { chromium } from "playwright";
import { createDatabase, author, rpc } from "./test-v75.mjs";
import { loadTs } from "./test-utils/load-ts.mjs";
import JSZip from "jszip";
import { epubFixture } from "./test-utils/epub-fixture.mjs";
const { contentRequest } = loadTs("server/content/service.ts");
const db = await createDatabase();
await db.exec(
  `grant select,insert,update on qr_books to authenticated;grant select on qr_books to anon;alter table qr_books enable row level security;create policy qa_books_author on qr_books for all to authenticated using(exists(select 1 from qr_author_members where user_id=auth.uid())) with check(exists(select 1 from qr_author_members where user_id=auth.uid()));create policy qa_books_public on qr_books for select to anon using(is_published and deleted_at is null);grant select(id,book_id,episode_number,title,arc_title,is_enabled,release_at,deleted_at)on qr_episodes to authenticated;`,
);
for (const f of ["20261023112934_intact_epub_books.sql", "20261023234835_studio_workspace.sql"])
  await db.exec(readFileSync("supabase/migrations/" + f, "utf8"));
const base = "http://127.0.0.1:4231",
  host = "https://studio-qa.supabase.co",
  date = "2020-01-01T00:00:00Z",
  files = new Map();
let loggedIn = false,
  lost = true,
  chain = Promise.resolve();
const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "4231", "--strictPort"],
  {
    stdio: "ignore",
    env: {
      ...process.env,
      DISABLE_HMR: "true",
      VITE_SUPABASE_URL: host,
      VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_synthetic",
    },
  },
);
const user = {
  id: author,
  aud: "authenticated",
  role: "authenticated",
  email: "author@example.test",
  created_at: date,
  app_metadata: { provider: "email" },
  user_metadata: {},
  identities: [],
};
const asRole = async (role) => {
  await db.exec("reset role");
  await db.query("select set_config('test.uid',$1,false)", [loggedIn ? author : ""]);
  await db.exec("set role " + role);
};
const config = { url: host, publicKey: "sb_publishable_synthetic", secretKey: "server-test-only", origin: base };
const repo = {
  release: async (id) => {
    await asRole("anon");
    return (
      (
        await db.query(
          "select r.*,jsonb_build_object('is_published',b.is_published,'deleted_at',b.deleted_at)book from qr_studio_releases r join qr_books b on b.id=r.book_id where r.id=$1",
          [id],
        )
      ).rows[0] || null
    );
  },
  version: async (id, section) => {
    await db.exec("reset role");
    return (await db.query("select document from qr_studio_versions where id=$1 and section_id=$2", [id, section]))
      .rows[0].document;
  },
  file: async (bucket, path) => new Blob([files.get(bucket + "/" + path)], { type: "application/epub+zip" }),
};
let browser, page;
async function handle(route) {
  const req = route.request(),
    url = new URL(req.url()),
    name = url.pathname.split("/").at(-1),
    method = req.method(),
    body = () => req.postDataJSON();
  if (url.pathname === "/functions/v1/book-content" && method !== "OPTIONS") {
    url.searchParams.set("id", body().id);
    const response = await contentRequest(new Request(url, { headers: { origin: base } }), config, repo);
    return route.fulfill({
      status: response.status,
      headers: Object.fromEntries(response.headers),
      body: await response.text(),
    });
  }
  if (method === "OPTIONS") return route.fulfill({ status: 204 });
  if (url.pathname.includes("/auth/v1/token")) {
    loggedIn = true;
    return route.fulfill({
      json: {
        access_token: `${Buffer.from('{"alg":"HS256"}').toString("base64url")}.${Buffer.from(JSON.stringify({ sub: author, role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url")}.synthetic`,
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "synthetic-refresh",
        user,
      },
    });
  }
  if (name === "user") return route.fulfill({ json: user });
  if (name === "logout") {
    loggedIn = false;
    return route.fulfill({ status: 204 });
  }
  if (url.pathname.includes("/storage/v1/object/")) {
    if (!loggedIn) return route.fulfill({ status: 403, json: { message: "Private original" } });
    const path = decodeURIComponent(url.pathname.split("/object/")[1]);
    if (method === "POST") {
      const form = await new Request(req.url(), {
        method: "POST",
        headers: { "content-type": req.headers()["content-type"] },
        body: req.postDataBuffer(),
      }).formData();
      const file = [...form.values()].find((value) => value instanceof Blob);
      if (files.has(path)) return route.fulfill({ status: 409, json: { message: "Already exists" } });
      files.set(path, Buffer.from(await file.arrayBuffer()));
      return route.fulfill({ json: { Key: path } });
    }
    if (files.has(path)) return route.fulfill({ body: files.get(path), contentType: "application/octet-stream" });
    return route.fulfill({ status: 404, json: { message: "Missing" } });
  }
  await asRole(loggedIn ? "authenticated" : "anon");
  try {
    let data = [];
    if (url.pathname.includes("/rpc/")) {
      const args = body();
      data = await rpc(db, name, args);
      if (name === "qr_studio_mutate" && args.p_action === "import" && lost) {
        lost = false;
        return route.fulfill({ status: 503, json: { message: "Lost successful reply" } });
      }
    } else if (name === "qr_author_members") data = loggedIn ? [{ user_id: author }] : [];
    else if (
      [
        "qr_books",
        "qr_episodes",
        "qr_studio_books",
        "qr_studio_sources",
        "qr_studio_contents",
        "qr_studio_versions",
        "qr_studio_releases",
        "qr_studio_schedule",
        "qr_epub_catalog",
        "qr_book_epubs",
        "qr_epub_releases",
        "qr_epub_schedule",
        "qr_book_covers",
        "qr_cover_assets",
      ].includes(name)
    ) {
      const rawSelect = url.searchParams.get("select") || "*",
        fields = /^[a-z_,*]+$/i.test(rawSelect) ? rawSelect : "*";
      const clauses = [],
        params = [];
      for (const [key, value] of url.searchParams) {
        if (!/^[a-z_]+$/i.test(key) || ["select", "order", "limit", "offset"].includes(key)) continue;
        if (value.startsWith("eq.")) {
          params.push(value.slice(3));
          clauses.push(`${key}=$${params.length}`);
        } else if (value === "is.null") clauses.push(`${key} is null`);
        else if (value.startsWith("lte.")) {
          params.push(value.slice(4));
          clauses.push(`${key}<=$${params.length}`);
        } else if (value.startsWith("gt.")) {
          params.push(value.slice(3));
          clauses.push(`${key}>$${params.length}`);
        } else if (value.startsWith("in.(")) {
          const values = value.slice(4, -1).split(",");
          params.push(values);
          clauses.push(`${key}::text=any($${params.length}::text[])`);
        }
      }
      const where = clauses.length ? " where " + clauses.join(" and ") : "";
      const order = url.searchParams
        .get("order")
        ?.split(",")
        .map((s) => s.replace(".desc", " desc").replace(".asc", " asc"))
        .filter((s) => /^[a-z_ ]+$/.test(s))
        .join(",");
      if (method === "PATCH") {
        const patch = body(),
          entries = Object.entries(patch);
        const assigns = entries.map(([k, v]) => {
          params.push(v);
          return `${k}=$${params.length}`;
        });
        data = (await db.query(`update ${name} set ${assigns.join(",")}${where} returning *`, params)).rows;
      } else
        data = (
          await db.query(
            `select ${fields} from ${name}${where}${order ? " order by " + order : ""}${url.searchParams.get("limit") ? " limit " + Number(url.searchParams.get("limit")) : ""}${url.searchParams.get("offset") ? " offset " + Number(url.searchParams.get("offset")) : ""}`,
            params,
          )
        ).rows;
      if (req.headers().accept?.includes("vnd.pgrst.object")) data = data[0] || null;
    }
    return route.fulfill({ json: data });
  } catch (e) {
    return route.fulfill({ status: 400, json: { code: e.code || "P0001", message: e.message } });
  }
}
try {
  for (let n = 0; n < 100; n++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH,
    args: [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--no-zygote",
      "--single-process",
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--disable-vulkan",
    ],
  });
  page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("dialog", (dialog) => dialog.accept());
  await page.addInitScript(() => localStorage.setItem("kk-apk-prompt-dismissed", String(Date.now())));
  await page.route("https://fonts.**/**", (r) => r.abort());
  for (const pattern of [host + "/**", "**/api/book-content?*"])
    await page.route(pattern, (route) => {
      chain = chain.catch(() => {}).then(() => handle(route));
      return chain;
    });
  await page.goto(base + "/studio");
  await page.getByLabel("Email", { exact: true }).fill(user.email);
  await page.getByLabel("Kata sandi", { exact: true }).fill("synthetic");
  await page.getByRole("button", { name: /Masuk ke Studio/ }).click();
  await page.getByRole("heading", { name: "Cerita, satu per satu." }).waitFor();
  await page.getByRole("button", { name: "Tambah cerita", exact: true }).click();
  await page
    .getByLabel("File cerita", { exact: true })
    .setInputFiles({ name: "001.txt", mimeType: "text/plain", buffer: Buffer.from("Pulang") });
  await page.getByText("Naskah sangat pendek. Pastikan ini memang isi cerita.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Ganti file", exact: true }).click();
  const manuscript =
    "# Kata Pengantar\n\nTerima kasih untuk pembaca yang menemani perjalanan ini.\n\n# Bab 1 — Pulang\n\nAku tiba di rumah ketika hujan mulai turun. PUBLIC_STORY_ONE\n\n# Bab 2 — Esok\n\nHari berikutnya membawa kabar yang belum pernah kudengar. FUTURE_STORY_TWO";
  await page
    .getByLabel("File cerita", { exact: true })
    .setInputFiles({ name: "Cerita_QA.md", mimeType: "text/markdown", buffer: Buffer.from(manuscript) });
  await page.getByLabel("Judul cerita", { exact: true }).fill("Cerita Uji");
  await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Lost successful reply" }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Lanjutkan upload terakhir", exact: true }).click();
  await page.getByRole("button", { name: "Coba simpan lagi", exact: true }).click();
  await page.getByRole("heading", { name: "Cerita Uji", exact: true }).waitFor();
  await db.exec("reset role");
  let rows = (await db.query("select * from qr_studio_contents order by position")).rows;
  assert.equal(rows.length, 3);
  assert.equal(rows[0].kind, "page");
  assert.equal(rows[0].display_number, null);
  const bookId = rows[0].book_id,
    chapter = rows[1];
  assert.equal(files.size, 1);
  mkdirSync("/tmp/katakecil-workspace-qa", { recursive: true });
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    assert(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
      `Kelola overflow ${width}`,
    );
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("heading", { name: "Cerita Uji", exact: true }).waitFor();
  await page.screenshot({ path: "/tmp/katakecil-workspace-qa/manage.png", fullPage: true });
  await page.getByRole("button", { name: "Rilis", exact: true }).last().click();
  await page.getByRole("button", { name: "Terbitkan pilihan", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "berhasil diterbitkan" }).waitFor();
  await page.getByRole("button", { name: "Isi", exact: true }).click();
  await page.locator(".ws-content-row").nth(1).getByRole("button", { name: "Edit", exact: true }).click();
  await page.getByRole("textbox", { name: "Isi naskah", exact: true }).waitFor();
  assert.equal(await page.getByRole("button", { name: "Terbitkan pilihan", exact: true }).count(), 0);
  await page
    .getByRole("textbox", { name: "Isi naskah", exact: true })
    .fill("DRAFT_REVISION_PRIVATE sekarang sedang disunting dan belum boleh terlihat.");
  await page.getByRole("status").filter({ hasText: "Tersimpan di akun" }).waitFor();
  await page.waitForTimeout(1700);
  await db.exec("reset role");
  const active = (
    await db.query(
      "select r.*,v.document from qr_studio_releases r join qr_studio_versions v on v.id=r.version_id where r.id=$1",
      [chapter.id],
    )
  ).rows[0];
  assert(active.document.content_md.includes("PUBLIC_STORY_ONE"));
  assert(!active.document.content_md.includes("DRAFT_REVISION_PRIVATE"));
  await page.screenshot({ path: "/tmp/katakecil-workspace-qa/editor.png", fullPage: true });
  await page.getByRole("button", { name: "← Kelola", exact: true }).click();
  await page.getByRole("heading", { name: "Cerita Uji", exact: true }).waitFor();
  await page.getByText("Bab · Terbit · Ada draf revisi", { exact: true }).waitFor();
  // EPUB keeps the original source while the same Studio flow classifies and publishes its sections.
  await page.getByRole("button", { name: "Karya", exact: true }).click();
  await page.getByRole("button", { name: "Tambah cerita", exact: true }).click();
  const epubBytes = await epubFixture();
  await page
    .getByLabel("File cerita", { exact: true })
    .setInputFiles({ name: "book.epub", mimeType: "application/epub+zip", buffer: epubBytes });
  await page.getByLabel("Judul cerita", { exact: true }).fill("EPUB Uji");
  await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
  await page.getByRole("heading", { name: "EPUB Uji", exact: true, level: 1 }).waitFor();
  await db.exec("reset role");
  const epubBook = (await db.query("select id from qr_books where title='EPUB Uji'")).rows[0].id;
  const epubRows = (await db.query("select * from qr_studio_contents where book_id=$1 order by position", [epubBook]))
    .rows;
  assert.equal(epubRows.length, 4);
  assert.equal(epubRows[0].kind, "page");
  assert.equal(epubRows[0].display_number, null);
  assert.equal(epubRows[1].display_number, 1);
  assert(Buffer.from(files.get("studio-sources/" + epubRows[0].source.path)).equals(epubBytes));
  await page.getByRole("button", { name: "Rilis", exact: true }).last().click();
  const epubChecks = page.locator(".ws-release-selection input[type=checkbox]");
  await epubChecks.nth(1).uncheck();
  await epubChecks.nth(2).uncheck();
  await page.getByRole("button", { name: "Terbitkan pilihan", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "berhasil diterbitkan" }).waitFor();
  await page.getByRole("button", { name: "Karya", exact: true }).click();
  await page.getByRole("button", { name: "Tambah cerita", exact: true }).click();
  const zip = new JSZip();
  zip.file("001-Awal.md", "# Bab 1 — Awal\n\nIsi bab pertama dalam ZIP dengan paragraf yang lengkap.");
  zip.file("002-Akhir.txt", "Bab 2 — Akhir\nIsi bab kedua dalam ZIP yang juga sudah lengkap.");
  zip.file("README.md", "Catatan kerja.");
  const zipped = await zip.generateAsync({ type: "uint8array" });
  await page
    .getByLabel("File cerita", { exact: true })
    .setInputFiles({ name: "Zip_Uji.zip", mimeType: "application/zip", buffer: Buffer.from(zipped) });
  await page.getByLabel("Judul cerita", { exact: true }).fill("ZIP Uji");
  await page.getByRole("button", { name: "Simpan draf", exact: true }).click();
  await page.getByRole("heading", { name: "ZIP Uji", exact: true, level: 1 }).waitFor();
  // Export must include every revision beyond PostgREST's default row limit and original EPUB bytes.
  await db.exec("reset role");
  await db.query("insert into qr_studio_versions(section_id,revision,document) select $1,1000+n,(select document from qr_studio_versions where section_id=$1 limit 1) from generate_series(1,1005)n", [chapter.id]);
  const expectedVersions=Number((await db.query("select count(*)n from qr_studio_versions where section_id in(select id from qr_studio_contents where book_id=$1)",[bookId])).rows[0].n);
  await page.getByRole("button", { name: "Lainnya", exact: true }).click();
  await page.getByRole("button", { name: /Ekspor & data/ }).click();
  const downloadPromise=page.waitForEvent("download");
  await page.getByRole("button", { name: "Unduh salinan ZIP", exact: true }).click();
  const exported=await downloadPromise;
  const backup=await JSZip.loadAsync(readFileSync(await exported.path()));
  const backupBook=JSON.parse(await backup.file(bookId+"/book.json").async("string"));
  assert.equal(backupBook.versions.length,expectedVersions);
  assert(backupBook.contents.some(row=>row.content_html.includes("DRAFT_REVISION_PRIVATE")));
  const backupEpub=Object.values(backup.files).find(file=>file.name.startsWith(epubBook+"/sources/")&&file.name.endsWith(".epub"));
  assert(backupEpub && (await backupEpub.async("nodebuffer")).equals(epubBytes));
  await page.getByRole("button", { name: "Menu akun", exact: true }).click();
  await page.getByRole("button", { name: "Keluar akun", exact: true }).click();
  await page.getByRole("button", { name: /Masuk ke Studio/ }).waitFor();
  await page.goto(base + `/baca/${bookId}?episode=${chapter.reader_number}`);
  await page
    .locator(".reader-book")
    .getByText(/PUBLIC_STORY_ONE/)
    .waitFor();
  assert.equal(await page.getByText(/DRAFT_REVISION_PRIVATE/).count(), 0);
  await page.goto(base + `/baca/${bookId}?episode=${rows[0].reader_number}`);
  await page
    .locator(".reader-book")
    .getByText(/Terima kasih/)
    .waitFor();
  assert.equal(await page.locator(".reader-book .chapter-arc").first().innerText(), "HALAMAN BUKU");
  await page.screenshot({ path: "/tmp/katakecil-workspace-qa/reader.png", fullPage: true });
  await page.goto(base + `/baca/${epubBook}?episode=${epubRows[0].reader_number}`);
  await page.locator(".reader-book").getByText("PUBLIC_FIRST_BODY", { exact: true }).waitFor();
  assert.equal(await page.locator(".reader-book").getByText("FUTURE_SECOND_SECRET", { exact: true }).count(), 0);
  await page.goto(base + `/baca/${epubBook}?episode=${epubRows[1].reader_number}`);
  await page.locator(".reader-book").getByText("FUTURE_SECOND_SECRET", { exact: true }).waitFor();
  assert.equal(await page.getByText("THIRD_SECRET_BODY", { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "PASS workspace browser: actual PostgreSQL-backed upload → review → durable retry → manage → release → visual editor → private autosave revision → paginated export → public reader, unnumbered book pages and 360–1440 px layouts. Synthetic auth and Storage; real SQL and HTTP content handler. No production writes.",
  );
} catch (error) {
  console.error("UI failure:", page?.url(), await page?.locator("body").innerText());
  throw error;
} finally {
  await browser?.close();
  server.kill();
  await db.close();
}
