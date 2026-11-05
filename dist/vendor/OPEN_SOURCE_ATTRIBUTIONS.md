# KataKecil — Open-source attributions

Updated 4 November 2026. Packages are pinned in `package-lock.json`. Reader UI, publication adapters and domain integration are KataKecil code; no application UI from the research candidates was copied. Runtime libraries are bundled locally into `dist/advanced-reader.js`; no CDN is needed for these libraries.

## Direct runtime packages actually integrated

| Package | Version | Repository | License | Reused module/API |
| --- | --- | --- | --- | --- |
| dom-anchor-text-quote | 4.0.2 | https://github.com/tilgovi/dom-anchor-text-quote | MIT | `fromTextPosition`, `toTextPosition`: quote, prefix/suffix and offset-hint matching. Called from `src/reader/anchors.ts` with a textContent adapter; native browser Selection is never created. |
| easy-speech | 2.4.0 | https://github.com/jankapunkt/easy-speech | MIT | Voice initialization/discovery and cross-browser `speak` (including actual `start` / `boundary` events), `pause`, `resume`, `cancel`. Used through `ReadAloud` in `src/reader/speech.ts`. KataKecil adds its existing episode/page anchors, bounded utterance queue, pause recovery and DOM geometry painting. |

Full notices: [Text Quote Anchor](./licenses/dom-anchor-text-quote.txt), [EasySpeech](./licenses/easy-speech.txt). Original copyright and permission notices are retained. Bundling changes the packaging, not the upstream source implementations.

## Runtime transitive dependencies included in the bundle

| Package | Version | Repository | License | Notice |
| --- | --- | --- | --- | --- |
| dom-anchor-text-position | 4.0.0 | https://github.com/tilgovi/dom-anchor-text-position | MIT | [License](./licenses/dom-anchor-text-position.txt) |
| dom-seek | 4.0.3 | https://github.com/tilgovi/dom-seek | MIT | [License](./licenses/dom-seek.txt) |
| dom-node-iterator | 3.5.3 | https://github.com/tilgovi/dom-node-iterator | MIT | [License](./licenses/dom-node-iterator.txt) |
| ancestors | 0.0.3 | https://github.com/chrisdickinson/ancestors | MIT | [Notice](./licenses/ancestors-NOTICE.txt). Upstream specifies MIT in README/package metadata and supplies no separate license/copyright file. Its README, author attribution and MIT permission text are retained transparently. |
| index-of | 0.2.0 | https://github.com/jonschlinkert/index-of | MIT | [License](./licenses/index-of.txt) |
| diff-match-patch | 1.0.5 | https://github.com/JackuB/diff-match-patch | Apache-2.0 | [License](./licenses/diff-match-patch.txt), including upstream copyright notices. |

The DOM range conversion dependencies are retained by the CommonJS package bundle. KataKecil calls only the text-position quote APIs. The integration verifies exact text before accepting a match; fuzzy suggestions never silently move an annotation to different prose.

## Existing assets retained

- **JSZip 3.10.1**, https://github.com/Stuk/jszip — used under the MIT option of its MIT/GPLv3 dual license. EPUB decompression remains unchanged. [License](./JSZip-LICENSE.txt).
- Self-hosted fonts from https://github.com/google/fonts — SIL Open Font License 1.1. Existing font files and notices are retained: [DM Sans](../fonts/DM-Sans-OFL.txt), [Fraunces](../fonts/Fraunces-OFL.txt), [JetBrains Mono](../fonts/JetBrains-Mono-OFL.txt), [Lora](../fonts/Lora-OFL.txt), [Merriweather](../fonts/Merriweather-OFL.txt), [Plus Jakarta Sans](../fonts/Plus-Jakarta-Sans-OFL.txt).
- The existing KataKecil logo is an image-generation output from earlier work, not an asset copied from these repositories.
- EPUB test fixtures are the existing public-domain Project Gutenberg editions. The owner's manuscript EPUBs are not committed or included in the static distribution.

## Android application and shared device adapter

- **Capacitor core 8.6.0**, **Capacitor Android 8.6.0**, **Capacitor App 8.1.2** — MIT, Drifty Co., https://github.com/ionic-team/capacitor and https://github.com/ionic-team/capacitor-plugins. Used for the local WebView shell, native bridge, system bars, lifecycle and Back. Notices: [core](./licenses/capacitor-core.txt), [Android](./licenses/capacitor-android.txt), [App](./licenses/capacitor-app.txt).
- **tslib**, pinned transitively in the lockfile — Microsoft, 0BSD. [Notice and license](./licenses/tslib.txt).
- Capacitor's native dependencies include **AndroidX** (The Android Open Source Project, Apache-2.0, https://android.googlesource.com/platform/frameworks/support/) and **Apache Cordova Android** (The Apache Software Foundation, Apache-2.0, https://github.com/apache/cordova-android). The existing bundled [Apache-2.0 text](./licenses/diff-match-patch.txt) is retained; upstream notices remain in the dependency distributions.
- `KataKecilDevicePlugin.java` is app-specific integration using Android TextToSpeech, the Storage Access Framework document picker, orientation and screen flags. Android TTS engines/voices are device components and are not bundled. Network voices can send requested speech to their provider; offline voices are labeled separately.

Capacitor CLI 8.6.0 is development tooling and is not shipped inside the APK or web bundle. The original logo is reused unchanged for the launcher and splash screen.

## Development dependencies

New tooling: **esbuild 0.28.2** (MIT, https://github.com/evanw/esbuild), **TypeScript 7.0.2** (Apache-2.0, https://github.com/microsoft/TypeScript), **@types/node 26.6.6** (MIT, https://github.com/DefinitelyTyped/DefinitelyTyped). Existing **jsdom 26.1.0** (MIT) and **fake-indexeddb 6.2.4** (Apache-2.0) remain test-only. Exact transitive versions/integrity are in the lockfile. Build/test tooling is not shipped as browser code.

## External dictionary/translation content

These services are not source-code dependencies. A request is made only after the reader explicitly presses a lookup/translation button. Only the selected word/passage is submitted; the full episode is never submitted to these services.

- **Free Dictionary API**, https://dictionaryapi.dev/ and https://github.com/meetDeveloper/freeDictionaryAPI. Definitions are cited to their Wiktionary entry and the license returned by the API. Content licenses can differ from the API's code license.
- **Wikikamus/Wiktionary**, https://id.wiktionary.org/. Definition excerpts cite the original word page and **CC BY-SA 4.0**. Article history provides contributor attribution. Resource-bearing HTML is stripped; excerpts are rendered as text.
- **MyMemory / Translated**, https://mymemory.translated.net/doc/spec.php. Translation results are credited in the panel. Service terms, logging and free quotas apply. No dictionary/translation results are bundled or stored in localStorage.

Browser Web Speech, Intl.Segmenter, CSS Custom Highlight, Fullscreen, Screen Orientation and Wake Lock are platform APIs. The app queues paragraphs without a word-by-word fallback and highlights the complete current paragraph. Native word events, when available, update resume positions and page navigation only. Paragraphs longer than the Android 4,000-character limit are split into bounded passages while retaining one paragraph highlight. Online speech voices may use the browser/OS provider's service; the voice picker identifies local versus online voices.

## Evaluated, not integrated

| Candidate | License | Decision |
| --- | --- | --- |
| https://github.com/recogito/text-annotator-js | BSD-3-Clause | README, package API/dependencies, quote-context code and `packages/text-annotator/src/selection-handler.ts` inspected. Its handler uses `document.getSelection()` / selectionchange. Integrating its selection manager would replace the app-owned selection that prevents Android contextual search. Selected a smaller quote anchor package and retained KataKecil's selection UI. No source copied. |
| https://github.com/readium/speech | BSD-3-Clause | Version 0.18.0 README, exported types, WebSpeech engine API and dependencies inspected. It is an active, broader toolkit with Readium utterance/voice/provider/navigation models. EasySpeech's smaller API fits the current page/episode model without adopting another navigator. No source copied. |
| https://github.com/readium/web | BSD-3-Clause | Documentation hub for Readium TS/Go toolkits and Web Publication Manifests. Adopting a second publication/navigator architecture would replace working EPUB parsing/pagination. No source copied. |
| https://github.com/readest/readest | AGPL-3.0 | README/license/activity reviewed only. Incorporation would require a deliberate AGPL compliance decision, including applicable source-disclosure obligations for a combined/networked work. No code, UI, assets or dependencies incorporated; KataKecil's license is not changed. |

Research details and activity snapshots: `docs/advanced-reader-report.md` and `docs/generated/open-source-research.json`.


## Published EPUB service

The existing `katakecil-reader` service source is now tracked in this repository. It retains its pinned packages: [supabase-js 2.117.3](https://github.com/supabase/supabase-js) (MIT, server-only Storage/RLS clients; [license](./licenses/supabase-js.txt)), [fflate 0.8.3](https://github.com/101arrowz/fflate) (MIT, EPUB ZIP assembly; [license](./licenses/fflate.txt)), [sanitize-html 2.18.1](https://github.com/apostrophecms/sanitize-html) (MIT, published HTML sanitization; [license](./licenses/sanitize-html.txt)), and [@xmldom/xmldom 0.9.12](https://github.com/xmldom/xmldom) (MIT, EPUB XML serialization; [license](./licenses/xmldom.txt)). No additional frontend dependency is introduced. Book text and the replacement cover are owner-supplied content, not third-party open-source code.

## Color wheel

- [Reinvented Color Wheel](https://github.com/luncheon/reinvented-color-wheel), npm `reinvented-color-wheel@0.4.0`, WTFPL v2. Standalone hue ring, saturation/value canvas, pointer handling and color conversion integration; no framework UI imported and upstream source unchanged. [License](./licenses/reinvented-color-wheel.txt).
- [pure-color](https://github.com/WickyNilliams/pure-color), npm `pure-color@1.3.0`, MIT. Upstream wheel dependency for hex/RGB/HSL conversion. [License](./licenses/pure-color.txt).

MIT `@radial-color-picker/color-wheel` was evaluated but only draws hue and does not supply a full picker. `@jaames/iro` (MPL-2.0) was evaluated but not integrated. The selected small vanilla picker provides both hue and saturation/value controls without RGB sliders. Its permissive WTFPL license and the dependency's MIT notice are shipped with the app.


## Publisher

- [Marked](https://github.com/markedjs/marked), npm `marked@18.1.3`, MIT. Markdown parsing for owner-selected chapter updates; imported markup is reviewed as text and sanitized by the existing server EPUB module before publication. [License](./licenses/marked.txt).
- [Supabase JS](https://github.com/supabase/supabase-js), npm `@supabase/supabase-js@2.117.3`, MIT. Official email/password signup, login, recovery and in-memory session handling, lazy-loaded only in Publisher. [License](./licenses/supabase-js.txt). Its pinned MIT subpackages auth-js, functions-js, postgrest-js, realtime-js and storage-js are version2.117.3; phoenix0.4.5 and iceberg-js0.8.1 are MIT. Their notices are shipped in `dist/vendor/licenses/supabase-*.txt` and `iceberg-js.txt`; the nested tslib2.8.1 0BSD notice is in `tslib-2.8.1.txt`.
- Existing JSZip and KataKecil EPUB parser are reused for EPUB structure/markup/cover extraction. The server publisher shares the existing reader EPUB/sanitizer code through source links, rather than implementing a second EPUB generator. No third-party application UI is imported.

## Episode delivery and security verification

- [LinkeDOM](https://github.com/WebReflection/linkedom), npm `linkedom@0.18.12`, **ISC**. Server-only DOM adapter for the exact existing KataKecil EPUB parser. No UI imported. Its ISC/MIT/BSD dependencies and copyright notices are included in [the server parser notices](./licenses/linkedom-server.txt); exact resolutions are pinned in the reader's `deno.lock`. The existing fflate ZIP decoder supplies a small JSZip-compatible adapter for server-generated EPUB bytes; no additional ZIP parser is shipped to the browser.
- [PGlite](https://github.com/electric-sql/pglite), npm `@electric-sql/pglite@0.3.14`, **Apache-2.0**, with PostgreSQL notices in [the supplied license](docs/licenses/pglite.txt). Development-only PostgreSQL engine used to execute the staged migration and test role privileges, shared quotas, session scoping and concurrency admission. No database engine is included in the web reader or APK.
