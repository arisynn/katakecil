# KataKecil V4.2.2 — Smooth Prefetch Reader

This is a **frontend-only patch** on top of V4.2.1. No SQL migration, Supabase Edge Function deployment, or new secrets. **Do not run Stage 2 until browser regressions and security tests are complete.**

## What changed

- Once a 1,800-character segment is displayed, the reader quietly requests the next segment (and the previous segment when applicable).
- Requests in progress are deduplicated. Swiping into a ready segment uses memory without another API call or network loading overlay.
- The temporary cache is RAM-only and bounded to 3 short segments. Manuscript text is not stored in localStorage or IndexedDB. Progress and bookmark behavior remains unchanged.
- If prefetch is still incomplete (rapid swiping, offline/slow mobile data) the reader can still display a brief loading notice. An absolutely wait-free experience cannot be guaranteed on networks.

## Limitation still to improve

Each segment is independently paginated, so a sentence can still appear to stop at the end of a segment. It continues on the first page of the next one, normally already prefetched. A future release can improve sentence-aware segmentation / seamless stitching, which will require more careful bookmark and pagination migration. No chapter contents have been modified here.

## Install on Termux

1. Back up the current Git working tree or check `git status` first.
2. Extract patch into repository root, preserving paths.
3. Test: `node --experimental-strip-types scripts/test-v422-prefetch.mjs`
4. Commit and push the four modified/added files; preview on Vercel and test repeated swipes and backwards navigation in Chrome Android.

## Regression checks

- Reader unchanged except prefetch and bounded RAM cache.
- No changes to `qr_episodes`, release dates, RLS, or Supabase Edge Function.
- No direct browser access to `content_md` added.
