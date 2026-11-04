# KataKecil — Reader test evidence

Date: 4 November 2026. This report distinguishes executed checks from outstanding browser/device QA.

## Executed baseline

At `3be496d11d19168980ea1e61de47776b6cad71f8`, before implementation:

- `npm test`: **21 passed, 0 failed**.
- `npm run check`: **passed**.
- No original build/typecheck scripts existed; no invented baseline result is reported.

## Final development verification

A clean `npm ci` completed successfully from the lockfile. It retains the existing jsdom transitive whatwg-encoding deprecation notice; npm security audit reports no advisories.

- `npm test`: **42 passed, 0 failed**.
- `npm run build`: **PASS**.
- `npm run typecheck`: **PASS**. Strict TypeScript on `src/reader/` and the compatibility Edge Function/runtime surface; existing JavaScript UI is covered by syntax and integration tests, not a claimed full JS typecheck.
- `npm run check`: **PASS**. All top-level frontend JavaScript, Edge syntax, entry assets and publication-boundary checks.
- `npm audit --json`: **0 vulnerabilities (info/low/moderate/high/critical: 0)**. Includes development dependencies; excludes vendored JSZip/fonts from advisory coverage.
- Rollback source at `1715b3f3d1b498e13312936d860a7a286dd690d4`: **21 tests passed, 0 failed; syntax check passed**.
- Supabase security advisor (read-only): **0 lints**. RLS/publication policy metadata reviewed, no policy edited.

Exact final command output is preserved in `docs/generated/advanced-reader-validation.txt`. Public service probes and published snapshot counts are JSON evidence in `docs/generated/`.

## Automated coverage

| Group | Executed coverage |
| --- | --- |
| Reader regression | Six real public-domain EPUBs; inert malformed/encrypted rejection; every character preserved; measured-fit callback cancellation/impossible layouts; paragraph fill; exact source offsets including repeated text; library carousel; controls versus native fullscreen; copy blocking; custom drag/long press; simulated pinch/swipe arbitration; parser chapter markers/front matter; English/Indonesian app language without source mutation. |
| Display | Real preference values/CSS properties; nonzero anchor reflow; spacing, weight, margins, width, alignment; theme preview versus apply; contrast rejection; mode switching; two-leaf render and second-leaf selection; direct page jump. |
| Annotations/data | Quote/context anchoring; same-episode restriction; ambiguous/fuzzy rejection; stable repeated quotes with episode hash; one-time raw-source migration; separate panels and filters; bookmark label; note CRUD/independent note removal; reopen persistence; other-book position isolation; LocalStorage quota recovery from IDB; tombstone deletion; both-storage failure warning. |
| Search/tools | Literal word/phrase/Unicode/regex-character searches; counts and bounded results; highlight and next/previous UI; no lookup request before button; only selected text in request; dictionary result markup rendered safely; Indonesian resource-bearing markup removed; translation byte limit and service errors; cited results. |
| Speech | Injected speech driver verifies play/pause/resume/stop, boundary position, stale callback cancellation, next available episode, completion, missing-language voice error and concurrent initialization deduplication. These tests do not produce real device audio. |
| Device APIs | Injected Wake Lock verifies acquire/release, visibility handling, unsupported state and asynchronous exit race. Fullscreen integration uses a mocked browser API. Actual permission/hardware behavior is unverified. |
| Publication | Published catalog validation/empty-book exclusion; canonical IDs/revisions; ignored arbitrary source URL; required revision header/MIME; stale/unavailable/oversized response rejection; legacy proxy denies unknown IDs and raw signatures; publication error statuses. |

Simulated viewport matrix: **320x900, 375x900, 390x900, 430x900, 768x900, 1440x900, 730x360**. The integration harness changes width/height and dispatches resize; it verifies nonempty text, retained anchors and the spread threshold. **jsdom does not perform layout or CSS media-query rendering. These are not visual responsive PASS results.**

## Read-only live probes

The existing published endpoint returned three EPUBs with matching `X-KataKecil-Revision`. Every parsed chapter file matched an ID in that book's published section list. Fixed-capacity pagination retained every parsed character. Front-matter filtering is the existing parser behavior.

See `generated/published-snapshot-verification.json`; temporary manuscript snapshots remain outside source in `/tmp/katakecil-live-published` and are excluded from final artifacts.

English dictionary (`rain`), Indonesian Wiktionary (`hujan`) and MyMemory (`Halo`, id→en) returned HTTP 200 with permissive CORS in server-side probes. No book passage was used for these probes. Actual browser transport still needs staging confirmation.

## Browser/device checks NOT run

The [Sites skill](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) explicitly instructs: “If `cua_repl.js` is unavailable, skip browser QA: do not start a preview server, install a browser, or improvise another browser-control path.” That tool is unavailable in this managed environment. No substitute browser was installed and no screenshot was fabricated.

Required staging/device checklist:

- Capture reader/library/settings/panels at all required widths, tablet and desktop; confirm whole covers, no Library vertical scroll, glass, focus, no tab-strip artifact and no heading/body clipping.
- Test portrait→landscape and back, 32px text, large spacing/margins, two-page boundaries, final/short chapters and actual font loading; check every page for overflow/large unintended blanks.
- On Android Chrome, long-press and adjust custom selection, including second-page highlights; confirm no native Google contextual-search panel. Test tap/swipe/pinch together and selections while scrolled.
- Test true fullscreen and return, orientation lock support/rejection, Wake Lock on/off/hidden/return and actual screen behavior.
- Hear local/online voices, pause/resume mid-utterance, stop/restart, reload resume, word boundary availability and automatic next episode; verify visible range painting during scrolling and resize.
- Confirm dictionary/translation CORS, cited output, unavailable/timeout/quota states and no external request before explicit action.
- Test staging release, draft, future schedule, withdrawal and revision race without editing production data; confirm no legacy raw-source URL remains available after hardening.

## Deployment status

Automated development checks are reported above; manual browser/device and staging rollout gates remain open. No production deploy or migration was performed. The old live raw-source gateway remains a deployment-blocking finding until the separate hardening patch is approved and deployed.
