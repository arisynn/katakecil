/** Pure release-planning helpers. All wall-clock dates/times use Asia/Jakarta (UTC+07, no DST). */
const DAY = 86400000;
export type ReleaseCandidate = { id: string; book_id: string; episode_number: number; title: string; release_at: string | null; is_enabled: boolean };
export type PlannedRelease = { episode_id: string; episode_number: number; title: string; release_at: string };
export type ReleaseRule = { book_id: string; weekdays: number[]; time_wib: string; is_active: boolean; updated_at?: string };

export function toWibDate(utcIso: string): string {
  const date = new Date(utcIso);
  if (!Number.isFinite(date.getTime())) throw new Error('Tanggal tersimpan tidak valid.');
  return new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 10);
}
export function toWibInput(utcIso: string | null): string {
  if (!utcIso) return '';
  const date = new Date(utcIso);
  if (!Number.isFinite(date.getTime())) return '';
  return new Date(date.getTime() + 7 * 3600000).toISOString().slice(0, 16);
}
export function fromWib(date: string, hhmm: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  const t = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(hhmm);
  if (!m || !t) throw new Error('Format tanggal atau jam WIB tidak valid.');
  const y = +m[1], month = +m[2], d = +m[3];
  const dayStart = Date.UTC(y, month - 1, d);
  const check = new Date(dayStart);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== d)
    throw new Error('Tanggal WIB tidak valid.');
  return new Date(dayStart + (+t[1] * 60 + +t[2] - 420) * 60000).toISOString();
}
export function monthDays(year: number, monthIndex: number): Array<number | null> {
  const leading = new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return [...Array.from({length:leading},()=>null),...Array.from({length:days},(_,i)=>i+1)];
}
export function makeReleasePlan(args: { bookId:string; episodes:ReleaseCandidate[]; weekdays:number[]; timeWib:string; startDate:string; count:number; nowMs?:number }): PlannedRelease[] {
  const {bookId,episodes,weekdays,timeWib,startDate,count}=args;
  const nowMs=args.nowMs ?? Date.now();
  if (!Number.isInteger(count) || count < 1 || count > 1000) throw new Error('Jumlah episode harus 1–1000.');
  if (!weekdays.length || weekdays.some(x=>!Number.isInteger(x)||x<0||x>6)) throw new Error('Pilih hari rilis yang valid.');
  if (new Set(weekdays).size !== weekdays.length) throw new Error('Hari rilis tidak boleh duplikat.');
  const origin=fromWib(startDate,timeWib);
  const pending=episodes.filter(e=>e.book_id===bookId&&!e.is_enabled&&!e.release_at).sort((a,b)=>a.episode_number-b.episode_number).slice(0,count);
  if (pending.length!==count) throw new Error(`Hanya tersedia ${pending.length} episode draft yang belum punya jadwal.`);
  const occupied=new Set(episodes.filter(e=>e.book_id===bookId&&e.is_enabled&&e.release_at).map(e=>new Date(e.release_at!).toISOString()));
  const result:PlannedRelease[]=[];
  const originMs=new Date(origin).getTime();
  for(let days=0;days<366*20 && result.length<count;days++){
    const ms=originMs+days*DAY;const stamp=new Date(ms);
    // WIB civil day = UTC instant + 7 hours; weekday is never inferred from browser timezone.
    const weekday=new Date(ms+7*3600000).getUTCDay();
    if(!weekdays.includes(weekday)||ms<=nowMs)continue;
    const iso=stamp.toISOString();
    if(occupied.has(iso))continue; // Preserve every existing release slot.
    const ep=pending[result.length];
    result.push({episode_id:ep.id,episode_number:ep.episode_number,title:ep.title,release_at:iso});
  }
  if(result.length!==count) throw new Error('Rentang jadwal tidak mencukupi.');
  return result;
}
