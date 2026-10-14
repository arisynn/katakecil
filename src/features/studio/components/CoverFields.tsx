import React, { useEffect, useState } from 'react';
import BrandIcon from '../../../components/BrandIcon';
import { Cover } from '../../../components/Cover';
import { acceptedType, COVER_DECODE_LIMIT, isHeic, prepareCoverBlob, type PreparedCover } from '../../../utils/coverFit';
import { CoverCropper } from './CoverCropper';

export function CoverFields({
  slug, title, genre, cover, privatePreview, hasPrivate, publishPrivate, onCover, onPublishPrivate, onPrepared,
}: {
  slug: string;
  title: string;
  genre: string;
  cover: string;
  privatePreview: string;
  hasPrivate: boolean;
  publishPrivate: boolean;
  onCover: (value: string) => void;
  onPublishPrivate: (value: boolean) => void;
  onPrepared: (value: PreparedCover | null) => void;
}) {
  const [prepared, setPrepared] = useState<PreparedCover | null>(null);
  const [draft, setDraft] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { if (prepared) URL.revokeObjectURL(prepared.previewUrl); }, [prepared]);
  const preview = prepared?.previewUrl || cover || privatePreview;
  const book = { id: slug || 'new', title: title || 'Judul ceritamu', genre, cover_url: preview || null };
  const pick = (file: File | null) => {
    setError('');
    if (!file) return;
    if (isHeic(file)) { setError('Foto HEIC dari iPhone belum didukung. Simpan sebagai JPG, lalu unggah lagi.'); return; }
    if (!acceptedType(file.type)) { setError('Gunakan gambar JPG, PNG, atau WebP.'); return; }
    if (file.size > COVER_DECODE_LIMIT) { setError('Sampul terlalu besar untuk dibaca. Pakai gambar di bawah 20 MB.'); return; }
    setDraft(file);
  };
  const useCrop = async (blob: Blob) => {
    setBusy(true);
    setError('');
    const result = await prepareCoverBlob(blob, 'sampul.webp');
    setBusy(false);
    if ('error' in result) { setError(result.error); return; }
    setPrepared(prev => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return result;
    });
    onPrepared(result);
    setDraft(null);
  };
  return <div className="studio-cover-fields">
    <span className="studio-label-text">Sampul cerita</span>
    {prepared && <p className="kk-cover-badge" role="status">{prepared.measure.ratioName} · {prepared.measure.label}</p>}
    {prepared && <p className="studio-small-muted kk-cover-note">{prepared.measure.hint}</p>}
    <div className="kk-cover-mocks" aria-label="Pratinjau sampul">
      <figure><div className="kk-v7-cover"><Cover book={book}/></div><figcaption>Rak</figcaption></figure>
      <figure><div className="v6-detail-cover kk-smart-detail"><Cover book={book} surface="detail" eager/></div><figcaption>Detail</figcaption></figure>
      <figure><div className="kk-v7-collection-cover"><Cover book={book} size="mini" surface="thumb"/></div><figcaption>Daftar</figcaption></figure>
    </div>
    <label className="studio-upload"><BrandIcon name="image-plus" size={18}/>{busy ? 'Menyiapkan sampul…' : 'Pilih sampul dari HP'}<input type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif" onChange={e => { const file = e.target.files?.[0] || null; e.target.value = ''; pick(file); }}/></label>
    {error && <div className="studio-error" role="alert">{error}</div>}
    <p className="studio-small-muted">Setelah dipilih, gambar bisa dipotong dulu: utuh, 2:3, 3:4, 9:16, atau kotak. Hasil dikecilkan ke WebP, sisi terpanjang 1600 px, maks. 5 MB.</p>
    {hasPrivate && <label className="studio-check"><input type="checkbox" checked={publishPrivate} onChange={e => onPublishPrivate(e.target.checked)}/><span>Publikasikan salinan sampul privat dari impor</span></label>}
    <label className="studio-label">Atau URL sampul<input value={cover} onChange={e => onCover(e.target.value)} type="url" placeholder="https://..."/></label>
    {draft && <CoverCropper file={draft} busy={busy} onCancel={() => setDraft(null)} onConfirm={blob => void useCrop(blob)}/>}
  </div>;
}