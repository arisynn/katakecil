/**
 * Quiet Reader publication slots: Thursday and Sunday, 19:00 Asia/Jakarta (UTC+07).
 * WIB observes no DST. Store all timestamps as ISO UTC for PostgreSQL timestamptz.
 */
const DAY_MS = 86400000;
const NEXT_GAP_DAYS = { 4: 3, 0: 4 }; // Thursday -> Sunday -> Thursday

/** Returns the first release instant in milliseconds, or throws on invalid date/day. */
export function parseStartWib(value) {
  if (typeof value !== 'string') throw new Error('--start harus berupa tanggal WIB.');
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T19:00(?::00)?\+07:00)?$/.exec(value);
  if (!match) throw new Error('--start gunakan tanggal YYYY-MM-DD (Kamis/Minggu) atau YYYY-MM-DDT19:00:00+07:00.');
  const [, y, m, d] = match;
  const year = Number(y), month = Number(m), day = Number(d);
  const date = new Date(Date.UTC(year, month - 1, day, 12, 0, 0)); // 19:00 WIB -> 12:00 UTC
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day)
    throw new Error('Tanggal --start tidak valid.');
  if (!(date.getUTCDay() in NEXT_GAP_DAYS))
    throw new Error('--start harus jatuh pada Kamis atau Minggu (19.00 WIB).');
  return date.getTime();
}

/** Produce exact timestamps for two episodes per week, Thursday + Sunday. */
export function createReleaseSlots(startMs, episodeCount) {
  if (!Number.isInteger(episodeCount) || episodeCount < 0) throw new Error('Jumlah episode tidak valid.');
  let current = new Date(startMs);
  if (!Number.isFinite(current.getTime()) || current.getUTCHours() !== 12 || current.getUTCMinutes() !== 0 || current.getUTCSeconds() !== 0 ||
      !(current.getUTCDay() in NEXT_GAP_DAYS)) throw new Error('Tanggal awal harus Kamis/Minggu 19.00 WIB.');
  const slots = [];
  for (let i = 0; i < episodeCount; i++) {
    slots.push(current.toISOString());
    current = new Date(current.getTime() + NEXT_GAP_DAYS[current.getUTCDay()] * DAY_MS);
  }
  return slots;
}
