import React from 'react';
import { ArrowRight, ChevronRight } from 'lucide-react';
import { navigate } from '../../../utils/nav';
export function Action({ children, to, className = '' }: {
    children: React.ReactNode;
    to: string;
    className?: string;
}) { return <button className={className} onClick={() => navigate(to)}>{children}</button>; }
export function EmptyLibrary({ collection = false }: {
    collection?: boolean;
}) {
    return <section className="v6-empty"><picture><source media="(max-width: 600px)" srcSet="/assets/v6/empty-library-mobile.webp" type="image/webp"/><img src="/assets/v6/empty-library.webp" alt="Buku terbuka di meja dekat jendela" loading="lazy" decoding="async"/></picture><div className="v6-empty-copy"><h2>{collection ? 'Koleksimu masih kosong' : 'Belum ada cerita di sini'}</h2><p>{collection ? 'Simpan cerita yang kamu sukai melalui ikon penanda pada sampul.' : 'Mulai dari halaman perpustakaan untuk menemukan cerita yang telah diterbitkan.'}</p><Action to="/cerita" className="v6-button v6-button-dark">Jelajahi cerita <ArrowRight size={17}/></Action></div></section>;
}
export function Heading({ title, to }: {
    title: string;
    to?: string;
}) { return <div className="v6-section-heading"><h2>{title}</h2>{to && <Action to={to} className="v6-see-all">Lihat Semua <ChevronRight size={15}/></Action>}</div>; }
