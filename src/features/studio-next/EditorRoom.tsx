import { useCallback, useEffect, useRef, useState, lazy, Suspense } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Markdown } from "@tiptap/markdown";
import { TableKit } from "@tiptap/extension-table";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { supabase } from "../../data/supabase";
import { useLeaveGuard } from "../../hooks/useLeaveGuard";
import { navigate } from "../../utils/nav";
import { content, mutate, operation, sourceHtml, type Operation } from "./api";
import { documentOf, kindNames, plain, type ContentDocument, type ContentItem, type SectionKind } from "./model";
import { recoverLocal, storeLocal } from "./recovery";
const Preview = lazy(() => import("./ReaderPreview"));
const same = (a: ContentDocument, b: ContentDocument) => JSON.stringify(a) === JSON.stringify(b);
function VisualEditor({
  document,
  onChange,
}: {
  document: ContentDocument;
  onChange: (value: ContentDocument) => void;
}) {
  const latest = useRef({ document, onChange });
  latest.current = { document, onChange };
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: { openOnClick: false } }),
      Image.configure({ allowBase64: true }),
      TableKit,
      Subscript,
      Superscript,
      Markdown,
    ],
    content: document.content_html || document.content_md,
    contentType: document.content_html ? "html" : "markdown",
    editorProps: {
      attributes: { "aria-label": "Isi naskah", role: "textbox", "aria-multiline": "true", spellcheck: "true" },
    },
    onUpdate: ({ editor }) =>
      latest.current.onChange({
        ...latest.current.document,
        content_md: editor.getMarkdown(),
        content_html: editor.getHTML(),
        source: null,
      }),
  });
  const [raw, setRaw] = useState(false),
    [draft, setDraft] = useState("");
  const switchMode = () => {
    if (raw && editor) {
      editor.commands.setContent(draft, { contentType: "markdown" });
      latest.current.onChange({
        ...latest.current.document,
        content_md: editor.getMarkdown(),
        content_html: editor.getHTML(),
        source: null,
      });
      setRaw(false);
    } else {
      setDraft(editor?.getMarkdown() || document.content_md);
      setRaw(true);
    }
  };
  return (
    <>
      <div className="ws-editor-tools" role="toolbar" aria-label="Format naskah">
        {!raw && (
          <>
            <button
              type="button"
              aria-label="Tebal"
              aria-pressed={editor?.isActive("bold") || false}
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <b>B</b>
            </button>
            <button
              type="button"
              aria-label="Miring"
              aria-pressed={editor?.isActive("italic") || false}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <i>I</i>
            </button>
            <button
              type="button"
              title="Kutipan"
              aria-label="Kutipan"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            >
              ❝
            </button>
            <button
              type="button"
              title="Pemisah adegan"
              aria-label="Pemisah adegan"
              onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            >
              —
            </button>
            <button type="button" aria-label="Urungkan" onClick={() => editor?.chain().focus().undo().run()}>
              ↶
            </button>
            <button type="button" aria-label="Ulangi" onClick={() => editor?.chain().focus().redo().run()}>
              ↷
            </button>
          </>
        )}
        <button
          type="button"
          className="ws-mode"
          aria-label={raw ? "Kembali ke visual" : "Buka mode Markdown"}
          onClick={switchMode}
        >
          {raw ? "Visual" : "MD"}
        </button>
      </div>
      {raw ? (
        <textarea
          className="ws-raw-editor"
          aria-label="Isi Markdown"
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            editor?.commands.setContent(e.target.value, { contentType: "markdown", emitUpdate: false });
            latest.current.onChange({
              ...latest.current.document,
              content_md: e.target.value,
              content_html: editor?.getHTML() || "",
              source: null,
            });
          }}
        />
      ) : (
        <EditorContent editor={editor} />
      )}
    </>
  );
}
function Session({
  initial,
  account,
  bookTitle,
  onSaved,
}: {
  initial: ContentItem;
  account: string;
  bookTitle: string;
  onSaved: () => Promise<void>;
}) {
  const [doc, setDoc] = useState<ContentDocument>(documentOf(initial)),
    [version, setVersion] = useState(initial.revision),
    [status, setStatus] = useState("Tersimpan di akun"),
    [error, setError] = useState(""),
    [preview, setPreview] = useState(false),
    [ready, setReady] = useState(!initial.source),
    [restores, setRestores] = useState(0),
    [recovery, setRecovery] = useState<{ document: ContentDocument; baseRevision: number } | null>(null),
    [history, setHistory] = useState<any[] | null>(null);
  const current = useRef(doc);
  current.current = doc;
  const saved = useRef(documentOf(initial)),
    revision = useRef(initial.revision),
    pending = useRef<{ operation: Operation; document: ContentDocument } | null>(null),
    queue = useRef<Promise<unknown>>(Promise.resolve()),
    live = useRef(true),
    localQueue = useRef<Promise<unknown>>(Promise.resolve());
  const dirty = !same(doc, saved.current);
  const [saving, setSaving] = useState(false),
    [publishing, setPublishing] = useState(false),
    [conflict, setConflict] = useState(false);
  useEffect(() => {
    live.current = true;
    void recoverLocal<{ document: ContentDocument; baseRevision: number }>(account, "content:" + initial.id)
      .then((value) => {
        if (live.current && value && !same(value.document, saved.current)) setRecovery(value);
      })
      .catch(() => {});
    return () => {
      live.current = false;
    };
  }, [account, initial.id]);
  useEffect(() => {
    if (!initial.source) return;
    let active = true;
    void sourceHtml(initial.source)
      .then((html) => {
        if (active) {
          const next = { ...documentOf(initial), content_html: html };
          saved.current = next;
          setDoc(next);
          setReady(true);
        }
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [initial.id]);
  useEffect(() => {
    if (!dirty) return;
    const snapshot = { document: doc, baseRevision: revision.current };
    localQueue.current = localQueue.current
      .catch(() => {})
      .then(() => storeLocal(account, "content:" + initial.id, snapshot))
      .catch(() => {
        if (live.current)
          setError(
            "Pemulihan di perangkat belum tersedia. Pastikan perubahan tersimpan di akun sebelum menutup halaman.",
          );
      });
  }, [doc, dirty, account, initial.id]);
  const save = useCallback(() => {
    const run = async () => {
      if (live.current) setSaving(true);
      try {
        if (conflict) throw Error("Selesaikan perbedaan versi terlebih dahulu.");
        for (let n = 0; n < 3; n++) {
          if (!pending.current && same(current.current, saved.current)) return;
          if (!pending.current) {
            const snapshot = structuredClone(current.current);
            pending.current = {
              document: snapshot,
              operation: operation("save", {
                book_id: initial.book_id,
                item: { id: initial.id, expected: revision.current, document: snapshot },
              }),
            };
          }
          const job = pending.current;
          if (live.current) setStatus("Menyimpan…");
          const result = await mutate(job.operation);
          saved.current = job.document;
          revision.current = result.revision!;
          pending.current = null;
          if (live.current) {
            setVersion(revision.current);
            setStatus("Tersimpan di akun");
            setError("");
          }
          if (same(current.current, saved.current)) {
            await localQueue.current.catch(() => {});
            await storeLocal(account, "content:" + initial.id, null).catch(() => {});
            return;
          }
        }
      } catch (e) {
        if ((e as { code?: string }).code) pending.current = null;
        if (live.current) {
          setError(e instanceof Error ? e.message : String(e));
          setStatus("Draf belum tersinkron · coba simpan lagi");
          if ((e as any)?.code === "40001") {
            setConflict(true);
            pending.current = null;
          }
        }
        throw e;
      } finally {
        if (live.current) setSaving(false);
      }
    };
    const next = queue.current.catch(() => {}).then(run);
    queue.current = next;
    return next;
  }, [account, initial.id, initial.book_id, conflict]);
  const saveAndPublish = async () => {
    if (saving || publishing) return;
    setPublishing(true);
    setError("");
    try {
      await save();
      await mutate(
        operation("release", {
          book_id: initial.book_id,
          mode: "now",
          items: [{ id: initial.id, expected: revision.current, release_at: null }],
        }),
      );
      await onSaved();
      if (live.current) setStatus("Tersimpan & diterbitkan");
    } catch (e) {
      if (live.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (live.current) setPublishing(false);
    }
  };
  useEffect(() => {
    if (!dirty || !ready || conflict) return;
    const timer = setTimeout(() => void save().catch(() => {}), 1400);
    return () => clearTimeout(timer);
  }, [doc, dirty, ready, conflict, save]);
  useEffect(() => {
    const retry = () => {
      if (!same(current.current, saved.current)) void save().catch(() => {});
    };
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [save]);
  useLeaveGuard(dirty || saving, async () => {
    try {
      await save();
      return true;
    } catch {
      try {
        await storeLocal(account, "content:" + initial.id, {
          document: current.current,
          baseRevision: revision.current,
        });
        return window.confirm("Draf tersimpan di perangkat. Tinggalkan ruang Tulis dan sinkronkan nanti?");
      } catch {
        return false;
      }
    }
  });
  const recover = async (value: ContentDocument) => {
    try {
      const next = value.source ? { ...value, content_html: await sourceHtml(value.source) } : value;
      setDoc(next);
      current.current = next;
      setRestores((n) => n + 1);
      setRecovery(null);
      setHistory(null);
      setStatus("Draf dipulihkan · belum disinkronkan");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  const loadHistory = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from("qr_studio_versions")
        .select("id,revision,document,created_at")
        .eq("section_id", initial.id)
        .order("revision", { ascending: false })
        .limit(30);
      if (error) throw error;
      setHistory(data || []);
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <div className="ws-write">
      <header className="ws-write-header">
        <button type="button" onClick={() => navigate(`/studio/karya/${initial.book_id}`)}>
          ← Kelola
        </button>
        <span>{bookTitle}</span>
        <button type="button" onClick={() => setPreview(true)} disabled={!ready}>
          Pratinjau
        </button>
      </header>
      <main className="ws-paper">
        <div className="ws-writing-status">
          <span role="status">{status}</span>
          <div className="ws-writing-actions">
            <button type="button" onClick={() => void save().catch(() => {})} disabled={saving || publishing}>
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
            <button
              type="button"
              className="ws-primary"
              onClick={() => void saveAndPublish()}
              disabled={saving || publishing || !ready}
            >
              {publishing ? "Menerbitkan…" : "Simpan & Terbitkan"}
            </button>
          </div>
        </div>
        {initial.is_enabled && (
          <p className="ws-hint">
            Klik <strong>Simpan</strong> untuk menyimpan draf revisi privat, atau <strong>Simpan & Terbitkan</strong> untuk langsung memperbarui bacaan publik.
          </p>
        )}
        {error && (
          <p className="ws-error" role="alert">
            {error}
          </p>
        )}
        {recovery && (
          <section className="ws-notice">
            <p>
              Ada draf perangkat yang belum tersinkron
              {recovery.baseRevision !== version ? " dan berbeda dari versi akun" : ""}.
            </p>
            <button type="button" onClick={() => recover(recovery.document)}>
              Pulihkan draf perangkat
            </button>
            <button
              type="button"
              onClick={() => {
                setRecovery(null);
                void storeLocal(account, "content:" + initial.id, null);
              }}
            >
              Gunakan versi akun
            </button>
          </section>
        )}
        {conflict && (
          <section className="ws-notice">
            <p>Versi akun berubah. Draf perangkat tetap tersedia.</p>
            <button
              type="button"
              onClick={() =>
                void content(initial.id).then((remote) => {
                  setHistory([
                    { revision: remote.revision, document: documentOf(remote), created_at: remote.updated_at },
                  ]);
                })
              }
            >
              Bandingkan versi akun
            </button>
            <button
              type="button"
              onClick={() =>
                void content(initial.id).then((remote) => {
                  revision.current = remote.revision;
                  setVersion(remote.revision);
                  saved.current = documentOf(remote);
                  setConflict(false);
                  setError("");
                  setStatus("Draf lokal siap disimpan di atas versi terbaru");
                })
              }
            >
              Pertahankan draf saya sebagai revisi baru
            </button>
          </section>
        )}
        <input
          className="ws-title-input"
          aria-label="Judul bagian"
          maxLength={180}
          value={doc.title}
          onChange={(e) => setDoc((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Judul bab atau bagian…"
        />
        <details className="ws-writing-details">
          <summary>Jenis dan bagian ({kindNames[doc.kind]})</summary>
          <div className="ws-two-fields">
            <label>
              Jenis
              <select
                value={doc.kind}
                onChange={(e) =>
                  setDoc((prev) => ({
                    ...prev,
                    kind: e.target.value as SectionKind,
                    display_number: e.target.value === "chapter" ? (prev.display_number ?? 1) : null,
                  }))
                }
              >
                {Object.entries(kindNames).map(([value, name]) => (
                  <option key={value} value={value}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            {doc.kind === "chapter" && (
              <label>
                Nomor bab
                <input
                  type="number"
                  min="0"
                  max="9999"
                  value={doc.display_number ?? ""}
                  onChange={(e) =>
                    setDoc((prev) => ({
                      ...prev,
                      display_number: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                />
              </label>
            )}
          </div>
          <label>
            Bagian / arc (opsional)
            <input
              value={doc.arc_title}
              maxLength={180}
              onChange={(e) => setDoc((prev) => ({ ...prev, arc_title: e.target.value }))}
              placeholder="Contoh: Bagian I"
            />
          </label>
        </details>
        {ready ? (
          <VisualEditor key={restores} document={doc} onChange={setDoc} />
        ) : (
          <p role="status">Memuat naskah asli…</p>
        )}
        <footer className="ws-writing-footer">
          <span>
            {plain(doc.content_md).split(/\s+/).filter(Boolean).length.toLocaleString("id-ID")} kata · versi {version}
          </span>
          <button type="button" onClick={() => void loadHistory()}>
            Riwayat revisi
          </button>
        </footer>
        {history && (
          <section className="ws-history">
            <h2>Bandingkan dan pulihkan</h2>
            <p>Pemulihan disimpan sebagai draf. Versi terbit tetap tersedia bagi pembaca.</p>
            <button type="button" onClick={() => setHistory(null)}>
              Tutup riwayat
            </button>
            {history.map((row) => (
              <details key={row.id || row.revision}>
                <summary>
                  Versi {row.revision} · {new Date(row.created_at).toLocaleString("id-ID")}
                </summary>
                <pre>{row.document.content_md || row.document.title}</pre>
                <button type="button" onClick={() => recover(row.document)}>
                  Pulihkan sebagai draf
                </button>
              </details>
            ))}
          </section>
        )}
      </main>
      {preview && (
        <Suspense fallback={<p>Menyiapkan pembaca…</p>}>
          <Preview document={doc} bookTitle={bookTitle} onClose={() => setPreview(false)} />
        </Suspense>
      )}
    </div>
  );
}
export default function EditorRoom({
  id,
  account,
  bookTitle,
  onSaved,
}: {
  id: string;
  account: string;
  bookTitle: string;
  onSaved: () => Promise<void>;
}) {
  const [row, setRow] = useState<ContentItem | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void content(id)
      .then((item) => {
        if (active) setRow(item);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [id]);
  if (error)
    return (
      <div className="ws-empty">
        <p role="alert">{error}</p>
        <button onClick={() => navigate("/studio")}>Kembali ke Karya</button>
      </div>
    );
  if (!row || row.id !== id)
    return (
      <p className="ws-loading" role="status">
        Menyiapkan ruang Tulis…
      </p>
    );
  return <Session key={id} initial={row} account={account} bookTitle={bookTitle} onSaved={onSaved} />;
}
