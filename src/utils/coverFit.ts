export type CoverKind = 'book' | 'wallpaper' | 'poster' | 'square' | 'wide';

export type CoverMeasure = {
  width: number;
  height: number;
  ratio: number;
  kind: CoverKind;
  label: string;
  ratioName: string;
  hint: string;
};

export const COVER_MIN_EDGE = 200;
export const COVER_MAX_EDGE = 8000;
export const COVER_MAX_RATIO = 4;
export const COVER_MAX_BYTES = 5 * 1024 * 1024;
export const COVER_DECODE_LIMIT = 20 * 1024 * 1024;
export const COVER_LONG_EDGE = 1600;
export const SHELF_RATIO = 1.5;

const NAMED_RATIOS: Array<[number, number, string]> = [
  [9, 16, '9:16'],
  [9, 19.5, '9:19.5'],
  [9, 21, '9:21'],
  [2, 3, '2:3'],
  [3, 4, '3:4'],
  [1, 1, '1:1'],
  [16, 9, '16:9'],
  [3, 2, '3:2'],
  [4, 3, '4:3'],
  [21, 9, '21:9'],
];

export function nearestRatioName(width: number, height: number): string {
  const ratio = height / width;
  let best = '';
  let bestDelta = 0.055;
  for (const [w, h, name] of NAMED_RATIOS) {
    const delta = Math.abs(ratio - h / w);
    if (delta < bestDelta) {
      bestDelta = delta;
      best = name;
    }
  }
  return best || `${ratio.toFixed(2)}×`;
}

export function shelfNeedsFill(ratio: number): boolean {
  return Math.abs(ratio - SHELF_RATIO) > 0.06;
}

export function defaultFocus(kind: CoverKind): { x: number; y: number } {
  if (kind === 'wallpaper' || kind === 'poster') return { x: 0.5, y: 0.38 };
  if (kind === 'wide') return { x: 0.5, y: 0.42 };
  return { x: 0.5, y: 0.5 };
}

function describe(ratio: number): Pick<CoverMeasure, 'kind' | 'label' | 'hint'> {
  if (ratio >= 2.35) {
    return {
      kind: 'poster',
      label: 'Poster panjang',
      hint: 'Di rak gambar tetap utuh, ruang kosong diisi blur. Di detail sampul bisa digeser.',
    };
  }
  if (ratio >= 1.6) {
    return {
      kind: 'wallpaper',
      label: 'Wallpaper HP',
      hint: 'Tidak dipotong jadi 2:3. Rak menampilkan gambar utuh dengan latar blur.',
    };
  }
  if (ratio >= 1.25) {
    const near34 = Math.abs(ratio - 4 / 3);
    const near23 = Math.abs(ratio - SHELF_RATIO);
    if (near34 <= near23 && near34 <= 0.08) {
      return {
        kind: 'book',
        label: 'Sampul 3:4',
        hint: 'Sedikit lebih lebar dari rak 2:3. Gambar tidak dipotong; sisi atas dan bawah diisi blur.',
      };
    }
    if (near23 <= 0.08) {
      return {
        kind: 'book',
        label: 'Sampul 2:3',
        hint: 'Pas dengan rak. Gambar mengisi bingkai tanpa blur.',
      };
    }
    return { kind: 'book', label: 'Sampul buku', hint: 'Dekat dengan sampul buku. Rak menjaga gambar utuh.' };
  }
  if (ratio >= 0.85) {
    return {
      kind: 'square',
      label: 'Hampir kotak',
      hint: 'Tidak ditarik jadi potret. Rak mengisi ruang kosong dengan blur.',
    };
  }
  return {
    kind: 'wide',
    label: 'Sampul lebar',
    hint: 'Gambar lebar tetap utuh. Tidak dipotong di kiri dan kanan.',
  };
}

export function classifyCover(width: number, height: number): CoverMeasure | null {
  if (!(width > 0) || !(height > 0) || !Number.isFinite(width) || !Number.isFinite(height)) return null;
  const ratio = height / width;
  return { width, height, ratio, ratioName: nearestRatioName(width, height), ...describe(ratio) };
}

export function coverProblem(width: number, height: number): string | null {
  if (!(width > 0) || !(height > 0)) return 'Gambar tidak bisa dibaca.';
  const shortEdge = Math.min(width, height);
  const longEdge = Math.max(width, height);
  if (shortEdge < COVER_MIN_EDGE) return `Sisi terpendek ${Math.round(shortEdge)} px. Minimal ${COVER_MIN_EDGE} px supaya tidak pecah di HP.`;
  if (longEdge > COVER_MAX_EDGE) return `Sisi terpanjang ${Math.round(longEdge)} px. Maksimal ${COVER_MAX_EDGE} px.`;
  const ratio = height / width;
  if (ratio > COVER_MAX_RATIO || ratio < 1 / COVER_MAX_RATIO) return 'Rasio terlalu ekstrem. 9:16, 3:4, 2:3, kotak, dan sampul lebar biasa masih diterima.';
  return null;
}

export function isHeic(file: { type: string; name: string }): boolean {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

export function acceptedType(type: string): boolean {
  return type === 'image/jpeg' || type === 'image/png' || type === 'image/webp';
}

function canvasBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise(resolve => canvas.toBlob(blob => resolve(blob), type, quality));
}

async function encodeCover(canvas: HTMLCanvasElement): Promise<Blob | null> {
  const qualities = [0.82, 0.7, 0.58];
  let last: Blob | null = null;
  for (const quality of qualities) {
    const blob = await canvasBlob(canvas, 'image/webp', quality);
    if (!blob) break;
    last = blob;
    if (blob.size <= COVER_MAX_BYTES) return blob;
  }
  if (!last) last = await canvasBlob(canvas, 'image/jpeg', 0.82);
  return last;
}

export type PreparedCover = { blob: Blob; measure: CoverMeasure; previewUrl: string };

export async function prepareCoverBlob(blob: Blob, name = 'sampul.jpg'): Promise<PreparedCover | { error: string }> {
  const file = blob instanceof File ? blob : new File([blob], name, { type: blob.type || 'image/jpeg' });
  return prepareCoverFile(file);
}

export async function prepareCoverFile(file: File): Promise<PreparedCover | { error: string }> {
  if (isHeic(file)) return { error: 'Foto HEIC dari iPhone belum didukung. Simpan sebagai JPG, lalu unggah lagi.' };
  if (!acceptedType(file.type)) return { error: 'Gunakan gambar JPG, PNG, atau WebP.' };
  if (file.size > COVER_DECODE_LIMIT) return { error: 'Sampul terlalu besar untuk dibaca. Pakai gambar di bawah 20 MB.' };
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); }
  catch { return { error: 'Gambar tidak bisa dibaca. Coba file lain.' }; }
  const problem = coverProblem(bitmap.width, bitmap.height);
  if (problem) { bitmap.close(); return { error: problem }; }
  const measure = classifyCover(bitmap.width, bitmap.height);
  if (!measure) { bitmap.close(); return { error: 'Gambar tidak bisa dibaca.' }; }
  let encoded: Blob | null = null;
  for (const edge of [COVER_LONG_EDGE, 1280, 960]) {
    const scale = Math.min(1, edge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    ctx.drawImage(bitmap, 0, 0, width, height);
    encoded = await encodeCover(canvas);
    if (encoded && encoded.size <= COVER_MAX_BYTES) break;
  }
  bitmap.close();
  if (!encoded) return { error: 'Gagal mengompres sampul.' };
  if (encoded.size > COVER_MAX_BYTES) return { error: 'Setelah dikecilkan, sampul masih di atas 5 MB. Pakai gambar yang lebih sederhana.' };
  return { blob: encoded, measure, previewUrl: URL.createObjectURL(encoded) };
}

export function measureImageUrl(url: string): Promise<CoverMeasure> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const problem = coverProblem(img.naturalWidth, img.naturalHeight);
      if (problem) { reject(new Error(problem)); return; }
      const measure = classifyCover(img.naturalWidth, img.naturalHeight);
      if (!measure) { reject(new Error('Gambar tidak bisa dibaca.')); return; }
      resolve(measure);
    };
    img.onerror = () => reject(new Error('URL sampul tidak bisa dimuat. Pastikan tautan gambar bisa dibuka.'));
    img.src = url;
  });
}

export type NormCrop = { x: number; y: number; w: number; h: number };

/** Rasio frame adalah tinggi ÷ lebar. `null` berarti seluruh gambar. */
export function fitCrop(imgW: number, imgH: number, frame: number | null): NormCrop {
  if (!(imgW > 0) || !(imgH > 0) || !frame) return { x: 0, y: 0, w: 1, h: 1 };
  const imgRatio = imgH / imgW;
  if (imgRatio > frame) {
    const h = (frame * imgW) / imgH;
    return { x: 0, y: (1 - h) / 2, w: 1, h };
  }
  const w = imgH / (frame * imgW);
  return { x: (1 - w) / 2, y: 0, w, h: 1 };
}

export function clampCrop(crop: NormCrop): NormCrop {
  const w = Math.min(1, Math.max(0.02, crop.w));
  const h = Math.min(1, Math.max(0.02, crop.h));
  return {
    x: Math.min(1 - w, Math.max(0, crop.x)),
    y: Math.min(1 - h, Math.max(0, crop.y)),
    w,
    h,
  };
}

export type CoverFrame = { x: number; y: number; w: number; h: number };

/** Ukuran jendela crop di dalam panggung. `frame` = tinggi ÷ lebar, null = rasio gambar. */
export function cropWindow(stageW: number, stageH: number, imgW: number, imgH: number, frame: number | null): CoverFrame {
  const ratio = frame && imgW > 0 && imgH > 0 ? frame : imgH / imgW;
  const maxW = Math.max(1, stageW - 28);
  const maxH = Math.max(1, stageH - 28);
  let w = maxW;
  let h = w * ratio;
  if (h > maxH) {
    h = maxH;
    w = h / ratio;
  }
  return { w, h, x: (stageW - w) / 2, y: (stageH - h) / 2 };
}

export function coverScale(win: CoverFrame, imgW: number, imgH: number, zoom: number): number {
  if (!(imgW > 0) || !(imgH > 0)) return 1;
  return Math.max(win.w / imgW, win.h / imgH) * Math.min(4, Math.max(1, zoom));
}

export function clampPan(win: CoverFrame, imgW: number, imgH: number, scale: number, panX: number, panY: number) {
  const extraX = Math.max(0, imgW * scale - win.w) / 2;
  const extraY = Math.max(0, imgH * scale - win.h) / 2;
  return {
    x: Math.min(extraX, Math.max(-extraX, panX)),
    y: Math.min(extraY, Math.max(-extraY, panY)),
  };
}

/** Piksel sumber yang terlihat di jendela crop. Pan positif menggeser gambar ke bawah/kanan. */
export function cropPixels(win: CoverFrame, imgW: number, imgH: number, scale: number, panX: number, panY: number) {
  const pan = clampPan(win, imgW, imgH, scale, panX, panY);
  const left = win.x + (win.w - imgW * scale) / 2 + pan.x;
  const top = win.y + (win.h - imgH * scale) / 2 + pan.y;
  const x = Math.max(0, (win.x - left) / scale);
  const y = Math.max(0, (win.y - top) / scale);
  const w = Math.min(imgW - x, win.w / scale);
  const h = Math.min(imgH - y, win.h / scale);
  return { x, y, w, h };
}
