import type React from 'react';
import type { User } from '@supabase/supabase-js';
import type { Episode } from '../../../data/library';
import { episodeStatus } from '../../../data/library';
import { navigate } from '../../../utils/nav';
export function B({ children, to, className = '', disabled = false }: {
    children: React.ReactNode;
    to?: string;
    className?: string;
    disabled?: boolean;
}) {
    return <button disabled={disabled} className={className} onClick={() => to && navigate(to)}>{children}</button>;
}
export function Pill({ episode }: {
    episode: Episode;
}) { const status = episodeStatus(episode); return <span className={`studio-pill ${status === 'Terbit' ? 'pill-live' : status === 'Terjadwal' ? 'pill-scheduled' : 'pill-draft'}`}>{status}</span>; }
export function authorName(user: User): string {
    const meta = user.user_metadata as Record<string, unknown> | undefined;
    const name = meta?.display_name || meta?.full_name || meta?.name || user.email?.split('@')[0];
    return typeof name === 'string' && name.trim() ? name.trim() : 'Penulis';
}
export const errMsg = (e: unknown) => e instanceof Error ? e.message : String(e);
