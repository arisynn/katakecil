import React, { useEffect, useState } from 'react';
import BrandIcon from '../../../components/BrandIcon';
import { Cover } from '../../../components/Cover';
import { prepareCoverFile, type PreparedCover } from '../../../utils/coverFit';

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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { if (prepared) URL.revokeObjectURL(prepared.previewUrl); }, [prepared]);
  const preview = prepared?.previewUrl || cover || privatePreview;
  const book = { id: slug || 'new', title: title || 'Judul ceritamu', genre, cover_url: preview || null };
  const pick = async (file: File | null) => {
    setError('');
    if (!file) return;
    setBusy(true);
    const result = await prepareCoverFile(file);
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    setPrepared(prev => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return result;
    });
    onPrepared(result);
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
    <label className="studio-upload"><BrandIcon name="image-plus" size={18}/>{busy ? 'Membaca gambar…' : 'Pilih sampul dari HP'}<input type="file" accept="image/png,image/jpeg,image/webp,image/heic,image/heif,.heic,.heif" onChange={e => { const file = e.target.files?.[0] || null; e.target.value = ''; void pick(file); }}/></label>
    {error && <div className="studio-error" role="alert">{error}</div>}
    <p className="studio-small-muted">JPG, PNG, WebP. Wallpaper 9:16, 3:4, dan poster panjang diterima. Gambar dikecilkan ke WebP, sisi terpanjang 1600 px, maks. 5 MB. Unggah membuat sampul publik setelah konfirmasi.</p>
    {hasPrivate && <label className="studio-check"><input type="checkbox" checked={publishPrivate} onChange={e => onPublishPrivate(e.target.checked)}/><span>Publikasikan salinan sampul privat dari impor</span></label>}
    <label className="studio-label">Atau URL sampul<input value={cover} onChange={e => onCover(e.target.value)} type="url" placeholder="https://..."/></label>
  </div>;
}
