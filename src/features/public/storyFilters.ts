import type { Book } from '../../data/library';

/** A hiatus is not an ongoing serial. Keep filter labels consistent with story detail. */
export type StoryStatusFilter = 'Semua' | 'Berlangsung' | 'Tamat' | 'Jeda';
export function matchesStoryStatus(status: Book['status'], filter: StoryStatusFilter): boolean {
  switch (filter) {
    case 'Semua': return true;
    case 'Berlangsung': return status === 'ongoing';
    case 'Tamat': return status === 'completed';
    case 'Jeda': return status === 'hiatus';
  }
}
