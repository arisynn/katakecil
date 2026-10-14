import React, { useEffect, useState } from 'react';
import type { Book } from '../data/library';
import { classifyCover, defaultFocus, shelfNeedsFill, type CoverMeasure } from '../utils/coverFit';

const FALLBACK_COVERS = [
  '/assets/v6/covers/01-senja.webp',
  '/assets/v6/covers/02-langit.webp',
  '/assets/v6/covers/03-jejak.webp',
  '/assets/v6/covers/04-ruang.webp',
  '/assets/v6/covers/05-hujan.webp',
  '/assets/v6/covers/06-rumah.webp',
  '/assets/v6/covers/07-tertunda.webp',
  '/assets/v6/covers/08-bunga.webp',
];
const MOBILE_FALLBACK_COVERS = FALLBACK_COVERS.map(path => path.replace('.webp', '-mobile.webp'));
function fallbackCoverIndex(book: Pick<Book, 'id'|'title'>) {
  const title = book.title.toLocaleLowerCase('id-ID');
  const known = ['senja', 'langit', 'jejak', 'ruang', 'hujan', 'rumah', 'tertunda', 'bunga'];
  const named = known.findIndex(word => title.includes(word));
  if (named >= 0) return named;
  const hash = Array.from(book.id).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
  return hash % FALLBACK_COVERS.length;
}
export function fallbackCover(book: Pick<Book, 'id'|'title'>) {return FALLBACK_COVERS[fallbackCoverIndex(book)];}
export function fallbackCoverMobile(book: Pick<Book, 'id'|'title'>) {return MOBILE_FALLBACK_COVERS[fallbackCoverIndex(book)];}

export function Cover({book, size = 'normal', eager = false, surface = 'shelf'}: {
  book: Pick<Book, 'title'|'genre'|'cover_url'|'id'>;
  size?: 'normal'|'mini'|'large';
  eager?: boolean;
  surface?: 'shelf' | 'detail' | 'thumb';
}) {
  const [failed, setFailed] = useState(false);
  const [measure, setMeasure] = useState<CoverMeasure | null>(null);
  useEffect(() => { setFailed(false); setMeasure(null); }, [book.cover_url]);
  const original = Boolean(book.cover_url) && !failed;
  const src = original ? book.cover_url! : fallbackCover(book);
  const fill = original && measure ? shelfNeedsFill(measure.ratio) : false;
  const focus = measure ? defaultFocus(measure.kind) : { x: 0.5, y: 0.5 };
  const detailRatio = surface === 'detail' && measure && measure.kind !== 'poster'
    ? `${measure.width} / ${measure.height}`
    : undefined;
  return <>
    <div
      className={`art-cover v6-cover art-cover--${size} ${original ? 'v6-original-cover' : 'v6-fallback-cover'}`}
      data-cover-kind={original ? (measure?.kind ?? 'unknown') : 'fallback'}
      data-cover-fill={fill ? 'yes' : 'no'}
      data-cover-surface={surface}
      style={detailRatio ? { aspectRatio: detailRatio } : undefined}
    >
      {original && <img src={src} alt="" aria-hidden="true" className="art-cover-backdrop v6-cover-backdrop" loading={eager ? 'eager' : 'lazy'}/>}
      <picture>
        {!original && <source media="(max-width: 600px)" srcSet={fallbackCoverMobile(book)} type="image/webp" />}
        <img
          src={src}
          alt={`Ilustrasi sampul ${book.title}`}
          className="art-cover-image v6-cover-image"
          style={original ? { objectPosition: `${focus.x * 100}% ${focus.y * 100}%` } : undefined}
          loading={eager ? 'eager' : 'lazy'}
          decoding="async"
          onLoad={event => {
            if (!original) return;
            const img = event.currentTarget;
            setMeasure(classifyCover(img.naturalWidth, img.naturalHeight));
          }}
          onError={() => setFailed(true)}
        />
      </picture>
      {surface !== 'detail' && fill && measure && <span className="kk-cover-shelf-tag">{measure.ratioName}</span>}
    </div>
    {surface === 'detail' && measure && <p className="kk-cover-shape">{measure.ratioName} · {measure.label}</p>}
  </>;
}
