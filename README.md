# KataKecil

A quiet personal library with a full-screen reader. This checkout is a static JavaScript application, with isolated TypeScript reader helpers bundled by esbuild. It is not a React/Vite or Next.js project. The existing Sites project identity/hosting manifest is retained; no hosting migration is made.

The advanced Reader work lives on `feat/advanced-reader`. **This development update has not been deployed.** Production and database data were not modified.

## Develop and validate

```sh
npm ci
npm run build
npm run typecheck
npm run check
npm test
```

`dist/` remains the static output. Build bundles `src/reader/` and copies third-party notices; the existing UI and measured pagination are retained. TypeScript checks the new helpers and prepared compatibility Edge Function; JavaScript UI is syntax/integration-tested. Tests use Node 24+, jsdom and fake-indexeddb, not a rendered browser.

## Reader

- Existing carousel, glass UI, generated logo, English default/Indonesian app language, custom selection, copy protection, pinch menu, swipe, native fullscreen and measured pagination remain.
- Pages or continuous scrolling within an episode; previous/next episode, direct page jump, slider, edge taps and two-page mode at widths of at least 1,000px.
- Typography/layout controls, five named reading palettes, custom colors with contrast preview, dimming overlay and optional browser screen controls.
- Separate Contents, Highlights, Notes and Bookmarks panels, color/episode filters, bookmark labels, scoped exports, and stable episode/quote/context/offset/hash anchors.
- Local episode search, selected-word English/Indonesian dictionary, selected-text translation and browser read-aloud with voice/language/rate/resume controls.
- Copying/sharing book text remains disabled. Only explicit selected-text lookup actions send text to dictionary/translation services. Voice labels distinguish device and online speech engines.

## Published content and storage

The frontend uses the existing `katakecil-reader` Supabase Edge Function. Its server-side RLS/publication checks and revision-checked EPUB generation are unchanged. Each opening fetches current publication metadata and revision-verified content; returning to a visible tab revalidates the publication. The frontend verifies parsed section identities and fails closed on unavailable/stale content.

Server manuscripts are held in memory only. A successful catalog load migrates bounded legacy position/annotation anchors, then removes old server EPUB caches from IndexedDB. Offline library metadata can be shown, but opening a server book requires online authorization. User-imported EPUBs remain device-local in IndexedDB.

Existing device UUID and storage keys are retained. LocalStorage holds preferences, catalog metadata, progress and annotation metadata/bounded quotations, never a manuscript cache. IndexedDB backs up progress/annotations; metadata-only deletion tombstones prevent recovery from resurrecting removed notes. Storage failures are surfaced if both mechanisms fail. Notes remain device/browser-local; no new account or cloud annotation tables were added.

The former `lumina-library` signed-source gateway has a **prepared, undeployed** compatibility hardening patch in this branch. It forwards legacy clients to published authorization and no longer needs secrets or Storage signatures. **The live legacy gateway is unchanged until separately approved deployment; publishing only the frontend would leave that old raw-source route reachable.**

The published sample uses its real ID `contoh-katakecil`; the earlier internal EPUB ID is not aliased to it. Old annotations retain their book IDs and remain available in the device-wide export. Unresolvable source locations are marked for review rather than attached to another episode.

## Reports and licenses

- [Complete audit, implementation, tests and deployment status](docs/advanced-reader-report.md)
- [Test evidence and remaining QA](docs/advanced-reader-test-results.md)
- [Deployment and rollback](docs/advanced-reader-deployment.md)
- [Open-source attributions](OPEN_SOURCE_ATTRIBUTIONS.md)

Real-browser geometry, physical mobile gestures, actual speech audio/boundary support and browser permission behavior still require staging/device QA. Simulated width checks are not screenshot tests. Historical audit documents describe earlier releases; the advanced-reader report is authoritative for this branch.
