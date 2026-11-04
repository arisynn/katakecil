# KataKecil — Advanced Reader implementation report

Date: 4 November 2026 (UTC). Scope: the existing KataKecil checkout at `/workspace/sites/luminaglass`, branch `feat/advanced-reader`. No production deployment, production migration, publication edit, new account, or cloud annotation table was performed.

## 1. Audit before changes

Baseline commit: `3be496d11d19168980ea1e61de47776b6cad71f8`. Baseline validation actually executed: **21 tests passed**, `npm run check` passed. The working tree was clean before creating the development branch.

The actual application was buildless JavaScript/HTML/CSS with JSZip, device storage, Supabase and Sites hosting. React, Vite, a GitHub application remote and Vercel configuration were not present. `src/data/secureReader.ts`, `src/utils/pagination.ts`, `src/components/PageMeasurer.tsx` and `src/content-protection.css` were not present. Their actual equivalents were `dist/app.js`, `dist/pagination.js`, the hidden page measurement article, `dist/text-selection.js`, and reader CSS/event protection. There was no build or application TypeScript check to run at baseline.

The existing architecture, hosting manifest/project identity, database structure and working Reader were retained. New TypeScript helpers are bundled into one browser module with esbuild; the app UI remains JavaScript and `dist/` remains the static output. No framework migration was made.

The audit found a material content-source mismatch: the public Site used a legacy allowlisted raw-EPUB signing gateway. A separate existing `katakecil-reader` endpoint already generates EPUBs from published, enabled, released sections using RLS, verifies revisions and applies a request budget. The development frontend now uses that existing published endpoint. Its server code is unchanged. A separate, undeployed compatibility patch hardens the legacy gateway so it cannot continue issuing raw source signatures after an approved rollout.

## 2–4. Feature mapping: preserved, improved and added

“Implemented” below means implemented in this development source. Actual verification limits are in section 12 and the test report; browser/device-dependent features are not claimed as device-tested.

| Area | Before | Final implementation |
| --- | --- | --- |
| Measured pagination | Working binary-fit pagination; character preservation tests | Preserved. A backward-compatible fourth `fits` callback argument supplies exact source offset to paragraph measurement; cancellation and impossible-layout behavior retained. |
| Continuous scrolling | Absent | Optional per-episode scroller using the same source text/anchors. Heading scrolls with content. Pages remain the default. Episode navigation is available through Tools. |
| Swipe and inward pinch | Working | Preserved; swipe does not intercept vertical scrolling in scroll mode, pinch still opens the existing scaled-page controls. |
| Tap navigation | Center tap opened controls | Center behavior retained; optional left/right edge page turns added. |
| Page animation | Slide | Slide retained; fade and no-animation options added; reduced-motion preference respected. |
| Slider | Working | Preserved and synchronized with scroll-derived page position. |
| Direct page jump | Absent | Validated page-number form in Tools. |
| Previous/next episode | TOC only | Explicit previous/next episode controls added; boundaries disabled. |
| Contents | Working | Retained in dedicated tab with current chapter indicator and source titles/markers. No artificial Section/Bab numbering added. |
| Page number/progress | Working, page-index percentage | Preserved, now with spread page ranges and source-character percentage for stable progress across layout changes. |
| Autosave/resume | Per-book chapter index/offset | Strengthened with canonical episode href, quote/context, offset and locally computed SHA-256 text hash. Nonzero anchors survive reflow and reopening. |
| Portrait/landscape | Single responsive page | Retained; reflow preserves logical position. Width/height changes are covered by simulated DOM tests, not real layout screenshots. |
| Two pages | Preference existed but renderer was single-page | Actual two-leaf rendering at width >=1,000px, disabled in scrolling mode. Second-leaf selection uses that leaf’s chapter and source offsets. |
| Fullscreen | Native API and unsupported fallback already fixed | Preserved, independent of hiding/showing the reading menu. |
| Screen Wake Lock | Absent | Optional browser API with visibility/exit release and request-race handling; unsupported/rejected states surfaced. |
| Font family | Lora/one sans shortcut | Existing fonts retained; Reader offers Lora, Jakarta Sans, system, Georgia and monospace. No arbitrary remote font URL is loaded. |
| Font size | 14–28px | 14–32px; measured reflow retained. |
| Weight/line height | Stored line height, limited exposed controls | Weight 400–700 and line-height controls apply real CSS and trigger reflow. |
| Paragraph/letter spacing, alignment, indentation | Mostly absent | Real paragraph wrappers, spacing, letter spacing, alignment and first-line indentation; original UTF-16 text/separators preserved. |
| Margins, column width, content position | Mostly fixed | Side/vertical margins, maximum column width and top/center position added. Short viewports cap vertical margins for usable text space. |
| Screen orientation | Absent | Browser orientation lock/unlock action with unsupported/rejection feedback; manual rotation remains supported. |
| Reading palettes | App light/dark/system only | Reader follow-app, light, dark, sepia, paper, green and custom colors. App theme remains separate. |
| Custom ink/paper and preview | Absent | Preview before Apply, minimum 4.5:1 contrast, persisted custom colors. |
| Brightness | Absent | Noninteractive dimming overlay (not hardware brightness). |
| Preferences | Existing device keys, UUID, tab sync | Preserved and extended. Layout controls reflow; language/theme-only changes do not replace source text. Failed user layout changes restore the previous value. |
| Bookmark create/delete/list/jump | Working | Preserved; label editing, source-episode metadata and stable anchors added. |
| Highlight selection/four colors/edit/delete | Working custom selection | Preserved; reused open-source quote anchoring, episode identity and text hash strengthen persistence. Repeated quotes remain at exact offsets when episode text is unchanged. |
| Notes create/edit/delete | Working linked to highlights | Preserved. A note can now be removed while retaining its highlight. |
| Annotation panels | Contents, combined notes/highlights, bookmarks | Separate Contents, Highlights, Notes and Bookmarks tabs with icons, keyboard navigation, glass styling and no opaque strip. |
| Filters | Absent | Episode and color filters. Bookmark lists do not inherit hidden color filtering. |
| Exports | Device-wide JSON | Preserved; book-scoped JSON export added, containing annotation metadata/selected quotations only. |
| Annotation stability | Index/offset with parser migration | Exact quote/prefix/suffix/offset/episode/hash anchors; ambiguous or unavailable source locations marked for review. Unverified server quotations are kept in local export rather than displayed as current published text. |
| Storage reliability | LocalStorage authoritative; IDB fallback only if key absent | Timestamped IDB recovery and metadata-only deletion tombstones prevent quota-related loss and deleted-note resurrection. Both-storage failure displays an export/recovery warning. |
| Episode search | Absent | Local literal case-insensitive word/phrase search, counts, matched text, result navigation and episode selector. Up to 1,000 navigable results, first 100 rendered in list; overflow disclosed. Query maximum 200 characters. No query history added. |
| Dictionary | Absent | Explicit selected-word English and Indonesian lookup in Reader; loading/error/empty feedback, cited definitions, no native Google selection. Word maximum 64 characters. |
| Translation | Absent | Explicit selected text only, source/target selector, in-Reader result, 450 UTF-8 byte cap, quotas/timeouts/errors handled. Languages: id/en/es/fr/de/ja/ko/zh. |
| TTS | Absent | EasySpeech voice discovery and playback, play/pause/resume/stop, language, voice, rate, per-book resume, bounded sentence queue, automatic next published episode, sentence and supported word boundary painting. Local/online voices identified. Saves throttled while speaking and flushed on pause/stop. Actual audio still needs device QA. |
| Copy/share | Book copy/cut/context menu suppressed | Protection retained. No copy/share buttons added. Own note editors still allow normal text editing/copying. |
| Word count/reading estimate | No current working Reader implementation | One new Intl.Segmenter-based per-episode word count and approximate 220 words/minute estimate; not a duplicate implementation. |
| Branding/library/language | KataKecil mark, minimal carousel, English default, Indonesian option | Retained. Book titles/prose/notes remain excluded from app translation. Covers retain contain-fit behavior. |

### Anchor/storage details

`dom-anchor-text-quote` describes/locates quotations. KataKecil supplies its stable source episode identity and rejects fuzzy matches that do not reproduce exact quoted text. Episode hashes are computed locally once when content is prepared, allowing unchanged repeated passages to use their original offsets safely. Typography never changes source text.

Old cached raw-EPUB anchors are migrated only when an exact contextual quotation is unique in the current published book. No cross-book remapping occurs. The old internal sample ID is not reassigned to `contoh-katakecil`; its local annotations remain in device-wide exports. Unknown or ambiguous positions are never silently attached to a different episode.

No full server episode/book is written to localStorage or IndexedDB by the new frontend. LocalStorage stores preferences, catalog metadata and bounded position/annotation quotations. User-imported EPUBs remain in the existing local IndexedDB book store. No Supabase annotation/auth subsystem is introduced.

## 5–8. Open-source research and actual reuse

Full notices, source links, versions and transitive licenses are in [OPEN_SOURCE_ATTRIBUTIONS.md](../OPEN_SOURCE_ATTRIBUTIONS.md).

| Repository | License / activity observed | Evaluation and result |
| --- | --- | --- |
| [tilgovi/dom-anchor-text-quote](https://github.com/tilgovi/dom-anchor-text-quote) | MIT; non-archived; last push observed 2023-07-17 | Focused npm 4.0.2 API and implementation reviewed, including DiffMatchPatch matching and 32-character context. Integrated `fromTextPosition` and `toTextPosition`; exact/context/hash safeguards added in the adapter. |
| [jankapunkt/easy-speech](https://github.com/jankapunkt/easy-speech) / [leaonline](https://github.com/leaonline/easy-speech) | MIT; inspected README/API/LICENSE/source; leaonline activity observed 2026-04-03 | Stable npm 2.4.0, zero direct dependencies, browser speech fixes including Android pause behavior. Integrated engine/voice APIs; cancellation and requeue resume from the last boundary avoid relying on Android native pause. |
| [recogito/text-annotator-js](https://github.com/recogito/text-annotator-js) | BSD-3-Clause; active 2026-10-12; npm 4.3.7 | README/config/API, dependencies, quote context and selection handler inspected. Handler calls `document.getSelection()`; importing its manager would replace the custom selection interaction. Not integrated. |
| [readium/speech](https://github.com/readium/speech) | BSD-3-Clause; active 2026-11-02; npm 0.18.0 | README, export/types and `WebSpeechEngine` APIs inspected: utterance model, Readium voices, engine/provider/navigator interfaces and Readium dependencies. Broader than this adapter needs; selected the smaller compatible engine. No code copied. |
| [readium/web](https://github.com/readium/web) | BSD-3-Clause; root activity observed 2025-05-29 | Documentation routes to TS/Go toolkits and Web Publication Manifest architecture. Would replace working content/navigation layers. Not integrated. |
| [readest/readest](https://github.com/readest/readest) | AGPL-3.0; active 2026-11-04 | README/license/activity reviewed. No application/UI/source/assets imported; applicable AGPL compliance/source obligations were not imposed on KataKecil. |

Research metadata was collected from public GitHub and npm, not guessed from popularity. No complete third-party application was copied. Existing pagination and gestures were reused. Native browser APIs are used where appropriate rather than adding packages for one-line platform capabilities.

## 9. Changed files

The complete list is recorded in `docs/generated/advanced-reader-files.txt`. Main groups:

- `dist/app.js`, `dist/config.js`: integration, authorized source, source anchors, progression and existing action handlers.
- `dist/reader-experience.js`, `dist/advanced-reader.css`: scoped Reader panels, scroll/spread rendering, search, tools, speech painting and preferences.
- `dist/pagination.js`: only the optional exact-offset measurer argument. Existing algorithm retained; regression test added.
- `dist/text-selection.js`: event-aware root resolution for second-page selection. Existing gesture/selection logic retained.
- `dist/store.js`: reader defaults, progress merge, durable annotation recovery/tombstones and failure reporting.
- `dist/i18n.js`, `dist/ui.js`, `dist/index.html`: UI labels/errors, a few matching rounded icons and asset references.
- `src/reader/{anchors,display,search,source,speech,tools,index}.ts`, `vendor.d.ts`: typed reusable helpers and OSS adapters.
- `dist/advanced-reader.js`, `dist/vendor/licenses/*`, `dist/vendor/OPEN_SOURCE_ATTRIBUTIONS.md`: generated bundle/notices.
- `scripts/build-reader.mjs`, `scripts/check-reader.mjs`, `scripts/verify-published-fixtures.mjs`, `package.json`, lockfile, `tsconfig.json`: reproducible build/checks, strict helper/Edge typing and read-only snapshot verifier.
- `supabase/functions/lumina-library/index.ts`, `runtime.d.ts`: prepared legacy compatibility hardening. Existing secure Reader/publisher functions are unchanged.
- `tests/advanced-reader.test.mjs`, `reader.test.mjs`, `pagination.test.mjs`, `library-service.test.mjs`: real feature/security/data regressions; server fixtures now model published EPUB responses.
- README, this report, test/deployment reports, generated evidence and open-source attributions.

## 10. Dependencies

Runtime additions: `dom-anchor-text-quote@4.0.2`, `easy-speech@2.4.0`. Their six transitive runtime dependencies and licenses are listed in the attribution file.

Development additions: `esbuild@0.28.2`, `typescript@7.0.2`, `@types/node@26.6.6`. Existing jsdom and fake-indexeddb versions are unchanged. All inputs are pinned; build output records included source modules and size in `docs/generated/reader-bundle.json`.

## 11. Database and production impact

**No Supabase schema, table, policy, account, book/episode content, identity or publication schedule was changed. No migration is required.** Existing IndexedDB stores are reused; deletion tombstones are metadata records, not a new database store or cloud table.

Read-only checks confirmed RLS on `kk_books`, `kk_sections`, `kk_release_schedule`. Public book reads require `is_published`; public section reads require `is_enabled`, `release_at <= now()` and a published parent book. The unchanged secure function uses the public reader client for content, checks revision before/after EPUB assembly and uses its privileged client only for the existing read-budget RPC.

The frontend sends no service key. The prepared compatibility gateway requires no service key or Storage signing. Supabase security advisor returned **zero lints** during this audit. This does not resolve the still-live legacy raw-source route automatically; that server patch remains undeployed pending approval.

## 12. Testing actually performed

See [test evidence](advanced-reader-test-results.md) for exact results and limits.

- Baseline: 21/21 tests and original syntax check passed before editing.
- Final suite: **42** tests passed, zero failures (`npm test`).
- Build, strict TypeScript helper/Edge check, all top-level frontend JavaScript syntax/entry/security-boundary checks: **PASS**.
- npm audit: **0 vulnerabilities (info/low/moderate/high/critical: 0)**. It covers npm dependencies; vendored JSZip/fonts are outside npm advisory coverage.
- Source rollback validation at `1715b3f3d1b498e13312936d860a7a286dd690d4`: **21 tests passed, 0 failed; syntax check passed**.
- Simulated widths: 320, 375, 390, 430, 768 and 1440px; simulated 730x360 landscape; position retained and two-page threshold checked. These tests do not evaluate actual browser CSS layout.
- Three live published EPUBs downloaded read-only from the existing endpoint, revision headers verified, parsed chapter IDs matched to published section IDs. Test pagination retained every character of each parsed chapter. No manuscript text is included in the report/artifact.
- Dictionary English/Indonesian and MyMemory probes returned HTTP 200 and CORS `*` using only generic `rain`, `hujan`, `Halo` examples.
- Real browser/device screenshots, physical touch/pinch, browser fullscreen/orientation/wake permissions, actual speech audio and voice boundary events were **not run**.

Published-snapshot verification (fixed 1,400-character test capacity, not a real-layout page count):

| Book ID | Published sections | Readable chapters after existing front-matter filtering | Characters | Test pages |
| --- | ---: | ---: | ---: | ---: |
| garis-yang-kita-teruskan-karisyono-final-45-bab | 13 | 11 | 143,101 | 108 |
| masa-panen-google-play-ready-1 | 49 | 48 | 534,069 | 408 |
| contoh-katakecil | 3 | 3 | 4,272 | 4 |

## 13. Remaining limits and findings

1. **Required real-browser/device QA is still open.** The Sites skill explicitly says: “If `cua_repl.js` is unavailable, skip browser QA: do not start a preview server, install a browser, or improvise another browser-control path.” The required tool is unavailable here. [Exact Sites SKILL.md](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md). No screenshot/physical-device PASS is claimed.
2. Browser engines/voices can omit word boundary events or reject speech, wake lock, fullscreen/orientation. Sentence painting and unavailable states are implemented, but hardware/browser behavior needs staging verification. Resume can repeat the current short utterance if no word boundary is available.
3. Dictionary supports English/Indonesian; other UI source languages apply to translation. External services can be unavailable, log explicit requests or enforce quotas. Translation is capped at 450 UTF-8 bytes. No paid API credentials are required or installed.
4. Scroll mode is continuous within one episode; previous/next episodes are explicit actions. It does not mount an entire novel into one huge DOM. Search is episode-scoped and bounded as disclosed.
5. Ambiguous old annotations cannot be safely recovered automatically. They remain exportable, marked for review and cannot jump into another episode. A removed/unknown legacy sample book ID is not reassigned.
6. The old production raw-source gateway remains unchanged and reachable until its prepared hardening is reviewed/deployed. The current production frontend remains the prior release. Shipping the frontend alone does not close that legacy route.
7. Device storage remains device-local; clearing browser storage removes local imports/annotations unless exported. No cloud cross-device sync was added, consistent with the existing authentication/storage model.
8. Existing EPUB limitations (encrypted/image-only/fixed-layout publications) remain; parser/DRM support was not replaced.

## 14. Deployment readiness

**Development implementation complete; ready for staging review, not approved for production deployment.** Automated checks and read-only live source probes are recorded separately from outstanding browser/device QA. Current production/hosting audience and data remain untouched.

The existing host is Sites, not an identified Vercel project in this checkout. Do not migrate hosts or publish to a guessed project. If a separate canonical React/Vite/Vercel checkout exists, this branch is not a migration of that separate repository.

## 15. Deployment, backup and rollback

Full instructions: [deployment and rollback](advanced-reader-deployment.md).

Baseline tag: `backup/pre-advanced-reader-2026-11-04`. Separate security compatibility commit: `1715b3f3d1b498e13312936d860a7a286dd690d4`. Feature/UI changes are a later commit so they can be reverted without restoring raw source signing.

Source backup/bundle and final source archive are prepared in `/workspace/artifacts/`. Neither publication nor a production migration is part of this task. Do not deploy a rollback that restores the pre-hardening raw-source gateway.
