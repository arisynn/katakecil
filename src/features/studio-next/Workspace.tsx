import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import type { Book, Episode } from "../../data/library";
import { formatWib } from "../../data/library";
import { supabase } from "../../data/supabase";
import { navigate, mayLeave } from "../../utils/nav";
import BrandLogo from "../../components/BrandLogo";
import BrandIcon from "../../components/BrandIcon";
import ThemeToggle from "../../components/ThemeToggle";
import { Cover } from "../covers/AuthorCover";
import { BookForm } from "../studio/components/BookManagement";
import { contents, mutate, operation, type Operation } from "./api";
import { kindNames, status, narrative, type ContentItem } from "./model";
import type { AppThemePreference, UiTheme } from "../../hooks/useUiTheme";
import "./workspace.css";
const Upload = lazy(() => import("./UploadRoom")),
  Editor = lazy(() => import("./EditorRoom")),
  Releases = lazy(() => import("./ReleaseRoom"));
const Trash = lazy(() => import("../../pages/TrashManager")),
  Announcements = lazy(() => import("../studio/components/AnnouncementManager"));
const Analytics = lazy(() => import("../studio/components/StudioOverview").then((m) => ({ default: m.Analytics }))),
  Settings = lazy(() => import("../studio/components/StudioOverview").then((m) => ({ default: m.StudioSettings }))),
  Database = lazy(() => import("./DataRoom"));
function remembered(key: string) {
  try {
    return sessionStorage.getItem(key) || "";
  } catch {
    return "";
  }
}
const busyFallback = (
  <p className="ws-loading" role="status">
    Menyiapkan ruang kerja…
  </p>
);
type Props = {
  path: string;
  user: User;
  books: Book[];
  episodes: Episode[];
  refresh: () => Promise<void>;
  theme: UiTheme;
  preference: AppThemePreference;
  onPreferenceChange: (value: AppThemePreference) => void;
};
export default function Workspace({
  path,
  user,
  books,
  episodes,
  refresh,
  theme,
  preference,
  onPreferenceChange,
}: Props) {
  const [items, setItems] = useState<ContentItem[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [query, setQuery] = useState(() => remembered("kk-workspace-content-query")),
    [menu, setMenu] = useState(false),
    [filter, setFilter] = useState("all"),
    [message, setMessage] = useState(""),
    [acting, setActing] = useState(false),
    [trash, setTrash] = useState(false);
  const [workQuery, setWorkQuery] = useState(() => remembered("kk-workspace-work-query"));
  const [releaseView, setReleaseView] = useState("upcoming"),
    [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const sections = path.split("/").filter(Boolean),
    isEditor = ["tulis", "editor"].includes(sections[1]),
    isUpload = ["upload", "impor"].includes(sections[1]) || sections[3] === "upload" || sections[2] === "baru",
    bookId =
      ["karya", "cerita"].includes(sections[1]) && sections[2] !== "baru"
        ? decodeURIComponent(sections[2] || "")
        : undefined;
  const book = books.find((b) => b.id === bookId),
    tab = sections[3] || "isi",
    ticket = useRef(0),
    pending = useRef<Operation | null>(null);
  const reload = useCallback(async () => {
    const token = ++ticket.current;
    try {
      const result = await contents();
      if (token === ticket.current) {
        setItems(result);
        setError("");
      }
    } catch (e) {
      if (token === ticket.current) setError((e as Error).message);
    } finally {
      if (token === ticket.current) setLoading(false);
    }
  }, []);
  const changed = useCallback(async () => {
    await Promise.all([reload(), refresh()]);
  }, [reload, refresh]);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setMenu(false);
    void (async () => {
      try {
        const catalog = await supabase!.from("qr_studio_books").select("book_id");
        if (catalog.error) throw Error("Pembaruan Studio belum aktif di server. Coba lagi setelah backend diperbarui.");
        const known = new Set((catalog.data || []).map((b) => b.book_id));
        for (const entry of books) {
          if (!active) break;
          if (!known.has(entry.id)) await mutate(operation("adopt", { book_id: entry.id }));
        }
        if (active) await reload();
      } catch (e) {
        if (active) {
          setError((e as Error).message);
          setLoading(false);
        }
      }
    })();
    return () => {
      active = false;
    };
  }, [path, bookId, reload]);
  useEffect(() => {
    try {
      sessionStorage.setItem("kk-workspace-content-query", query);
      sessionStorage.setItem("kk-workspace-work-query", workQuery);
    } catch {}
  }, [query, workQuery]);
  const rows = items.filter((p) => p.book_id === bookId),
    activeRows = rows.filter((p) => !p.deleted_at),
    unpublishedRows = activeRows.filter(
      (p) => !p.is_enabled || (p.is_enabled && p.revision !== p.published_revision),
    ),
    shown = rows
      .filter(
        (p) =>
          Boolean(p.deleted_at) === trash &&
          (filter === "all" || (filter === "pages" ? !narrative(p.kind) : narrative(p.kind))),
      )
      .filter((p) =>
        `${p.title} ${p.display_number ?? ""} ${p.arc_title}`
          .toLocaleLowerCase("id")
          .includes(query.toLocaleLowerCase("id")),
      );
  const action = async (op: Operation, customMessage = "Perubahan tersimpan.") => {
    if (acting) return;
    setActing(true);
    setError("");
    setMessage("");
    try {
      pending.current ??= op;
      await mutate(pending.current);
      pending.current = null;
      await changed();
      setMessage(customMessage);
    } catch (e) {
      if ((e as { code?: string }).code) pending.current = null;
      setError((e as Error).message);
    } finally {
      setActing(false);
    }
  };
  const quickPublishItem = async (item: ContentItem) => {
    if (!book || acting) return;
    await action(
      operation("release", {
        book_id: book.id,
        mode: "now",
        items: [{ id: item.id, expected: item.revision, release_at: null }],
      }),
      `“${item.title}” berhasil diterbitkan.`,
    );
  };
  const quickPublishAll = async () => {
    if (!book || !unpublishedRows.length || acting) return;
    await action(
      operation("release", {
        book_id: book.id,
        mode: "now",
        items: unpublishedRows.map((p) => ({ id: p.id, expected: p.revision, release_at: null })),
      }),
      `${unpublishedRows.length} bagian berhasil diterbitkan.`,
    );
  };
  const create = async () => {
    if (!book || acting) return;
    setActing(true);
    setError("");
    try {
      const number = Math.max(0, ...rows.filter((p) => p.kind === "chapter").map((p) => p.display_number ?? 0)) + 1;
      const result = await mutate(
        operation("save", {
          book_id: book.id,
          item: {
            document: {
              title: `Bab ${number}`,
              kind: "chapter",
              display_number: number,
              arc_title: "",
              content_md: "",
              source: null,
            },
          },
        }),
      );
      await reload();
      navigate(`/studio/tulis/${result.ids[0]}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setActing(false);
    }
  };
  const order = async (id: string, delta: number) => {
    const list = rows.filter((p) => !p.deleted_at).map((p) => p.id),
      at = list.indexOf(id),
      to = at + delta;
    if (to < 0 || to >= list.length) return;
    [list[at], list[to]] = [list[to], list[at]];
    await action(operation("order", { book_id: book!.id, ids: list }));
  };
  if (isEditor) {
    const row = items.find((p) => p.id === sections[2]),
      legacy = episodes.find((ep) => ep.id === sections[2]),
      title = books.find((b) => b.id === (row?.book_id || legacy?.book_id))?.title || "Ruang Tulis";
    return (
      <div className="ws-root">
        <Suspense fallback={busyFallback}>
          {loading ? busyFallback : <Editor id={sections[2]} account={user.id} bookTitle={title} onSaved={changed} />}
        </Suspense>
      </div>
    );
  }
  const globalReleases = items
    .filter(
      (p) =>
        !p.deleted_at &&
        p.is_enabled &&
        p.release_at &&
        narrative(p.kind) &&
        (releaseView === "upcoming" ? Date.parse(p.release_at) > Date.now() : Date.parse(p.release_at) <= Date.now()),
    )
    .sort((a, b) => Date.parse(a.release_at!) - Date.parse(b.release_at!));
  return (
    <div className="ws-root">
      <header className="ws-topbar">
        <button type="button" className="ws-brand" onClick={() => navigate("/studio")} aria-label="Karya Studio">
          <BrandLogo />
          <span>STUDIO PENULIS</span>
        </button>
        <div className="ws-top-actions">
          <button type="button" className="ws-top-link" onClick={() => navigate("/")}>
            Perpustakaan
          </button>
          <ThemeToggle theme={theme} preference={preference} onPreferenceChange={onPreferenceChange} />
          <button type="button" aria-label="Menu akun" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
            <BrandIcon name="menu" size={20} />
          </button>
          {menu && (
            <div className="ws-account-menu">
              <small>{user.email}</small>
              <button type="button" onClick={() => navigate("/")}>
                Buka perpustakaan
              </button>
              <button
                type="button"
                onClick={() =>
                  void (async () => {
                    if (await mayLeave()) await supabase?.auth.signOut();
                  })()
                }
              >
                Keluar akun
              </button>
            </div>
          )}
        </div>
      </header>
      <nav className="ws-navigation" aria-label="Navigasi Studio">
        <button
          type="button"
          aria-current={
            !["upload", "impor", "rilis", "jadwal", "lainnya", "settings", "analytics", "database", "sampah", "pengumuman"].includes(
              sections[1],
            )
              ? "page"
              : undefined
          }
          onClick={() => navigate("/studio")}
        >
          Karya
        </button>
        <button
          type="button"
          aria-current={["upload", "impor"].includes(sections[1]) ? "page" : undefined}
          onClick={() => navigate("/studio/upload")}
        >
          Upload EPUB
        </button>
        <button
          type="button"
          aria-current={["rilis", "jadwal"].includes(sections[1]) ? "page" : undefined}
          onClick={() => navigate("/studio/rilis")}
        >
          Rilis
        </button>
        <button
          type="button"
          aria-current={
            ["lainnya", "settings", "analytics", "database", "sampah", "pengumuman"].includes(sections[1])
              ? "page"
              : undefined
          }
          onClick={() => navigate("/studio/lainnya")}
        >
          Lainnya
        </button>
      </nav>
      <main className="ws-main">
        <Suspense fallback={busyFallback}>
          {error && (
            <div className="ws-error" role="alert">
              <p>{error}</p>
              <button type="button" onClick={() => (pending.current ? void action(pending.current) : void reload())}>
                Coba lagi
              </button>
            </div>
          )}
          {message && (
            <p className="ws-success" role="status">
              {message}
            </p>
          )}
          {isUpload ? (
            <Upload
              key={bookId || "new"}
              account={user.id}
              books={books}
              bookId={bookId}
              items={items}
              onChanged={changed}
            />
          ) : loading ? (
            busyFallback
          ) : book ? (
            <>
              <header className="ws-page-head">
                <div>
                  <button className="ws-back" type="button" onClick={() => navigate("/studio")}>
                    ← Semua karya
                  </button>
                  <h1>{book.title}</h1>
                  <p>
                    {activeRows.filter((p) => p.kind === "chapter").length} bab ·{" "}
                    {activeRows.filter((p) => p.is_enabled).length} terbit ·{" "}
                    {book.is_published ? "Tampil di perpustakaan" : "Privat"}
                  </p>
                </div>
                <div className="ws-head-actions">
                  <button type="button" onClick={() => void create()} disabled={acting}>
                    + Tulis bab
                  </button>
                  <button
                    type="button"
                    className="ws-primary"
                    onClick={() => navigate(`/studio/karya/${book.id}/upload`)}
                  >
                    Tambah isi
                  </button>
                </div>
              </header>
              <nav className="ws-book-tabs" aria-label="Kelola buku">
                {[
                  ["isi", "Isi"],
                  ["rilis", "Rilis"],
                  ["detail", "Detail buku"],
                ].map(([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    aria-current={tab === value ? "page" : undefined}
                    onClick={() => navigate(`/studio/karya/${book.id}${value === "isi" ? "" : "/" + value}`)}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              {tab === "rilis" ? (
                <Releases key={book.id} book={book} items={rows} onChanged={changed} />
              ) : tab === "detail" ? (
                <div className="ws-panel ws-legacy-form">
                  <BookForm existing={book} onSaved={() => void changed()} />
                  <details>
                    <summary>Pengelolaan buku</summary>
                    <button
                      type="button"
                      onClick={() =>
                        void (async () => {
                          if (!window.confirm(`Pindahkan “${book.title}” ke Sampah?`)) return;
                          const { error } = await supabase!
                            .from("qr_books")
                            .update({ deleted_at: new Date().toISOString(), is_published: false })
                            .eq("id", book.id);
                          if (error) setError(error.message);
                          else {
                            await changed();
                            navigate("/studio");
                          }
                        })()
                      }
                    >
                      Pindahkan buku ke Sampah
                    </button>
                  </details>
                </div>
              ) : (
                <>
                  {!trash && unpublishedRows.length > 0 && (
                    <div className="ws-quick-publish-bar">
                      <span>
                        <strong>{unpublishedRows.length} bagian</strong> belum diterbitkan (draf atau revisi baru).
                      </span>
                      <button
                        type="button"
                        className="ws-primary"
                        disabled={acting}
                        onClick={() => void quickPublishAll()}
                      >
                        {acting ? "Memproses…" : "Terbitkan semua sekarang"}
                      </button>
                    </div>
                  )}
                  <div className="ws-list-tools">
                    <label className="ws-search">
                      Cari isi
                      <input
                        aria-label="Cari isi buku"
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Judul, nomor, atau bagian…"
                      />
                    </label>
                    <label>
                      Tampilkan
                      <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="all">Semua isi</option>
                        <option value="chapters">Cerita</option>
                        <option value="pages">Halaman buku</option>
                      </select>
                    </label>
                    <button type="button" onClick={() => void create()} disabled={acting}>
                      Tulis langsung
                    </button>
                  </div>
                  <div className="ws-contents-list">
                    {shown.map((item) => {
                      const itemStatus = status(item),
                        hasDraftRev = item.is_enabled && item.revision !== item.published_revision;
                      return (
                        <article className="ws-content-row" key={item.id}>
                          <span className="ws-row-index">
                            {item.kind === "chapter" ? String(item.display_number ?? "—").padStart(2, "0") : "•"}
                          </span>
                          <button
                            type="button"
                            className="ws-content-title"
                            onClick={() => navigate(`/studio/tulis/${item.id}`)}
                          >
                            <strong>{item.title}</strong>
                            <small>
                              {kindNames[item.kind]} · {itemStatus}
                              {hasDraftRev ? " · Ada draf revisi" : ""}
                            </small>
                          </button>
                          {!trash && (!item.is_enabled || hasDraftRev) && (
                            <button
                              type="button"
                              className="ws-row-publish"
                              disabled={acting}
                              onClick={() => void quickPublishItem(item)}
                            >
                              {hasDraftRev ? "Terapkan revisi" : "Terbitkan"}
                            </button>
                          )}
                          <button type="button" onClick={() => navigate(`/studio/tulis/${item.id}`)}>
                            Edit
                          </button>
                          <details className="ws-row-menu">
                            <summary aria-label={`Aksi ${item.title}`}>•••</summary>
                            <div>
                              <button type="button" disabled={acting || trash} onClick={() => void order(item.id, -1)}>
                                Naik
                              </button>
                              <button type="button" disabled={acting || trash} onClick={() => void order(item.id, 1)}>
                                Turun
                              </button>
                              <button
                                type="button"
                                disabled={acting}
                                onClick={() =>
                                  void action(operation(trash ? "restore" : "trash", { book_id: book.id, id: item.id }))
                                }
                              >
                                {trash ? "Pulihkan sebagai draf" : "Pindahkan ke Sampah"}
                              </button>
                            </div>
                          </details>
                        </article>
                      );
                    })}
                    {!shown.length && (
                      <div className="ws-empty">
                        <h2>
                          {trash
                            ? "Sampah buku kosong."
                            : rows.length
                              ? "Tidak ada isi yang cocok."
                              : "Ceritamu siap diisi."}
                        </h2>
                        <p>Upload file EPUB/naskah atau mulai menulis langsung.</p>
                      </div>
                    )}
                  </div>
                  <button type="button" className="ws-subtle" onClick={() => setTrash((v) => !v)}>
                    {trash ? "Kembali ke isi aktif" : `Sampah buku (${rows.filter((p) => p.deleted_at).length})`}
                  </button>
                </>
              )}
            </>
          ) : ["rilis", "jadwal"].includes(sections[1]) ? (
            <>
              <header className="ws-page-head">
                <div>
                  <span className="ws-eyebrow">PENERBITAN</span>
                  <h1>Rilis cerita.</h1>
                  <p>Jadwal dan isi yang sudah dibagikan.</p>
                </div>
              </header>
              <div className="ws-actions">
                <button
                  type="button"
                  aria-pressed={releaseView === "upcoming"}
                  onClick={() => setReleaseView("upcoming")}
                >
                  Mendatang
                </button>
                <button
                  type="button"
                  aria-pressed={releaseView === "published"}
                  onClick={() => setReleaseView("published")}
                >
                  Sudah terbit
                </button>
              </div>
              <section className="ws-panel">
                {globalReleases.length ? (
                  globalReleases.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className="ws-release-event"
                      onClick={() => navigate(`/studio/karya/${item.book_id}/rilis`)}
                    >
                      <span>
                        <strong>{item.title}</strong>
                        <small>{books.find((b) => b.id === item.book_id)?.title}</small>
                      </span>
                      <span>
                        {formatWib(item.release_at)}
                        <small>{status(item)}</small>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="ws-empty">
                    <h2>Jadwalmu masih lapang.</h2>
                    <p>Buka sebuah karya untuk menerbitkan atau mengatur jadwalnya.</p>
                  </div>
                )}
              </section>
            </>
          ) : sections[1] === "lainnya" ? (
            <>
              <header className="ws-page-head">
                <div>
                  <span className="ws-eyebrow">ALAT PENULIS</span>
                  <h1>Alat penulis.</h1>
                  <p>Cadangkan data, atur pengumuman, atau kelola sampah karya.</p>
                </div>
              </header>
              <div className="ws-tools-grid">
                {[
                  ["database", "Ekspor & data", "Unduh salinan lengkap naskah & EPUB dalam satu ZIP."],
                  ["pengumuman", "Pengumuman", "Bagikan kabar terbaru kepada pembaca di beranda."],
                  ["sampah", "Sampah", "Pulihkan karya atau bab yang dipindahkan ke sampah."],
                  ["settings", "Pengaturan", "Sesuaikan preferensi ruang menulis."],
                  ["analytics", "Statistik", "Ringkasan jumlah karya dan bab terbit."],
                ].map(([route, name, description]) => (
                  <button type="button" key={route} onClick={() => navigate("/studio/" + route)}>
                    <strong>{name}</strong>
                    <span>{description}</span>
                  </button>
                ))}
              </div>
            </>
          ) : sections[1] === "sampah" ? (
            <Trash onChanged={changed} />
          ) : sections[1] === "pengumuman" ? (
            <Announcements books={books} />
          ) : sections[1] === "settings" ? (
            <Settings />
          ) : sections[1] === "analytics" ? (
            <Analytics
              books={books}
              episodes={items
                .filter((p) => narrative(p.kind))
                .map((p) => ({ ...p, episode_number: p.reader_number, created_at: p.updated_at }))}
            />
          ) : sections[1] === "database" ? (
            <Database books={books} />
          ) : (
            <>
              <header className="ws-page-head">
                <div>
                  <span className="ws-eyebrow">RUANG PRIBADI PENULIS</span>
                  <h1>Cerita, satu per satu.</h1>
                  <p>Upload EPUB instan, lanjutkan menulis, atau kelola penerbitan dengan cepat.</p>
                </div>
                <button type="button" className="ws-primary" onClick={() => navigate("/studio/upload")}>
                  Tambah cerita
                </button>
              </header>
              {books.length > 0 && (
                <label className="ws-search ws-work-search">
                  Cari karya
                  <input
                    aria-label="Cari karya"
                    type="search"
                    value={workQuery}
                    placeholder="Judul atau genre…"
                    onChange={(e) => setWorkQuery(e.target.value)}
                  />
                </label>
              )}
              <div className="ws-books">
                {books
                  .filter((b) =>
                    `${b.title} ${b.genre}`.toLocaleLowerCase("id").includes(workQuery.toLocaleLowerCase("id")),
                  )
                  .map((b) => {
                    const local = items.filter((p) => p.book_id === b.id && !p.deleted_at),
                      last = [...local]
                        .filter((p) => narrative(p.kind) && (!p.is_enabled || p.revision !== p.published_revision))
                        .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))[0];
                    return (
                      <article className="ws-book-card" key={b.id}>
                        <button
                          type="button"
                          className="ws-book-open"
                          onClick={() => {
                            setQuery("");
                            navigate(`/studio/karya/${b.id}`);
                          }}
                        >
                          <div className="ws-cover">
                            <Cover book={b} size="mini" />
                          </div>
                          <span>
                            <small>
                              <span className={b.is_published ? "ws-dot ws-dot-pub" : "ws-dot"} />
                              {b.is_published ? "Publik" : "Privat"} · {b.genre}
                            </small>
                            <strong>{b.title}</strong>
                            <small>
                              {local.length
                                ? `${local.filter((p) => p.kind === "chapter").length} bab · ${local.filter((p) => p.is_enabled).length} terbit · ${local.filter((p) => !p.is_enabled).length} draf`
                                : "Buka untuk menyiapkan isi buku"}
                            </small>
                          </span>
                          <span aria-hidden="true">→</span>
                        </button>
                        <div className="ws-book-card-footer">
                          {last ? (
                            <button
                              className="ws-resume"
                              type="button"
                              onClick={() => navigate(`/studio/tulis/${last.id}`)}
                            >
                              Lanjutkan: {last.title} →
                            </button>
                          ) : (
                            <button
                              className="ws-resume"
                              type="button"
                              onClick={() => navigate(`/studio/karya/${b.id}`)}
                            >
                              Buka daftar bab →
                            </button>
                          )}
                          <button
                            className="ws-card-upload-btn"
                            type="button"
                            title="Upload EPUB atau naskah ke cerita ini"
                            onClick={() => navigate(`/studio/karya/${b.id}/upload`)}
                          >
                            + Upload
                          </button>
                        </div>
                      </article>
                    );
                  })}
              </div>
              {books.length > 0 && (
                <details className="ws-panel ws-bulk-books">
                  <summary>Kelola beberapa karya</summary>
                  <div className="ws-actions">
                    <button type="button" onClick={() => setSelectedBooks(books.map((b) => b.id))}>
                      Pilih semua karya
                    </button>
                    <button type="button" onClick={() => setSelectedBooks([])}>
                      Batal pilih
                    </button>
                  </div>
                  {books.map((b) => (
                    <label className="ws-check" key={b.id}>
                      <input
                        type="checkbox"
                        checked={selectedBooks.includes(b.id)}
                        onChange={(e) =>
                          setSelectedBooks((prev) =>
                            e.target.checked ? [...prev, b.id] : prev.filter((id) => id !== b.id),
                          )
                        }
                      />
                      {b.title}
                    </label>
                  ))}
                  <button
                    type="button"
                    disabled={acting || !selectedBooks.length}
                    onClick={() =>
                      void (async () => {
                        if (
                          !window.confirm(
                            `Pindahkan ${selectedBooks.length} karya ke Sampah? Semuanya dapat dipulihkan.`,
                          )
                        )
                          return;
                        setActing(true);
                        const { error } = await supabase!
                          .from("qr_books")
                          .update({ deleted_at: new Date().toISOString(), is_published: false })
                          .in("id", selectedBooks);
                        if (error) setError(error.message);
                        else {
                          setSelectedBooks([]);
                          await changed();
                        }
                        setActing(false);
                      })()
                    }
                  >
                    Pindahkan {selectedBooks.length} karya ke Sampah
                  </button>
                </details>
              )}
              {!books.length && (
                <section className="ws-empty ws-panel">
                  <BrandIcon name="book-open" size={36} />
                  <h2>Sebuah cerita menunggu.</h2>
                  <p>Kamu bisa mulai dengan file EPUB/naskah yang sudah ada atau menempelkan teks.</p>
                  <button type="button" className="ws-primary" onClick={() => navigate("/studio/upload")}>
                    Masukkan cerita pertama
                  </button>
                </section>
              )}
            </>
          )}
        </Suspense>
      </main>
      <footer className="ws-footer">Ruang pribadi penulis · KataKecil Studio.</footer>
    </div>
  );
}
