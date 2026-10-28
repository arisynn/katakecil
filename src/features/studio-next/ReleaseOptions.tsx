import type { ReleaseSlot } from "./model";
export type ReleaseChoice = { mode: "draft" | "now" | "schedule"; start: string; time: string; slots: ReleaseSlot[] };
export const defaultChoice = (): ReleaseChoice => ({
  mode: "now",
  start: new Date(Date.now() + 7 * 3600000).toISOString().slice(0, 10),
  time: "19:00",
  slots: [
    { day: 4, count: 1 },
    { day: 0, count: 2 },
  ],
});
export default function ReleaseOptions({
  value,
  onChange,
}: {
  value: ReleaseChoice;
  onChange: (next: ReleaseChoice) => void;
}) {
  const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
  const modes: { id: ReleaseChoice["mode"]; label: string; desc: string }[] = [
    { id: "now", label: "Terbitkan sekarang", desc: "Langsung tampil di perpustakaan" },
    { id: "draft", label: "Simpan draf", desc: "Privat, terbitkan nanti" },
    { id: "schedule", label: "Jadwalkan", desc: "Terbit otomatis sesuai jadwal WIB" },
  ];
  const applyPreset = (slots: ReleaseSlot[]) => onChange({ ...value, slots });
  return (
    <div className="ws-release-options">
      <div className="ws-mode-pills" role="group" aria-label="Mode penerbitan cepat">
        {modes.map((m) => (
          <button
            type="button"
            key={m.id}
            className={value.mode === m.id ? "ws-mode-pill is-active" : "ws-mode-pill"}
            aria-pressed={value.mode === m.id}
            onClick={() => onChange({ ...value, mode: m.id })}
          >
            <strong>{m.label}</strong>
            <small>{m.desc}</small>
          </button>
        ))}
      </div>
      <label className="ws-sr-select">
        Setelah disimpan
        <select
          aria-label="Pilihan penerbitan"
          value={value.mode}
          onChange={(e) => onChange({ ...value, mode: e.target.value as ReleaseChoice["mode"] })}
        >
          <option value="now">Terbitkan sekarang</option>
          <option value="draft">Simpan draf</option>
          <option value="schedule">Jadwalkan</option>
        </select>
      </label>
      {value.mode === "schedule" && (
        <div className="ws-schedule-box">
          <div className="ws-two-fields">
            <label>
              Mulai tanggal
              <input type="date" value={value.start} onChange={(e) => onChange({ ...value, start: e.target.value })} />
            </label>
            <label>
              Pukul (WIB)
              <input type="time" value={value.time} onChange={(e) => onChange({ ...value, time: e.target.value })} />
            </label>
          </div>
          <div className="ws-preset-row">
            <small>Pola cepat:</small>
            <button
              type="button"
              onClick={() => applyPreset([0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, count: 1 })))}
            >
              Tiap hari (1 bab)
            </button>
            <button
              type="button"
              onClick={() =>
                applyPreset([
                  { day: 4, count: 1 },
                  { day: 0, count: 1 },
                ])
              }
            >
              Kamis & Minggu
            </button>
            <button
              type="button"
              onClick={() =>
                applyPreset([
                  { day: 6, count: 1 },
                  { day: 0, count: 1 },
                ])
              }
            >
              Akhir pekan
            </button>
          </div>
          <details>
            <summary>Atur jumlah bab per hari secara manual</summary>
            <div className="ws-week-slots">
              {days.map((day, i) => (
                <label key={day}>
                  {day}
                  <input
                    aria-label={`Jumlah bab ${day}`}
                    type="number"
                    min="0"
                    max="20"
                    value={value.slots.find((s) => s.day === i)?.count ?? 0}
                    onChange={(e) =>
                      onChange({
                        ...value,
                        slots: [
                          ...value.slots.filter((s) => s.day !== i),
                          { day: i, count: Math.max(0, Math.min(20, Number(e.target.value) || 0)) },
                        ],
                      })
                    }
                  />
                </label>
              ))}
            </div>
            <p className="ws-hint">
              Isi 0 untuk hari tanpa rilis. Halaman buku mengikuti isi terkait dan tidak menghabiskan slot.
            </p>
          </details>
        </div>
      )}
    </div>
  );
}
