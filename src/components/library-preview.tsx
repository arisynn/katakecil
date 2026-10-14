import { useEffect, useMemo, useState } from "react";
import { SmartCover } from "@/components/smart-cover";
import {
  classifyCover,
  formatBytes,
  prepareCoverFile,
  type CoverMeasure,
  type PreparedCover,
} from "@/lib/cover-fit";

type Story = {
  id: string;
  title: string;
  genre: string;
  synopsis: string;
  src: string;
  measure: CoverMeasure;
};

const RAW = [
  ["senja", "Senja di Ujung Kota", "Romansa", "Dua hati yang selalu bertemu di waktu yang salah, di atap kota yang belum tidur.", "/covers/senja.jpg", 1008, 1792],
  ["langit", "Langit yang Sama", "Romansa", "Satu langit, dua perjalanan, dan hal kecil yang membuat seseorang kembali.", "/covers/langit.jpg", 1200, 1600],
  ["jejak", "Jejak di Kertas", "Slice of Life", "Di antara halaman dan ingatan, ada cerita yang belum selesai ditulis.", "/covers/jejak.jpg", 1152, 1728],
  ["rumah", "Rumah Kedua", "Keluarga", "Pulang tidak selalu berarti kembali ke tempat yang sama.", "/covers/rumah.jpg", 1792, 1008],
  ["hujan", "Sebelum Hujan", "Romansa", "Ketika langit berubah warna, ada janji yang masih menunggu.", "/covers/hujan.jpg", 1408, 1408],
  ["bunga", "Bunga Terakhir", "Fantasi", "Di taman yang terlupakan, satu bunga menyimpan harapan yang panjang.", "/covers/bunga.jpg", 1008, 2741],
] as const;

const STORIES: Story[] = RAW.map(([id, title, genre, synopsis, src, w, h]) => ({
  id,
  title,
  genre,
  synopsis,
  src,
  measure: classifyCover(w, h)!,
}));

function Mark() {
  return (
    <svg viewBox="0 0 128 128" aria-hidden="true">
      <defs>
        <linearGradient id="feather" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#C7E5FF" />
          <stop offset=".48" stopColor="#79B9F8" />
          <stop offset="1" stopColor="#235DB4" />
        </linearGradient>
      </defs>
      <path d="M107 16C76 14 42 28 29 59c-7 16-5 30 2 39 18 5 39-4 53-22 15-19 23-41 23-60Z" fill="url(#feather)" />
      <path d="M20 114C36 81 59 54 96 28" stroke="#D9F0FF" strokeWidth="5.5" fill="none" strokeLinecap="round" />
      <path d="m43 82-11-11m24-8-11-14m26 2-7-17m17 7 13-13" fill="none" stroke="#F5FBFF" strokeWidth="2.6" strokeLinecap="round" opacity=".85" />
    </svg>
  );
}

export function LibraryPreview() {
  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [ready, setReady] = useState(false);
  const [tab, setTab] = useState<"rak" | "studio">("rak");
  const [open, setOpen] = useState<string | null>(null);
  const [prepared, setPrepared] = useState<PreparedCover | null>(null);
  const [sampleId, setSampleId] = useState<string | null>("senja");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("appThemePreference");
    const next = stored === "light" || stored === "dark"
      ? stored
      : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(next);
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    document.documentElement.setAttribute("data-app-theme", theme);
    localStorage.setItem("appThemePreference", theme);
  }, [theme, ready]);

  const story = STORIES.find((item) => item.id === open) ?? null;
  const sample = STORIES.find((item) => item.id === sampleId) ?? null;
  const active = useMemo(() => {
    if (prepared) return { src: prepared.previewUrl, measure: prepared.measure, title: "Sampul baru" };
    if (sample) return { src: sample.src, measure: sample.measure, title: sample.title };
    return null;
  }, [prepared, sample]);

  async function onFile(file: File | null) {
    setError("");
    if (!file) return;
    setBusy(true);
    const result = await prepareCoverFile(file);
    setBusy(false);
    if ("error" in result) {
      setPrepared(null);
      setError(result.error);
      return;
    }
    setPrepared((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return result;
    });
    setSampleId(null);
  }

  return (
    <div className="app-shell">
      <header className="app-top">
        <div className="brand">
          <Mark />
          <div>
            <strong>KataKecil</strong>
            <small>SAMPUL PINTAR</small>
          </div>
        </div>
        <button
          type="button"
          className="icon-btn"
          aria-label={theme === "dark" ? "Tema terang" : "Tema gelap"}
          onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
        >
          {theme === "dark" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" strokeLinecap="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
              <path d="M16 3.2A8.5 8.5 0 1 0 20.8 13 7 7 0 0 1 16 3.2Z" strokeLinejoin="round" />
            </svg>
          )}
        </button>
      </header>

      {story ? (
        <article>
          <button type="button" className="back" onClick={() => setOpen(null)}>← Rak</button>
          <SmartCover src={story.src} title={story.title} surface="detail" known={story.measure} />
          <div className="detail-copy">
            <h1>{story.title}</h1>
            <div className="chips">
              <span className="chip">{story.genre}</span>
              <span className="chip">{story.measure.ratioName}</span>
              <span className="chip">{story.measure.label}</span>
            </div>
            <p>{story.synopsis}</p>
            <div className="note">
              <strong>Di halaman detail</strong>
              {story.measure.hint}
              {story.measure.kind === "poster" ? " Geser gambarnya ke bawah." : ""}
            </div>
          </div>
        </article>
      ) : tab === "rak" ? (
        <section>
          <p className="kicker">CERITA KECIL, MAKNA BESAR</p>
          <h1 className="hero-title">Rak yang tidak memotong sampul.</h1>
          <p className="lede">Wallpaper 9:16, sampul 3:4, poster panjang, dan gambar lebar tetap utuh. Bingkai rak tetap sejajar.</p>
          <div className="shelf">
            {STORIES.map((item) => (
              <article key={item.id}>
                <button type="button" className="story-open" onClick={() => setOpen(item.id)} aria-label={`Lihat ${item.title}`}>
                  <SmartCover src={item.src} title={item.title} surface="shelf" known={item.measure} />
                  <span className="story-title">{item.title}</span>
                  <span className="story-meta">{item.measure.ratioName} · {item.measure.label}</span>
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : (
        <section className="studio-lead">
          <p className="kicker">STUDIO</p>
          <h1 className="hero-title">Unggah, lalu lihat tiga tempat.</h1>
          <p className="lede">JPG, PNG, atau WebP. Gambar dikecilkan ke WebP sebelum naik, paling panjang 1600 px, maksimal 5 MB.</p>
          <label className="picker">
            {busy ? "Membaca gambar…" : "Pilih sampul dari HP"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif"
              onChange={(event) => {
                const file = event.target.files?.[0] ?? null;
                event.target.value = "";
                void onFile(file);
              }}
            />
          </label>
          <div className="examples" aria-label="Contoh rasio">
            {STORIES.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`example ${sampleId === item.id && !prepared ? "is-on" : ""}`}
                onClick={() => {
                  setError("");
                  setPrepared((prev) => {
                    if (prev) URL.revokeObjectURL(prev.previewUrl);
                    return null;
                  });
                  setSampleId(item.id);
                }}
              >
                <SmartCover src={item.src} title={item.title} surface="thumb" known={item.measure} />
                <span>{item.measure.label}</span>
              </button>
            ))}
          </div>
          {error && <div className="alert" role="alert">{error}</div>}
          {active && (
            <>
              <div className="measure">
                <b>{active.measure.ratioName} · {active.measure.label}</b>
                <span>{active.measure.width}×{active.measure.height}</span>
              </div>
              <p className="lede" style={{ marginTop: 10 }}>{active.measure.hint}</p>
              <div className="mocks">
                <figure className="mock">
                  <SmartCover src={active.src} title={active.title} surface="shelf" known={active.measure} />
                  <figcaption>Rak</figcaption>
                </figure>
                <figure className="mock mock-detail">
                  <SmartCover src={active.src} title={active.title} surface="detail" known={active.measure} />
                  <figcaption>Detail</figcaption>
                </figure>
                <figure className="mock">
                  <SmartCover src={active.src} title={active.title} surface="thumb" known={active.measure} />
                  <figcaption>Daftar</figcaption>
                </figure>
              </div>
              {prepared && (
                <p className="sizes">
                  File asli {formatBytes(prepared.beforeBytes)} menjadi {formatBytes(prepared.blob.size)} WebP.
                  Yang naik nanti adalah gambar utuh, bukan potongan.
                </p>
              )}
            </>
          )}
        </section>
      )}

      {!story && (
        <nav className="tabbar" aria-label="Bagian">
          <button type="button" className={tab === "rak" ? "is-on" : ""} onClick={() => setTab("rak")}>Rak</button>
          <button type="button" className={tab === "studio" ? "is-on" : ""} onClick={() => setTab("studio")}>Studio</button>
        </nav>
      )}
    </div>
  );
}
