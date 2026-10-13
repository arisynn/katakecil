import React from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import { Cover } from '../../../components/Cover';
import type { Book } from '../../../data/library';
import { navigate } from '../../../utils/nav';
import { useCollection } from '../../../utils/collection';
export function BookmarkButton({ book, compact = false }: {
    book: Book;
    compact?: boolean;
}) {
    const { has, toggle } = useCollection();
    return <button className={`v6-bookmark ${compact ? 'compact' : ''} ${has(book.id) ? 'saved' : ''}`} title={has(book.id) ? 'Hapus dari koleksi' : 'Simpan ke koleksi'} aria-label={has(book.id) ? `Hapus ${book.title} dari koleksi` : `Simpan ${book.title} ke koleksi`} aria-pressed={has(book.id)} onClick={e => { e.stopPropagation(); toggle(book.id); }}>{has(book.id) ? <BookmarkCheck size={19}/> : <Bookmark size={19}/>}</button>;
}
export function BookCard({ book, count, demo, variant = 'default' }: {
    book: Book;
    count: number;
    demo: boolean;
    variant?: 'default' | 'featured' | 'horizontal';
}) {
    return <article className={`v6-story-card v6-story-${variant}`}>
    <button className="v6-story-open" onClick={() => navigate(`/cerita/${book.slug}`)} aria-label={`Buka ${book.title}`}><Cover book={book}/><span className="v6-story-meta"><strong>{book.title}</strong><small>{book.genre || 'Fiksi'}</small>{variant === 'default' && <span>{demo ? 'Contoh tampilan' : count ? `${count} Bab` : 'Belum ada bab'}</span>}</span></button>
    <BookmarkButton book={book}/>
  </article>;
}
