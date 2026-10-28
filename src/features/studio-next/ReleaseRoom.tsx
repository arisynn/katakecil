import { useMemo, useRef, useState } from "react";
import type { Book } from "../../data/library";
import { formatWib } from "../../data/library";
import { content, mutate, operation, type Operation } from "./api";
import { narrative, status, releaseSlots, type ContentItem } from "./model";
import ReleaseOptions, { defaultChoice } from "./ReleaseOptions";
export default function ReleaseRoom({
  book,
  items,
  onChanged,
}: {
  book: Book;
  items: ContentItem[];
  onChanged: () => Promise<void>;
}) {
  const initial = items
    .filter((p) => !p.deleted_at && narrative(p.kind) && (!p.is_enabled || p.revision !== p.published_revision))
    .map((p) => p.id);
  const [selected, setSelected] = useState<string[]>(initial),
    [choice, setChoice] = useState(() => ({ ...defaultChoice(), mode: "now" as "now" | "schedule" | "draft" })),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const pending = useRef<Operation | null>(null);
  const picked = items.filter((p) => selected.includes(p.id) && !p.deleted_at);
  let dates: string[] = [],
    scheduleError = "";
  try {
    if (choice.mode === "schedule") dates = releaseSlots(picked.length, choice.start, choice.time, choice.slots);
  } catch (e) {
    scheduleError = (e as Error).message;
  }
  const apply = async (mode: "now" | "schedule" | "draft" | "apply") => {
    if (!picked.length || busy) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (!pending.current) {
        // Include private pages with their next narrative section; closing pages follow the final section.
        const list = [...picked],
          story = items.filter((p) => narrative(p.kind) && !p.deleted_at);
        const targets = new Map(picked.map((p, i) => [p.id, choice.mode === "schedule" ? dates[i] : null]));
        if (mode === "now" || mode === "schedule")
          for (const page of items.filter((p) => !narrative(p.kind) && !p.deleted_at && !p.is_enabled)) {
            const related = story.find((p) => p.position > page.position) || story.at(-1);
            if (related && selected.includes(related.id) && !list.some((p) => p.id === page.id)) {
              list.push(page);
              targets.set(page.id, targets.get(related.id) ?? null);
            }
          }
        pending.current = operation("release", {
          book_id: book.id,
          mode,
          items: list.map((p) => ({ id: p.id, expected: p.revision, release_at: targets.get(p.id) })),
        });
      }
      const result = await mutate(pending.current);
      pending.current = null;
      setMessage(
        `${result.changed} bagian berhasil ${mode === "draft" ? "ditarik ke draf" : mode === "apply" ? "diperbarui" : mode === "schedule" ? "dijadwalkan" : "diterbitkan"}.`,
      );
      setSelected([]);
      await onChanged();
    } catch (e) {
      if ((e as { code?: string }).code) pending.current = null;
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="ws-release-room">
      <div className="ws-panel">
        <h2>Siap dibaca, saat kamu siap.</h2>
        <p>Pilih isi yang akan dirilis. Halaman buku terkait mengikuti rilis cerita.</p>
        <div className="ws-actions">
          <button type="button" onClick={() => setSelected(initial)} disabled={busy || !!pending.current}>
            Pilih draf & revisi
          </button>
          <button
            type="button"
            onClick={() => setSelected(items.filter((p) => narrative(p.kind) && !p.deleted_at).map((p) => p.id))}
            disabled={busy || !!pending.current}
          >
            Pilih semua bab
          </button>
        </div>
        <div className="ws-release-selection">
          {items
            .filter((p) => narrative(p.kind) && !p.deleted_at)
            .map((p) => (
              <label className="ws-check" key={p.id}>
                <input
                  type="checkbox"
                  disabled={busy || !!pending.current}
                  checked={selected.includes(p.id)}
                  onChange={(e) =>
                    setSelected((prev) => (e.target.checked ? [...prev, p.id] : prev.filter((id) => id !== p.id)))
                  }
                />
                <span>
                  {p.title}
                  <small>
                    {status(p)}
                    {p.is_enabled && p.revision !== p.published_revision ? " · Ada draf revisi" : ""}
                    {p.release_at ? " · " + formatWib(p.release_at) : ""}
                  </small>
                </span>
              </label>
            ))}
        </div>
      </div>
      <section className="ws-panel">
        <h2>{picked.length} bagian dipilih</h2>
        <fieldset disabled={busy || !!pending.current}>
          <ReleaseOptions value={choice} onChange={setChoice} />
        </fieldset>
        {scheduleError && (
          <p role="alert" className="ws-error">
            {scheduleError}
          </p>
        )}
        {choice.mode === "schedule" && !scheduleError && (
          <details>
            <summary>Periksa jadwal ({dates.length})</summary>
            {picked.slice(0, 30).map((p, i) => (
              <p key={p.id}>
                {p.title} · {formatWib(dates[i])}
              </p>
            ))}
          </details>
        )}
        {error && (
          <p role="alert" className="ws-error">
            {error}
          </p>
        )}
        {message && (
          <p role="status" className="ws-success">
            {message}
          </p>
        )}
        <div className="ws-actions">
          <button
            type="button"
            className="ws-primary"
            disabled={busy || !picked.length || !!scheduleError}
            onClick={() => void apply(choice.mode)}
          >
            {busy
              ? "Memproses…"
              : pending.current
                ? "Coba operasi lagi"
                : choice.mode === "now"
                  ? "Terbitkan pilihan"
                  : choice.mode === "schedule"
                    ? "Terapkan jadwal"
                    : "Tarik pilihan ke draf"}
          </button>
          {picked.length > 0 && picked.every((p) => p.is_enabled) && (
            <button type="button" disabled={busy || Boolean(pending.current)} onClick={() => void apply("apply")}>
              Terapkan revisi · pertahankan jadwal
            </button>
          )}
        </div>
        <p className="ws-hint">
          Menerbitkan isi juga menampilkan buku di perpustakaan. Draf yang tidak dipilih tetap privat.
        </p>
      </section>
    </section>
  );
}
