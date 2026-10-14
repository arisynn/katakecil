import React from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Cover } from '../../../components/Cover';
import type { Book } from '../../../data/library';
import { navigate } from '../../../utils/nav';
import { useCollection } from '../../../utils/collection';
/** Collection is deliberately managed from the detail screen, never on cover art. */
export function BookmarkButton({ book }: { book: Book }) {
  const { has, toggle } = useCollection();
  const saved = has(book.id);
  return <button type="button" className={`kk-v7-save ${saved ? 'is-saved' : ''}`}
    aria-pressed={saved} aria-label={saved ? `Hapus ${book.title} dari Koleksi` : `Simpan ${book.title} ke Koleksi`}
    onClick={() => toggle(book.id)}>
    {saved ? <BookmarkCheck size={19} aria-hidden="true"/> : <Bookmark size={19} aria-hidden="true"/>}
    <span>{saved ? 'Tersimpan di Koleksi' : 'Simpan ke Koleksi'}</span>
  </button>;
}
export function BookCard({ book, count, demo, variant = 'default' }: {
  book: Book; count: number; demo: boolean; variant?: 'default' | 'featured' | 'horizontal';
}) {
  return <article className={`kk-v7-story-card v6-story-${variant}`}>
    <button type="button" className="kk-v7-story-open" onClick={() => navigate(`/cerita/${book.slug}`)} aria-label={`Lihat detail ${book.title}`}>
      <div className="kk-v7-cover"><Cover book={book}/></div>
      <span className="kk-v7-story-title">{book.title}</span>
      {variant === 'horizontal' && <span className="kk-v7-story-caption">{book.genre || 'Fiksi'} · {demo ? 'Pratinjau' : `${count} bab`}</span>}
    </button>
  </article>;
}
