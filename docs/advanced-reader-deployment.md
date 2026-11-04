# KataKecil — Deployment and rollback

This is a local development delivery. No production deployment or database migration was executed.

## Source references

- Development branch: `feat/advanced-reader`.
- Original baseline/tag: `3be496d11d19168980ea1e61de47776b6cad71f8`, `backup/pre-advanced-reader-2026-11-04`.
- Separate compatibility-security commit: `1715b3f3d1b498e13312936d860a7a286dd690d4`.
- Static output: `dist/`. Existing `.openai/hosting.json` project identity is retained.
- Feature commit: the subsequent Reader commit on the development branch; obtain its exact ID with `git log --oneline -2 feat/advanced-reader`.

The separate security commit permits a UI rollback while keeping the legacy gateway routed through published authorization. The old original tag is an archival/source reference, not an approved deployment target.

## Staging before any production approval

1. Restore/install from the lockfile with `npm ci`; run `npm test`, `npm run typecheck`, `npm run check`, `npm run build`.
2. Export existing local notes through Settings/Advanced before testing source migration. Capture device preferences/progress if manual rollback is needed. Do not export or commit source manuscripts.
3. Use the existing hosting target/project identity. A Vercel project was not found in this checkout; do not infer one or migrate hosting.
4. In an authorized staging environment, deploy the prepared `lumina-library` compatibility patch with the same public function access as before. It now needs only server-provided `SUPABASE_URL`, not a service key. Do not alter `katakecil-reader`, `katakecil-publisher`, RLS, schedules or book records.
5. Verify the compatibility catalog contains only allowlisted nonempty published books, unknown/internal raw IDs fail, no URL points to `/storage/`, and EPUB links carry the current revision to `katakecil-reader`. Verify 404/409/429/503 and publication withdrawal against staging fixtures, never by editing production book data.
6. Publish the staged static `dist/` using the supported Sites workflow. Check fresh-device and upgraded-device sessions. Confirm old source caches are removed after a successful catalog load and imports/UUID/annotations are retained.
7. Run the manual browser checklist in `advanced-reader-test-results.md`, including screenshots, real Android/iOS selection behavior, landscape, fullscreen, wake permissions and actual speech audio/boundaries.
8. Review the complete diff and test evidence. Production publishing and server changes require the user's explicit approval. There is no database migration to run.

Production rollout, if later approved: harden the legacy gateway first, verify its published-only responses, then deploy the reviewed frontend. Keep its private Storage bucket, existing public collection identity and current hosting audience unchanged. Do not ship only the frontend and assume the old signing route is closed.

No publish, Supabase deploy, DDL or content-write command is automatically run by the package scripts.

## Rollback

Preserve the hardened gateway on every rollback. Never restore the raw-source signing implementation from the original baseline.

For source review/testing of the prior UI with the compatibility hardening retained:

```sh
git switch -c rollback/advanced-reader 1715b3f3d1b498e13312936d860a7a286dd690d4
npm ci
npm test
npm run check
```

That commit retains the prior static UI and the hardened compatibility function. Its source tests are validated separately and recorded in the QA report. It loses the new Reader features and stronger client-side cache/anchor behavior. Stage and re-test it before any operational rollback. Existing clients may have old device caches; the new frontend's purge only applies after a successful upgraded catalog load. Reverting UI source does not revoke files that a browser already possessed.

After a verified secure production version exists, prefer redeploying that exact approved static version through Sites while retaining the hardened server function. There is no cloud database migration to reverse. Keep annotation/progress exports until migration has been verified; do not delete device data as a rollback shortcut.

A Git bundle in `/workspace/artifacts/` preserves source history/tags for recovery. Restore into a new directory with `git clone <bundle-path> <new-directory>`, inspect branch/tag references, then apply the appropriate approved commit. Do not copy temporary live EPUB snapshots into source, backups or deployment output.
