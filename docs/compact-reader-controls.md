# Compact controls, global theme and word-tracked speech

This follow-up updates the existing development branch. No production deployment, database migration, publication change or new dependency is included.

## Appearance

The long vertical appearance form is now split into **Text**, **Layout** and **Theme** tabs. Sliders use a two-column layout; less-used controls sit in disclosure sections. The main controls remain reachable without scrolling through every Reader option.

Holding a slider temporarily hides the sheet and reader controls, leaving only that slider over the full page. Styles preview immediately. The range stays in its original DOM position so native touch dragging retains its target and coordinates. On pointer release or keyboard release, the value is committed and the sheet returns immediately in the same event handler, without a timer or waiting for pagination. Measured pagination preserves the original text anchor in the background. A subsequent native change event does not repeat the reflow. Cancelling restores the stored value; an older reflow cannot close a newer drag.

Switching Text/Layout/Theme keeps the same bottom sheet, header, tab buttons and panel container mounted. Book tabs and global-theme preset changes also update their existing sheet instead of restarting its entrance animation.

## Comfortable defaults

- Lora, 19px, weight 400.
- Justified text, line height 1.6, paragraph gap 6px.
- No extra letter spacing; first-line paragraph indent 1.5em. True paragraph starts are indented; continued paragraphs on a later page stay flush. The existing More text options slider adjusts or disables indentation. A one-time preference update enables it for the former zero default, preserves custom widths, and retains subsequent choices.
- Side margin 24px, vertical margin 22px, maximum column width 720px.
- Subtle fade page transition; reduced-motion support retained.

The **Comfort defaults** action reapplies this profile. One-time migration updates former automatic defaults while retaining different custom typography values. Original paragraph separator text remains in the DOM for exact source offsets, but separator spans are visually hidden so they do not add accidental blank line boxes.

## One global theme

Library, Settings, dialogs and Reader now use the same `themeMode` and palette: Light, Dark, System, Sepia, Paper, Green or Custom. The old Reader-specific palette is migrated to the global setting and its deprecated preference follows the app. There is no separate “App” versus “Reading theme” choice.

Custom colors keep a contrast preview and require at least 4.5:1 contrast before applying. Body colors, glass surfaces, reader paper/ink and browser theme color update together. Accent color remains a separate global preference.

## App-owned popups

All app select controls and color editors now use application dialogs with keyboard navigation, focus restoration, background inertness and localized labels. The hidden native controls remain the existing value/change-event interface. No native select or color picker is opened. Browser/OS permission dialogs and the system file chooser remain platform-owned.

## Read aloud

Play closes the speech panel and returns to the full reading page. The current word is painted using the CSS Highlight API where available, with a geometry fallback; no browser Selection is created and text metrics are unchanged. Highlighting follows source offsets through page changes and scrolling.

A voice starts with one actual word from the story. If it emits real word boundaries, playback continues in fluent sentence chunks. If it does not, playback uses individual word utterances and highlights on their real speech-start event. This avoids presenting a timer estimate as exact word tracking. Such voices can have audible pauses between words; available local voices are preferred and the voice help explains the behavior. No extra silent probe, external TTS service or manuscript upload is introduced.

Pause/resume, speed changes, stop, per-book saved position and next-published-episode navigation are retained. Native audio/boundary delivery still depends on the browser/OS voice.

## Verification

- **53 automated tests passed**, zero failures.
- Build, strict helper/Edge typecheck, frontend syntax/publication boundary and runtime-module graph checks passed.
- npm audit: zero reported vulnerabilities.
- New tests cover app-owned select/color dialogs, comfortable/global preference migration, live slider preview/commit/cancel, immediate release during unresolved pagination, stable sheet/tab identity, rapid consecutive drags, real word-start fallback, fluent boundary voices, word painting and page turns.
- Regression tests retain source-character preservation, app-language isolation, gestures, copy protection, annotations and source authorization.

These tests use jsdom and injected speech drivers. Physical device/audio and browser visual QA are left to the user as requested; no hardware audio or screenshot PASS is claimed. Original compact-control evidence is in `docs/generated/compact-reader-validation.txt`; the latest release/tab regression output is in `docs/generated/sheet-interaction-validation.txt`.

Paragraph-indentation follow-up: the full 53-test suite, build, typecheck and check passed again. New-device defaults, upgrade from the former zero default, preserved custom indentation/disabled choices and continued-paragraph classification are covered by existing regression tests. Exact output: `docs/generated/paragraph-indent-validation.txt`.
