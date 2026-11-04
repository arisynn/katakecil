# LuminaGlass Reader

An atmospheric, local-first EPUB reader. Open the deployed Site, choose a book, and start reading. The app requires no application account. The hosted Site is private to its owner by default.

## Features

- Six complete public-domain EPUBs bundled locally, with original SVG cover art.
- Import DRM-free EPUBs (up to 30 MB), public EPUB URLs, or a Supabase public bucket catalog.
- Single-page and two-page layouts; keyboard arrows, swipe, page scrubber, and chapter navigation.
- Text anchored highlights in amber, emerald, sapphire, and rose, personal notes, and bookmarks. Annotation anchors survive typography changes.
- Adjustable glass blur/opacity, font, text size, line spacing, margins, and page transitions.
- Paper, Sepia, Obsidian, and automatic light mode. AmbientLightSensor is used when supported; the system color scheme is the fallback. The lux simulator works everywhere.
- UUID device identity; preferences in LocalStorage; imported books and cached demo text in IndexedDB; progress and annotations in both. BroadcastChannel plus storage events update open tabs.
- Export notes as JSON. No reading data is sent to Supabase or another cloud service.

## Supabase prototype

The bundled collection loads its manifest from `/storage/v1/object/public/lumina-library/catalog.json`, a local Storage bucket prototype; it is explicitly labeled as a demo. No live Supabase project, database, API key, authentication, or cloud syncing is configured.

Use **Add a book** with a public URL in the documented Supabase format:

```
https://PROJECT.supabase.co/storage/v1/object/public/BUCKET/book.epub
```

For a catalog, provide a JSON URL or public bucket base URL containing `catalog.json`:

```json
{"books":[{"title":"Book title","url":"./book.epub"}]}
```

Catalogs accept up to 20 books; relative EPUB URLs resolve against the catalog URL. The source must allow CORS. Private buckets and secret/service-role keys are deliberately unsupported in this browser-only app.

## Local development and validation

This is a buildless static application. `dist/` is the deployable app; `.openai/hosting.json` sets its Site identity. Serve `dist/` over HTTP(S), not file://. A secure context is needed for device UUID generation and imported-file fingerprinting.

```
npm ci
npm test
npm run check
```

DOM-based tests cover real EPUB extraction, pagination, persistence, and reader interactions. They do not replace visual browser QA.

`python scripts/prepare-assets.py` downloads the public-domain EPUBs and self-hosted font files; `python scripts/create-covers.py` regenerates original cover artwork. Dependencies are pinned and static vendor assets are included for deployed use. JSZip 3.10.1 is MIT/GPL-3.0 dual licensed; see `dist/vendor/JSZip-LICENSE.txt`.

## Limits

Reflowable, text-based EPUBs are supported. DRM-encrypted, image-only, and fixed-layout books are unsupported. Imported text is extracted from the spine and rendered as inert text; publisher HTML, external resources, images, and typography are not reproduced. Page counts change with reading settings and window size. Positions and annotations use chapter character offsets rather than publisher CFIs.

Data belongs to this browser origin. Clearing browser data removes it. Different devices, browsers, and origins have independent libraries. Export notes before clearing data. AmbientLightSensor is browser- and permission-dependent; simulated lux and system theme remain available. For large books, pages scroll naturally when required rather than clipping content.

## Book sources and licenses

Project Gutenberg editions: Alice's Adventures in Wonderland (#11), Pride and Prejudice (#1342), Frankenstein (#84), The Adventures of Sherlock Holmes (#1661), Treasure Island (#120), The Time Machine (#35). EPUBs retain their original Gutenberg license information. Public domain in the US; copyright laws vary elsewhere. DM Sans, Fraunces, Lora, Plus Jakarta Sans, Merriweather, and JetBrains Mono are distributed under the SIL Open Font License.
