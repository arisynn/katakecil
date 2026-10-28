import { useEffect, useRef, useState, lazy, Suspense } from "react";
import type { Book } from "../../data/library";
import { slugify } from "../../data/library";
import { supabase } from "../../data/supabase";
import { navigate } from "../../utils/nav";
import { useLeaveGuard } from "../../hooks/useLeaveGuard";
import { analyzeFiles, type Analysis } from "./analyze";
import {
  contentIssues,
  kindNames,
  narrative,
  plain,
  releaseSlots,
  type Candidate,
  type ContentItem,
  type SectionKind,
} from "./model";
import { mutate, operation, type Operation } from "./api";
import { recoverLocal, storeLocal } from "./recovery";
import ReleaseOptions, { defaultChoice, type ReleaseChoice } from "./ReleaseOptions";
import { CoverEditor } from "../covers/CoverEditor";
import type { PreparedCover } from "../covers/model";
import { newCoverOperation, saveCover, publishCover } from "../covers/api";
const Preview = lazy(() => import("./ReaderPreview"));

type Staged = { file: File; path: string; sha: string };
type Pending = { id: string; bookId: string; files: Staged[]; op?: Operation };
type SavedUpload = {
  analysis: Analysis;
  files: File[];
  title: string;
  choice: ReleaseChoice;
  step?: number;
  target: string;
  pending: Pending | null;
  replace: boolean;
};
const hash = async (blob: Blob) =>
  Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", await blob.arrayBuffer())))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
export function planParts(parts: Candidate[], choice: ReleaseChoice) {
  const selected = parts.filter((p) => p.include),
    story = selected.filter((p) => narrative(p.kind));
  const times =
    choice.mode === "schedule"
      ? releaseSlots(story.length, choice.time ? choice.start : "", choice.time, choice.slots)
      : story.map(() => null);
  const date = new Map(story.map((p, i) => [p.key, times[i]]));
  return selected.map((part, index) => {
    const next = selected.slice(index).find((p) => narrative(p.kind)),
      previous = [...selected.slice(0, index)].reverse().find((p) => narrative(p.kind));
    return {
      part,
      release_at: date.get(part.key) ?? date.get(next?.key || "") ?? date.get(previous?.key || "") ?? null,
    };
  });
}
export default function UploadRoom({
  account,
  books,
  bookId,
  items,
  onChanged,
}: {
  account: string;
  books: Book[];
  bookId?: string;
  items: ContentItem[];
  onChanged: () => Promise<void>;
}) {
  const [analysis, setAnalysis] = useState<Analysis | null>(null),
    [files, setFiles] = useState<File[]>([]),
    [title, setTitle] = useState(""),
    [target, setTarget] = useState(bookId || "new"),
    [choice, setChoice] = useState<ReleaseChoice>(defaultChoice),
    [busy, setBusy] = useState(false),
    [stage, setStage] = useState(""),
    [error, setError] = useState(""),
    [saved, setSaved] = useState<SavedUpload | null>(null),
    [preview, setPreview] = useState<Candidate | null>(null),
    [replace, setReplace] = useState(false),
    [paste, setPaste] = useState(false),
    [text, setText] = useState(""),
    [prepared, setPrepared] = useState<PreparedCover | null>(null),
    [coverBusy, setCoverBusy] = useState(false),
    [notice, setNotice] = useState("");
  const controller = useRef<AbortController | null>(null),
    pending = useRef<Pending | null>(null),
    completed = useRef(false),
    live = useRef(true),
    backup = useRef<Promise<unknown>>(Promise.resolve());
  useEffect(() => {
    live.current = true;
    void recoverLocal<SavedUpload>(account, "upload")
      .then((value) => {
        if (live.current && value && (!bookId || value.target === bookId)) setSaved(value);
      })
      .catch(() => {});
    return () => {
      live.current = false;
      controller.current?.abort();
    };
  }, [account, bookId]);
  useEffect(() => {
    if (!analysis || busy || pending.current || completed.current) return;
    const state: SavedUpload = { analysis, files, title, choice, step: 2, target, pending: null, replace };
    backup.current = backup.current.catch(() => {}).then(() => storeLocal(account, "upload", state));
  }, [analysis, files, title, choice, target, replace, busy, account]);
  useLeaveGuard(busy || Boolean(analysis), async () => {
    if (completed.current) return true;
    if (busy) return false;
    try {
      await backup.current;
      return true;
    } catch {
      return window.confirm("Upload belum tersimpan di perangkat. Tinggalkan?");
    }
  });
  const selected = analysis?.parts.filter((p) => p.include) ?? [],
    problems = selected.filter((p) => p.issues.length && !p.reviewed),
    isEpubFile = files.some((f) => /\.epub$/i.test(f.name));
  let plan: ReturnType<typeof planParts> = [],
    planError = "";
  try {
    if (analysis) plan = planParts(analysis.parts, choice);
  } catch (e) {
    planError = (e as Error).message;
  }
  const update = (key: string, patch: Partial<Candidate>) =>
    setAnalysis((prev) =>
      prev
        ? {
            ...prev,
            parts: prev.parts.map((p) =>
              p.key === key
                ? (() => {
                    const next = { ...p, ...patch };
                    return { ...next, issues: contentIssues(next), reviewed: patch.reviewed ?? true };
                  })()
                : p,
            ),
          }
        : prev,
    );
  const read = async (next: File[]) => {
    if (!next.length) return;
    controller.current?.abort();
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError("");
    setPrepared(null);
    pending.current = null;
    completed.current = false;
    try {
      const result = await analyzeFiles(next, abort.signal, setStage);
      if (abort.signal.aborted) return;
      setFiles(next);
      setAnalysis(result);
      setTitle(result.title);
      setChoice(defaultChoice());
      setSaved(null);
    } catch (e) {
      if (!abort.signal.aborted) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (live.current) setBusy(false);
    }
  };
  const commit = async (overrideMode?: ReleaseChoice["mode"]) => {
    if (!analysis || !supabase || busy) return;
    const effectiveChoice: ReleaseChoice = overrideMode ? { ...choice, mode: overrideMode } : choice;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (!selected.length || !title.trim()) throw Error("Isi judul dan pilih sedikitnya satu bagian.");
      let activePlan = plan;
      if (overrideMode) {
        activePlan = planParts(analysis.parts, effectiveChoice);
      } else if (effectiveChoice.mode !== "draft" && planError) {
        throw Error(planError);
      }
      if (!pending.current) {
        const bid =
          target === "new" ? `${slugify(title).slice(0, 55) || "cerita"}-${crypto.randomUUID().slice(0, 12)}` : target;
        const staged: Staged[] = [];
        for (const file of files)
          staged.push({
            file,
            path: `${bid}/${crypto.randomUUID()}.${file.name.split(".").at(-1)?.toLowerCase() || "txt"}`,
            sha: await hash(file),
          });
        pending.current = { id: crypto.randomUUID(), bookId: bid, files: staged };
      }
      const job = pending.current;
      await backup.current.catch(() => {});
      await storeLocal(account, "upload", {
        analysis,
        files,
        title,
        choice: effectiveChoice,
        step: 3,
        target,
        pending: job,
        replace,
      });
      for (const source of job.files) {
        setStage(`Menyimpan sumber ${source.file.name}…`);
        const uploaded = await supabase.storage.from("studio-sources").upload(source.path, source.file, {
          contentType: /\.epub$/i.test(source.file.name)
            ? "application/epub+zip"
            : /\.zip$/i.test(source.file.name)
              ? "application/zip"
              : /\.md$/i.test(source.file.name)
                ? "text/markdown"
                : "text/plain",
          upsert: false,
          cacheControl: "0",
        });
        if (uploaded.error) {
          const check = await supabase.storage.from("studio-sources").download(source.path);
          if (check.error || !check.data || (await hash(check.data)) !== source.sha) throw uploaded.error;
        }
      }
      if (!job.op) {
        const existing = items.filter((p) => p.book_id === job.bookId && !p.deleted_at);
        let next = Math.max(0, ...existing.filter((p) => p.kind === "chapter").map((p) => p.display_number ?? 0));
        const imported = activePlan.map(({ part, release_at }) => {
          const matches = existing.filter(
              (e) =>
                e.title.trim().toLocaleLowerCase("id") === part.title.trim().toLocaleLowerCase("id") &&
                e.kind === part.kind,
            ),
            match = replace && matches.length === 1 ? matches[0] : null;
          const source = job.files.find((s) => s.file.name === part.origin) || job.files[0];
          return {
            id: match?.id,
            expected: match?.revision,
            release_at,
            document: {
              title: part.title,
              arc_title: part.arc_title,
              kind: part.kind,
              display_number:
                part.kind === "chapter"
                  ? (match?.display_number ?? (target === "new" ? (part.display_number ?? ++next) : ++next))
                  : null,
              content_md: part.content_md,
              content_html: part.source ? "" : part.content_html || "",
              source: part.source ? { ...part.source, path: source.path, sha256: source.sha } : null,
            },
          };
        });
        job.op = {
          id: job.id,
          action: "import",
          payload: {
            book_id: job.bookId,
            new_title: target === "new" ? title.trim() : "",
            mode: replace ? "draft" : effectiveChoice.mode,
            items: imported,
            sources: job.files.map((s) => ({ path: s.path, sha256: s.sha, name: s.file.name, bytes: s.file.size })),
          },
        };
        await storeLocal(account, "upload", {
          analysis,
          files,
          title,
          choice: effectiveChoice,
          step: 3,
          target,
          pending: job,
          replace,
        });
      }
      setStage("Menyimpan naskah dan memverifikasi hasil…");
      const receipt = await mutate(job.op);
      await storeLocal(account, "upload", null);
      completed.current = true;
      setAnalysis(null);
      pending.current = null;
      if (prepared) {
        try {
          setStage("Menyimpan sampul…");
          const op = await newCoverOperation(job.bookId, prepared),
            asset = await saveCover(op, new AbortController().signal, setStage);
          if (effectiveChoice.mode !== "draft" && !replace) await publishCover(asset.id, 0, crypto.randomUUID());
        } catch {
          setNotice("Naskah berhasil disimpan. Sampul belum selesai; lanjutkan dari Detail buku.");
        }
      }
      setStage(
        `${receipt.changed} bagian tersimpan${receipt.skipped ? `, ${receipt.skipped} duplikat dilewati` : ""}.`,
      );
      await onChanged();
      navigate(`/studio/karya/${job.bookId}`);
    } catch (e) {
      if ((e as { code?: string }).code) pending.current = null;
      setError(
        e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String(e.message) : String(e),
      );
    } finally {
      if (live.current) setBusy(false);
    }
  };
  const restore = () => {
    if (!saved) return;
    setAnalysis(saved.analysis);
    setFiles(saved.files);
    setTitle(saved.title);
    setChoice(saved.choice);
    setTarget(saved.target);
    setReplace(saved.replace);
    pending.current = saved.pending;
    setSaved(null);
  };
  const resetFile = () => {
    setAnalysis(null);
    setFiles([]);
    setPrepared(null);
    setError("");
    pending.current = null;
  };
  return (
    <div className="ws-upload">
      <header className="ws-page-head">
        <div>
          <span className="ws-eyebrow">UPLOAD CEPAT PENULIS</span>
          <h1>Upload EPUB & Naskah</h1>
          <p>Pilih file EPUB, ZIP, atau Markdown/TXT — langsung terbitkan atau simpan draf dalam satu layar.</p>
        </div>
        <button type="button" onClick={() => navigate(bookId ? `/studio/karya/${bookId}` : "/studio")}>
          ← Kembali
        </button>
      </header>
      {error && (
        <p className="ws-error" role="alert">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {busy && (
        <p className="ws-notice" role="status">
          {stage}
        </p>
      )}
      {saved && !analysis && (
        <section className="ws-panel ws-saved-banner">
          <div>
            <h2>Upload terakhir belum selesai</h2>
            <p>
              <strong>{saved.title}</strong> · {saved.analysis.parts.length} bagian siap dilanjutkan.
            </p>
          </div>
          <div className="ws-actions">
            <button type="button" className="ws-primary" onClick={restore}>
              Lanjutkan upload terakhir
            </button>
            <button
              type="button"
              onClick={() => {
                setSaved(null);
                void storeLocal(account, "upload", null);
              }}
            >
              Mulai baru
            </button>
          </div>
        </section>
      )}
      {!analysis && (
        <section className="ws-panel">
          <label className="ws-dropzone">
            <strong>Pilih file EPUB atau naskah cerita</strong>
            <span>EPUB (Direkomendasikan) · ZIP · Markdown · TXT</span>
            <small>Judul, daftar bab, dan sampul EPUB akan dikenali otomatis. Maksimal 20 MB.</small>
            <input
              name="manuscript"
              aria-label="File cerita"
              type="file"
              multiple
              accept=".epub,.zip,.txt,.md,.markdown"
              disabled={busy}
              onChange={(e) => {
                void read(Array.from(e.target.files ?? []));
                e.target.value = "";
              }}
            />
          </label>
          <div className="ws-paste-toggle">
            <button type="button" onClick={() => setPaste((v) => !v)}>
              {paste ? "Tutup tempel teks" : "Atau tempel teks manual"}
            </button>
          </div>
          {paste && (
            <div className="ws-paste-box">
              <label>
                Judul bagian
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: Bab 1 — Permulaan"
                />
              </label>
              <label>
                Naskah
                <textarea
                  aria-label="Teks cerita"
                  rows={8}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Tempel isi cerita di sini…"
                />
              </label>
              <button
                className="ws-primary"
                type="button"
                disabled={!text.trim() || busy}
                onClick={() =>
                  void read([
                    new File([`# ${title || "Bagian baru"}\n\n${text}`], `${title || "cerita"}.md`, {
                      type: "text/markdown",
                    }),
                  ])
                }
              >
                Gunakan teks ini
              </button>
            </div>
          )}
        </section>
      )}
      {analysis && (
        <>
          <section className="ws-panel ws-upload-summary-card">
            <div className="ws-summary-header">
              <div className="ws-summary-badges">
                <span className="ws-badge ws-badge-accent">{isEpubFile ? "EPUB Utuh" : "Naskah"}</span>
                <span className="ws-badge">
                  {selected.filter((p) => p.kind === "chapter").length} bab
                </span>
                {selected.filter((p) => p.kind === "prologue" || p.kind === "epilogue").length > 0 && (
                  <span className="ws-badge">
                    {selected.filter((p) => p.kind === "prologue" || p.kind === "epilogue").length} prolog/epilog
                  </span>
                )}
                {selected.filter((p) => p.kind === "page").length > 0 && (
                  <span className="ws-badge">
                    {selected.filter((p) => p.kind === "page").length} halaman buku
                  </span>
                )}
                {(analysis.cover || prepared) && (
                  <span className="ws-badge ws-badge-published">Sampul terdeteksi ✓</span>
                )}
              </div>
              <button type="button" onClick={resetFile} disabled={busy || Boolean(pending.current)}>
                Ganti file
              </button>
            </div>

            <div className="ws-upload-grid">
              <label>
                Judul cerita
                <input
                  aria-label="Judul cerita"
                  maxLength={180}
                  value={title}
                  disabled={busy || Boolean(pending.current)}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Judul novel atau cerita…"
                />
              </label>
              <label>
                Simpan ke
                <select
                  aria-label="Tujuan upload"
                  disabled={Boolean(bookId) || busy || Boolean(pending.current)}
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                >
                  <option value="new">Cerita baru</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {target !== "new" && (
              <label className="ws-check ws-replace-option">
                <input
                  type="checkbox"
                  checked={replace}
                  onChange={(e) => {
                    setReplace(e.target.checked);
                    if (e.target.checked) setChoice((c) => ({ ...c, mode: "draft" }));
                  }}
                />
                <span>
                  Perbarui bab yang memiliki judul sama sebagai draf revisi
                  <small>Versi terbit dan jadwal lama tetap aman.</small>
                </span>
              </label>
            )}

            {analysis.groups && (
              <label className="ws-zip-group">
                ZIP berisi beberapa kelompok cerita
                <select
                  aria-label="Kelompok cerita ZIP"
                  defaultValue=""
                  onChange={(e) => {
                    const group = e.target.value;
                    setAnalysis((prev) =>
                      prev
                        ? {
                            ...prev,
                            parts: prev.parts.map((p) => ({
                              ...p,
                              include: group === "all" || p.origin.startsWith(group + "/"),
                            })),
                          }
                        : prev,
                    );
                  }}
                >
                  <option value="" disabled>
                    Pilih kelompok cerita
                  </option>
                  {analysis.groups.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                  <option value="all">Semua folder memang satu karya</option>
                </select>
              </label>
            )}

            {!replace && (
              <fieldset disabled={busy || Boolean(pending.current)}>
                <ReleaseOptions value={choice} onChange={setChoice} />
              </fieldset>
            )}

            {planError && choice.mode === "schedule" && (
              <p role="alert" className="ws-error">
                {planError}
              </p>
            )}

            {choice.mode === "schedule" && !planError && (
              <details className="ws-schedule-preview">
                <summary>Pratinjau jadwal rilis ({plan.length} bagian)</summary>
                <div className="ws-schedule-list">
                  {plan.slice(0, 30).map(({ part, release_at }) => (
                    <p key={part.key}>
                      <strong>{part.title}</strong> ·{" "}
                      {release_at
                        ? new Date(release_at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })
                        : "Mengikuti bab terkait"}{" "}
                      WIB
                    </p>
                  ))}
                  {plan.length > 30 && <p>Dan {plan.length - 30} bagian berikutnya.</p>}
                </div>
              </details>
            )}

            <div className="ws-actions ws-upload-primary-actions">
              {pending.current ? (
                <button
                  type="button"
                  className="ws-primary"
                  disabled={busy || coverBusy}
                  onClick={() => void commit()}
                >
                  {busy ? "Menyimpan…" : "Coba simpan lagi"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={busy || coverBusy || !selected.length || !title.trim()}
                    onClick={() => void commit("draft")}
                  >
                    {busy && choice.mode === "draft" ? "Menyimpan…" : "Simpan draf"}
                  </button>
                  {!replace && (
                    <button
                      type="button"
                      className="ws-primary"
                      disabled={
                        busy ||
                        coverBusy ||
                        !selected.length ||
                        !title.trim() ||
                        (choice.mode === "schedule" && Boolean(planError))
                      }
                      onClick={() => void commit(choice.mode === "schedule" ? "schedule" : "now")}
                    >
                      {busy
                        ? "Menyimpan…"
                        : choice.mode === "schedule"
                          ? `Simpan & jadwalkan (${selected.length} bagian)`
                          : `Simpan & terbitkan sekarang (${selected.length} bagian)`}
                    </button>
                  )}
                </>
              )}
            </div>
          </section>

          {problems.length > 0 && (
            <section className="ws-warning" role="status">
              <strong>Catatan pemeriksaan ({problems.length} bagian):</strong>
              {problems.map((part) => (
                <div key={part.key}>
                  {part.issues.map((issue) => (
                    <p key={issue}>{issue}</p>
                  ))}
                </div>
              ))}
            </section>
          )}

          <details className="ws-panel ws-collapsible" open={Boolean(analysis.cover)}>
            <summary>
              <span>Sampul cerita</span>
              <small>{prepared || analysis.cover ? "Sampul siap digunakan" : "Opsional — bisa diatur nanti"}</small>
            </summary>
            <CoverEditor
              value={prepared}
              onChange={setPrepared}
              source={analysis.cover ?? null}
              title={title}
              disabled={busy}
              onBusy={setCoverBusy}
            />
          </details>

          <details className="ws-panel ws-collapsible" open={problems.length > 0}>
            <summary>
              <span>Daftar isi & bagian ({selected.length} dipilih)</span>
              <small>Klik untuk mengubah judul, jenis halaman/bab, atau urutan</small>
            </summary>
            <div className="ws-parts-quick-bar">
              <button
                type="button"
                onClick={() =>
                  setAnalysis((prev) =>
                    prev ? { ...prev, parts: prev.parts.map((p) => ({ ...p, include: true })) } : prev,
                  )
                }
              >
                Pilih semua
              </button>
              <button
                type="button"
                onClick={() =>
                  setAnalysis((prev) =>
                    prev
                      ? { ...prev, parts: prev.parts.map((p) => ({ ...p, include: narrative(p.kind) })) }
                      : prev,
                  )
                }
              >
                Hanya bab cerita
              </button>
            </div>
            <div className="ws-parts-compact-list">
              {analysis.parts.map((part, idx) => (
                <div className="ws-part-compact-row" key={part.key}>
                  <input
                    type="checkbox"
                    aria-label={`Simpan ${part.title}`}
                    checked={part.include}
                    onChange={(e) => update(part.key, { include: e.target.checked })}
                  />
                  <select
                    aria-label={`Jenis ${part.title}`}
                    value={part.kind}
                    onChange={(e) => update(part.key, { kind: e.target.value as SectionKind })}
                  >
                    {Object.entries(kindNames).map(([k, label]) => (
                      <option key={k} value={k}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <input
                    aria-label={`Judul bagian ${idx + 1}`}
                    maxLength={180}
                    value={part.title}
                    onChange={(e) => update(part.key, { title: e.target.value })}
                  />
                  <div className="ws-part-compact-actions">
                    <button type="button" onClick={() => setPreview(part)}>
                      Pratinjau
                    </button>
                    <button
                      type="button"
                      title="Geser naik"
                      disabled={idx === 0}
                      onClick={() =>
                        setAnalysis((prev) => {
                          if (!prev) return prev;
                          const list = [...prev.parts];
                          if (idx > 0) [list[idx - 1], list[idx]] = [list[idx], list[idx - 1]];
                          return { ...prev, parts: list };
                        })
                      }
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      title="Geser turun"
                      disabled={idx === analysis.parts.length - 1}
                      onClick={() =>
                        setAnalysis((prev) => {
                          if (!prev) return prev;
                          const list = [...prev.parts];
                          if (idx < list.length - 1) [list[idx + 1], list[idx]] = [list[idx], list[idx + 1]];
                          return { ...prev, parts: list };
                        })
                      }
                    >
                      ↓
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </details>

          {analysis.notes.length > 0 && (
            <details className="ws-panel ws-collapsible">
              <summary>Catatan file ({analysis.notes.length})</summary>
              {analysis.notes.map((note, i) => (
                <p key={i}>{note}</p>
              ))}
            </details>
          )}
        </>
      )}
      {preview && (
        <Suspense fallback={<p>Memuat pratinjau…</p>}>
          <Preview document={{ ...preview, source: null }} bookTitle={title} onClose={() => setPreview(null)} />
        </Suspense>
      )}
    </div>
  );
}
