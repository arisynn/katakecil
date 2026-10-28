import { useState } from "react";
import JSZip from "jszip";
import { isNativeApp } from "../../native/platform";
import type { Book } from "../../data/library";
import { supabase } from "../../data/supabase";
import { contents } from "./api";
export default function DataRoom({ books }: { books: Book[] }) {
  const [selected, setSelected] = useState("all"),
    [busy, setBusy] = useState(false),
    [stage, setStage] = useState(""),
    [error, setError] = useState("");
  const download = async () => {
    if (!supabase || busy) return;
    setBusy(true);
    setError("");
    try {
      const zip = new JSZip(),
        chosen = books.filter((b) => selected === "all" || b.id === selected);
      for (const book of chosen) {
        setStage(`Menyiapkan ${book.title}…`);
        const rows = await contents(book.id, true),
          folder = zip.folder(book.id)!;
        const versions: any[] = [], releases: any[] = [];
        // Keep requests below URL and row limits, including books with many revisions.
        for (let group = 0; group < rows.length; group += 100) {
          const ids = rows.slice(group, group + 100).map((row) => row.id);
          for (let start = 0; ; start += 200) {
            const { data, error } = await supabase.from("qr_studio_versions").select("*")
              .in("section_id", ids).order("id").range(start, start + 199);
            if (error) throw error;
            versions.push(...(data || []));
            if ((data?.length || 0) < 200) break;
          }
        }
        for (let start = 0; ; start += 200) {
          const { data, error } = await supabase.from("qr_studio_releases").select("*")
            .eq("book_id", book.id).order("id").range(start, start + 199);
          if (error) throw error;
          releases.push(...(data || []));
          if ((data?.length || 0) < 200) break;
        }
        folder.file(
          "book.json",
          JSON.stringify(
            {
              format: "katakecil-studio-workspace-v1",
              book,
              contents: rows,
              versions,
              releases,
            },
            null,
            2,
          ),
        );
        for (const row of rows)
          folder.file(`${String(row.position).padStart(4, "0")}-${row.id}.md`, `# ${row.title}\n\n${row.content_md}`);
        const { data: sources, error: sourceError } = await supabase
          .from("qr_studio_sources")
          .select("sources")
          .eq("book_id", book.id)
          .maybeSingle();
        if (sourceError) throw sourceError;
        const originals = new Map<string, { bucket: string; path: string }>();
        for (const source of sources?.sources || [])
          originals.set(source.path, { bucket: "studio-sources", path: source.path });
        for (const row of rows)
          if (row.source) originals.set(row.source.path, { bucket: row.source.bucket, path: row.source.path });
        for (const version of versions) {
          const source = version.document?.source;
          if (source) originals.set(source.path, { bucket: source.bucket, path: source.path });
        }
        for (const source of originals.values()) {
          const { data, error } = await supabase.storage.from(source.bucket).download(source.path);
          if (error || !data) throw Error("Sumber asli belum dapat diekspor. Coba lagi saat tersambung.");
          folder.file("sources/" + source.path.split("/").at(-1), await data.arrayBuffer());
        }
      }
      setStage("Membuat ZIP…");
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      if (isNativeApp) {
        const { shareStudioBlob } = await import("../../native/export");
        await shareStudioBlob("KataKecil-backup.zip", blob);
      } else {
        const url = URL.createObjectURL(blob),
          a = document.createElement("a");
        a.href = url;
        a.download = "KataKecil-backup.zip";
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 30000);
      }
      setStage("Ekspor selesai. Simpan file ZIP di perangkatmu.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <header className="ws-page-head">
        <div>
          <span className="ws-eyebrow">SALINAN KARYA</span>
          <h1>Ekspor & data.</h1>
          <p>Simpan naskah, revisi, jadwal, dan sumber asli dalam satu ZIP.</p>
        </div>
      </header>
      <section className="ws-panel">
        <label>
          Karya
          <select value={selected} disabled={busy} onChange={(e) => setSelected(e.target.value)}>
            <option value="all">Semua karya</option>
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.title}
              </option>
            ))}
          </select>
        </label>
        <p className="ws-hint">Salinan memuat draf privat. Simpan di tempat yang kamu percayai.</p>
        {error && (
          <p role="alert" className="ws-error">
            {error}
          </p>
        )}
        {stage && <p role="status">{stage}</p>}
        <button type="button" className="ws-primary" disabled={busy || !books.length} onClick={() => void download()}>
          {busy ? "Menyiapkan…" : "Unduh salinan ZIP"}
        </button>
      </section>
    </>
  );
}
