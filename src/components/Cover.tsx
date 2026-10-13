import React, { useState } from 'react';
import type { Book } from '../data/library';

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
export function fallbackCover(book: Pick<Book, 'id'|'title'>) {
  const title = book.title.toLocaleLowerCase('id-ID');
  const known = ['senja', 'langit', 'jejak', 'ruang', 'hujan', 'rumah', 'tertunda', 'bunga'];
  const named = known.findIndex(word => title.includes(word));
  if (named >= 0) return FALLBACK_COVERS[named];
  const hash = Array.from(book.id).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);
  return FALLBACK_COVERS[hash % FALLBACK_COVERS.length];
}
export function Cover({book, size = 'normal', eager = false}: {book: Pick<Book, 'title'|'genre'|'cover_url'|'id'>; size?: 'normal'|'mini'|'large'; eager?: boolean}) {
  const [failed, setFailed] = useState(false);
  const src = book.cover_url && !failed ? book.cover_url : fallbackCover(book);
  return <div className={`art-cover v6-cover art-cover--${size} ${book.cover_url && !failed ? 'v6-original-cover' : 'v6-fallback-cover'}`}>
    {book.cover_url && !failed && <img src={src} alt="" aria-hidden="true" className="art-cover-backdrop v6-cover-backdrop" loading={eager ? 'eager' : 'lazy'}/>}
    <img src={src} alt={`Ilustrasi sampul ${book.title}`} className="art-cover-image v6-cover-image" loading={eager ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)}/>
  </div>;
}
