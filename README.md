# KataKecil

A quiet personal EPUB library. One horizontal carousel, two bottom tabs, and a full-viewport reader. The Site remains public at https://luminaglass-reading-room.saptajulianto80.chatgpt.site.

## Experience

- The Library displays the owner's three approved books from Supabase. Legacy demo books are no longer published with the app.
- Bottom tabs: **Library** and **Pengaturan**. Both disappear during reading.
- Settings offer light/dark/system theme, preset or custom accent colors, serif/sans, and text size. EPUB import is inside the closed **Lanjutan** section.
- Books open in reading mode. A tap or inward two-finger pinch opens controls and scales the existing page down. Tap the page to return to full size. Menu toggling preserves the page DOM, pagination, selected font size, and reading anchor.
- Swipe or arrow keys turn pages. The reader menu contains contents, bookmarks, appearance, and a progress scrubber.
- Select text to highlight in four colors or add a note. Native copy/cut, reader context menus, and text dragging are suppressed; application-owned selection is enabled. Editing or copying your own notes remains available. Browser/OS selection menus can vary; this is a reading interaction preference, not DRM.
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

## Reader corrections (4 November 2026)

Parser revision 3 recognizes EPUB 3 navigation, chapter/episode markers inside headings or short styled paragraphs, and nested chapter number/name spans. Only the source subtitle is displayed; no synthetic Bab/Section number is inserted. Title/front/imprint/copyright documents no longer create near-empty reading pages. Number-only chapters have no fabricated visible heading. The parser cache is refreshed, with saved positions and notes relocated by source document and exact text; unmatched notes remain exportable and are marked for review.

Pagination fills the available measured space without jumping back to an earlier paragraph. Final chapter pages can naturally be short. The full-screen menu action now invokes the browser Fullscreen API; an unsupported browser gets a clear message without silently using the action to close the menu. Tap/pinch remains a separate reading-controls interaction.

The shelf uses a fixed-height viewport layout, smaller artwork, and contain-fit covers. The new KataKecil mark, favicon, settings icons, and reduced-motion-aware transitions replace the previous branding. Public URL and persisted device data keys remain stable.

## Custom selection and glass update

The reader now renders highlight selection with DOM Range geometry and application-owned handles. It never adds a range to the browser Selection, which avoids the native selection path used by Chrome contextual search. Reader text has native selection disabled; long-press, mouse drag, handle dragging, or keyboard H start/adjust the application highlight. Swipe and multi-touch cancel pending selection. Note editors retain their normal text behavior. The Chrome/Android browser-owned search panel still requires real-device confirmation in this environment; no browser-control tool is available here.

EPUB parser revision 4 stores the original BAB/EPISODE/CHAPTER number separately from the subtitle and restores that marker above the title. The count comes from source text/navigation rather than spine indexes. The carousel removes repeated title/author captions, increases whole-cover size, and retains viewport bounds.

The logo at `dist/assets/katakecil-logo.png` was generated with the image generation tool and is used as the app mark and favicon. Its original remains in `/workspace/generated_images`. Menu icons use rounded geometry and slightly bolder strokes. Glass uses lower opacity, stronger backdrop blur/saturation, inner highlights, and a subtle accent background to make refraction/blur visible. The app remains buildless HTML/CSS/JavaScript; Next.js is not used or required for these effects.

## App language

Settings now includes **Bahasa aplikasi / App language** with **Bahasa Indonesia** and **English**. The choice is saved as `uiLanguage` in the existing device preferences and synchronizes across tabs. Indonesian remains the default for existing devices.

Localization is limited to interface labels, messages, prompts, navigation, and accessibility attributes. EPUB prose, source chapter titles/numbers, book metadata, selected quotations, personal notes, and editable text opt out explicitly. The document language follows the app preference while each book's text retains its own `lang`. Changing app language updates UI nodes in place and does not repaginate books or update reading progress.

Tests verify reversible interface translation, book and note text preservation, English UI surrounding an Indonesian EPUB, persistence, and cross-tab language changes without replacing the reader page or changing its anchor.
