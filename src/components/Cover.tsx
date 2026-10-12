import React from 'react';
import type { Book } from '../data/library';
export function Cover({book, size = 'normal'}: {book: Pick<Book, 'title'|'genre'|'cover_url'|'id'>; size?: 'normal'|'mini'|'large'}) {
  const palette = ['sage','rose','blue','amber','orchid'];
  const theme = palette[Array.from(book.id).reduce((t,c)=>t+c.charCodeAt(0),0) % palette.length];
  return <div className={`art-cover art-cover--${theme} art-cover--${size}`}>
    {book.cover_url ? <>
      <img src={book.cover_url} alt="" aria-hidden="true" className="art-cover-backdrop" loading="lazy"/>
      <img src={book.cover_url} alt={`Sampul ${book.title}`} className="art-cover-image" loading="lazy"/>
    </> : <>
      <span className="cover-stars">✦ &nbsp; · &nbsp; ✧</span><div className="cover-orb"/><div className="cover-scene"><span className="cover-scene-one"/><span className="cover-scene-two"/><span className="cover-scene-three"/></div>
      <div className="cover-words"><span className="cover-kicker">SEBUAH CERITA</span><strong>{book.title}</strong><small>{book.genre || 'Fiksi'}</small></div>
    </>}
  </div>;
}
