import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import BrandIcon from '../../../components/BrandIcon';
import { clampPan, COVER_MIN_EDGE, cropPixels, cropWindow, coverScale } from '../../../utils/coverFit';

const FRAMES = [
  { id: 'utuh', label: 'Utuh', frame: null },
  { id: '23', label: '2:3', frame: 3 / 2 },
  { id: '34', label: '3:4', frame: 4 / 3 },
  { id: '916', label: '9:16', frame: 16 / 9 },
  { id: '11', label: '1:1', frame: 1 },
] as const;

export function CoverCropper({ file, busy, onCancel, onConfirm }: {
  file: File;
  busy: boolean;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [src, setSrc] = useState('');
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [stage, setStage] = useState({ w: 320, h: 420 });
  const [frame, setFrame] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [error, setError] = useState('');
  const drag = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    const img = new Image();
    img.onload = () => setSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.onerror = () => setError('Gambar tidak bisa dibaca. Coba file lain.');
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const measure = () => setStage({ w: node.clientWidth, h: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const win = size.w ? cropWindow(stage.w, stage.h, size.w, size.h, frame) : null;
  const scale = win && size.w ? coverScale(win, size.w, size.h, zoom) : 1;
  const held = win ? clampPan(win, size.w, size.h, scale, pan.x, pan.y) : pan;
  const imgStyle = win ? {
    left: win.x + (win.w - size.w * scale) / 2 + held.x,
    top: win.y + (win.h - size.h * scale) / 2 + held.y,
    width: size.w * scale,
    height: size.h * scale,
  } : null;

  const choose = (next: number | null) => {
    setFrame(next);
    setZoom(1);
    if (!size.w) return;
    const nextWin = cropWindow(stage.w, stage.h, size.w, size.h, next);
    const nextScale = coverScale(nextWin, size.w, size.h, 1);
    const extraY = Math.max(0, size.h * nextScale - nextWin.h) / 2;
    setPan({ x: 0, y: next && size.h / size.w > (next || 1) ? extraY : 0 });
    setError('');
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (!win) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, panX: held.x, panY: held.y };
  };
  const onPointerMove = (event: React.PointerEvent) => {
    const start = drag.current;
    if (!start || !win) return;
    const next = clampPan(win, size.w, size.h, scale, start.panX + event.clientX - start.x, start.panY + event.clientY - start.y);
    setPan(next);
  };
  const onPointerUp = () => { drag.current = null; };

  const confirm = async () => {
    if (!win || !size.w) return;
    setError('');
    const pixels = cropPixels(win, size.w, size.h, scale, pan.x, pan.y);
    if (Math.min(pixels.w, pixels.h) < COVER_MIN_EDGE) {
      setError(`Hasil crop terlalu kecil. Sisi terpendek minimal ${COVER_MIN_EDGE} px.`);
      return;
    }
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(pixels.w));
    canvas.height = Math.max(1, Math.round(pixels.h));
    const ctx = canvas.getContext('2d');
    if (!ctx) { bitmap.close(); setError('Gagal memotong gambar.'); return; }
    ctx.drawImage(bitmap, pixels.x, pixels.y, pixels.w, pixels.h, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(value => resolve(value), 'image/webp', 0.92))
      || await new Promise<Blob | null>(resolve => canvas.toBlob(value => resolve(value), 'image/jpeg', 0.92));
    if (!blob) { setError('Gagal memotong gambar.'); return; }
    onConfirm(blob);
  };

  return createPortal(<div className="kk-crop" role="dialog" aria-modal="true" aria-labelledby="kk-crop-title">
    <div className="kk-crop-card">
      <div className="kk-crop-head">
        <h2 id="kk-crop-title">Potong sampul</h2>
        <button type="button" className="kk-crop-close" onClick={onCancel} aria-label="Tutup"><BrandIcon name="close" size={18}/></button>
      </div>
      <p className="kk-crop-help">Geser gambar di dalam bingkai. Perbesar kalau ingin lebih dekat. Utuh memakai seluruh gambar.</p>
      <div className="kk-crop-ratios" role="group" aria-label="Bentuk crop">
        {FRAMES.map(item => <button type="button" key={item.id} aria-pressed={frame === item.frame} className={frame === item.frame ? 'is-active' : ''} onClick={() => choose(item.frame)}>{item.label}</button>)}
      </div>
      <div
        className="kk-crop-stage"
        ref={stageRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        {imgStyle && <img src={src} alt="" draggable={false} style={imgStyle}/>}
        {win && <div className="kk-crop-win" style={{ left: win.x, top: win.y, width: win.w, height: win.h }}/>}
      </div>
      <label className="kk-crop-zoom">Perbesar
        <input type="range" min={1} max={3} step={0.01} value={zoom} aria-valuetext={`${zoom.toFixed(1)} kali`} onChange={event => setZoom(Number(event.target.value))}/>
      </label>
      {error && <div className="studio-error" role="alert">{error}</div>}
      <div className="kk-crop-actions">
        <button type="button" className="kk-crop-ghost" onClick={onCancel} disabled={busy}>Batal</button>
        <button type="button" className="kk-crop-use" onClick={() => void confirm()} disabled={busy || !size.w}><BrandIcon name="scissors" size={16}/>{busy ? 'Menyiapkan…' : 'Pakai crop ini'}</button>
      </div>
    </div>
  </div>, document.body);
}
