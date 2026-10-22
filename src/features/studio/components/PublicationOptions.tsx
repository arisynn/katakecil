import {formatWib} from '../../../data/library';
import {RELEASE_PRESETS,WEEKDAYS,type PublicationOptions as Options,type PublicationSlot} from '../../../utils/publicationPlan';
export function ReleaseDays({days,onChange}:{days:number[];onChange:(days:number[])=>void}) {
  return <><div className="kk-v75-presets" role="group" aria-label="Frekuensi terbit">{RELEASE_PRESETS.map(p=><button key={p.label} type="button" className="studio-light-button" aria-pressed={p.days.length===days.length&&p.days.every(d=>days.includes(d))} onClick={()=>onChange([...p.days])}>{p.label}</button>)}</div><div className="v3-weekdays" role="group" aria-label="Hari terbit">{WEEKDAYS.map((d,i)=><button key={d} type="button" aria-pressed={days.includes(i)} className={days.includes(i)?'selected':''} onClick={()=>onChange(days.includes(i)?days.filter(x=>x!==i):[...days,i])}>{d}</button>)}</div></>;
}
export default function PublicationOptions({value,onChange,preview,error,count,hasExisting}:{value:Options;onChange:(value:Options)=>void;preview:PublicationSlot[];error:string;count:number;hasExisting:boolean}) {
  const scheduled=value.mode==='schedule'||value.mode==='mixed';
  return <div className="kk-v75-publication">
    <label className="studio-label">Setelah impor<select value={value.mode} onChange={e=>onChange({...value,mode:e.target.value as Options['mode']})}>
      <option value="draft">Simpan sebagai draf</option><option value="now">Terbitkan semua sekarang</option><option value="schedule">Jadwalkan otomatis</option><option value="mixed">Terbitkan pembuka + jadwalkan sisanya</option>
    </select></label>
    {value.mode==='mixed'&&<label className="studio-label">Bab pembuka yang terbit sekarang<input type="number" min={1} max={count} value={value.opening} onChange={e=>onChange({...value,opening:Number(e.target.value)})}/></label>}
    {scheduled&&<><ReleaseDays days={value.weekdays} onChange={weekdays=>onChange({...value,weekdays})}/><div className="v3-two-fields"><label className="studio-label">Mulai tanggal<input type="date" value={value.start} onChange={e=>onChange({...value,start:e.target.value})}/></label><label className="studio-label">Jam terbit (WIB)<input type="time" value={value.time} onChange={e=>onChange({...value,time:e.target.value})}/></label></div>{hasExisting&&<label className="studio-check"><input type="checkbox" checked={value.append} onChange={e=>onChange({...value,append:e.target.checked})}/><span>Lanjutkan setelah jadwal terakhir novel ini</span></label>}</>}
    {error&&<p role="alert" className="studio-error">{error}</p>}
    {preview.length>0&&<div className="kk-v75-release-preview" aria-label="Pratinjau penerbitan"><strong>{preview.filter(p=>!p.release_at).length} bab terbit sekarang · {preview.filter(p=>p.release_at).length} bab terjadwal</strong><ol>{preview.slice(0,6).map(p=><li key={p.episode_number}><span>Bab {p.episode_number} · {p.title}</span><small>{p.release_at?formatWib(p.release_at):'Terbit sekarang'}</small></li>)}</ol>{preview.length>6&&<p>… dan {preview.length-6} bab berikutnya.</p>}<p><strong>Bab terakhir:</strong> {preview.at(-1)?.release_at?formatWib(preview.at(-1)!.release_at):'Terbit sekarang'}</p></div>}
    <p className="studio-muted">{value.mode==='draft'?'Novel baru tetap privat dan semua bab disimpan sebagai draf.':'Novel ditampilkan ke publik. Bab terjadwal baru bisa dibaca saat waktunya tiba; HP boleh ditutup.'}</p>
  </div>;
}
