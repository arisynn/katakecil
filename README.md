# LuminaGlass

A quiet personal EPUB library. One horizontal carousel, two bottom tabs, and a full-viewport reader. The Site remains public at https://luminaglass-reading-room.saptajulianto80.chatgpt.site.

## Experience

- The Library displays the owner's three approved books from Supabase. Legacy demo books are no longer published with the app.
- Bottom tabs: **Library** and **Pengaturan**. Both disappear during reading.
- Settings offer light/dark/system theme, preset or custom accent colors, serif/sans, and text size. EPUB import is inside the closed **Lanjutan** section.
- Books open in reading mode. A tap or inward two-finger pinch opens controls and scales the existing page down. Tap the page to return to full size. Menu toggling preserves the page DOM, pagination, selected font size, and reading anchor.
- Swipe or arrow keys turn pages. The reader menu contains contents, bookmarks, appearance, and a progress scrubber.
- Select text to highlight in four colors or add a note. Native copy/cut, reader context menus, and text dragging are suppressed; selection is enabled. Editing or copying your own notes remains available. Browser/OS selection menus can vary; this is a reading interaction preference, not DRM.
- Page text is measured against available viewport height after fonts are loaded. Fullscreen means the available browser viewport with safe-area insets; iOS browser chrome is controlled by the browser.

## Supabase source

The app calls `https://hrbcwymdqigtfmpmsdsi.supabase.co/functions/v1/lumina-library`.

The owner explicitly approved public reading of three EPUB objects in the private `kk-sources` bucket. The new `lumina-library` Edge Function:

- Returns only the three allowlisted books, with metadata from `kk_books`.
- Issues a ten-minute Storage signed URL only for an exact allowlisted book ID.
- Keeps the entire source bucket private. Existing `katakecil-reader` and `katakecil-publisher` functions are unchanged.
- Rejects arbitrary paths, unknown actions, and write methods. No database schema or RLS policies were changed.
- Uses Supabase's server-injected secret key (legacy service-role fallback) only within the function. No secret/publishable keys are shipped to the Site frontend.

The source is in `supabase/functions/lumina-library/`. The function is intentionally public (`verify_jwt=false`) for the owner's approved public collection. Adding other books requires updating its allowlist; the browser cannot request arbitrary private storage objects.

The third source EPUB is a very small internal sample titled **Ruang Kecil**. The two full novels are **Masa Panen** and **Garis yang Kita Teruskan**.

## Saving

Existing device UUID, progress, notes, bookmarks, and preferences are retained. Schema version 2 adds accent color, defaults to a single-page reader, and maps the previous sensor theme to system theme. Old book annotations remain exportable even when that book is outside the new collection.

- LocalStorage: preferences, progress/annotation mirrors, selected carousel book, last successful catalog.
- IndexedDB: parsed books keyed by stable ID and content version; progress and annotations.
- BroadcastChannel and storage events: local tab updates.

Catalog metadata wins over cached metadata. Only matching content versions reuse parsed EPUB text. A failed network request shows the last successful collection if present, or a retry state on first use. No demo catalog replaces a failed Supabase request. Imported EPUBs stay on the device.

## Validation

```
npm ci
npm test
npm run check
```

Tests cover real legacy EPUB parsing, measured-pagination boundaries and cancellation, persistence and sync, the personal carousel, settings/accent persistence, full-reader/menu state, selection/highlighting/notes, copy suppression, scrubber navigation, simulated pinch versus swipe, and the backend allowlist/signing boundary.

DOM tests do not measure a real browser's layout or verify Safari gesture behavior. The current environment does not provide the required browser QA tool, so actual iPhone/Android pinch, text-fit, and safe-area behavior remain unverified. Zoom is not disabled globally; pinch-out retains normal browser behavior.

The three live approved files were downloaded through the new service and parsed successfully during implementation. Those private source files are served by Supabase and are not copied into the repository or the static deployment.

`tests/fixtures/epubs/` contains the earlier public-domain Project Gutenberg editions as parser regressions. JSZip 3.10.1 is vendored with its license. Self-hosted font licenses are in `dist/fonts/`.
