import React from 'react';
import { ArrowRight, BookOpen, Bookmark, ChevronRight } from 'lucide-react';
import { navigate } from '../../../utils/nav';

export function Action({ children, to, className = '' }: {
    children: React.ReactNode;
    to: string;
    className?: string;
}) {
    return <button type="button" className={className} onClick={() => navigate(to)}>{children}</button>;
}

/**
 * V7 empty state is deliberately independent of V6's illustrated .v6-empty.
 * The legacy class has a cream ::after gradient, even when its background is
 * overridden by Sapphire theme tokens. Keep empty states small and legible.
 */
export function EmptyLibrary({ collection = false }: { collection?: boolean }) {
    return <section className="kk-v7-empty" aria-label={collection ? 'Koleksi kosong' : 'Belum ada cerita'}>
        <div className="kk-v7-empty__icon" aria-hidden="true">
            {collection ? <Bookmark size={27} strokeWidth={1.8}/> : <BookOpen size={27} strokeWidth={1.8}/>}
        </div>
        <div className="kk-v7-empty__copy">
            <h2>{collection ? 'Rak ceritamu masih kosong' : 'Belum ada cerita terbit'}</h2>
            <p>{collection
                ? 'Cerita yang kamu simpan dari halaman detail akan muncul di sini.'
                : 'Cerita terbaru dari Karisyono akan tampil di sini saat sudah diterbitkan.'}</p>
        </div>
        {collection && <Action to="/temukan" className="kk-v7-empty__action">
            Temukan cerita <ArrowRight size={17} aria-hidden="true"/>
        </Action>}
    </section>;
}

export function Heading({ title, to }: { title: string; to?: string }) {
    return <div className="v6-section-heading">
        <h2>{title}</h2>
        {to && <Action to={to} className="v6-see-all">Lihat Semua <ChevronRight size={15}/></Action>}
    </div>;
}
