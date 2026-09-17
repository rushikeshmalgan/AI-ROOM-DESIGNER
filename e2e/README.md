# E2E tests

`npm run test:e2e` — Playwright, chromium + a mobile viewport, against a real
`next dev` server started by `playwright.config.js`.

## Why there's a module-swap instead of real services

The app's core flows (upload → generate → refine) all go through Clerk auth,
Cloudinary, Replicate, and Postgres/Redis. None of those have test credentials
available, and hitting the real services from CI would be slow, flaky, cost
real money per run, and risk leaking test data into production accounts —
none of which is what "catch frontend regressions" needs.

Instead, `next.config.mjs` aliases a handful of modules to in-memory/no-op
test doubles (`test/mocks/*.js`), but **only** when `PLAYWRIGHT_TEST_MODE=1` —
`playwright.config.js`'s `webServer.env` is the only place that ever sets it.
It is never set by `next build`/`next start`, so this has zero effect on a
real deployment; the swap is a webpack `resolve.alias` branch gated on an
exact string match, not a runtime toggle reachable from a request.

Swapped:
- `@clerk/nextjs` / `@clerk/nextjs/server` → a fixed test user, no real Clerk
- `@/config/db` (+ `drizzle-orm`'s `eq`/`desc`) → an in-memory store, not Postgres
- `@/config/replicateConfig`, `@/config/ideogramConfig` → fake image URLs, no real Replicate calls
- `@/config/cloudinaryConfig` → a fake upload response, no real Cloudinary calls
- `@/lib/credits` → always-succeeding credit/rate-limit checks, no real Redis

Not swapped, and not exercised by this suite: `app/api/webhooks/clerk` (needs
real svix signature verification — out of scope for "keep it small").

## What's covered

- `landing.spec.js` — the one public-page smoke test that needs none of the above.
- `create-design.spec.js` — create-new page loads, upload interaction, form
  state (room type + style selection), generation request, and the result
  landing back on the dashboard.
- `refinement.spec.js` — refinement request and version-chain rendering
  (seeds a design via a direct API call rather than repeating the upload UI).

## What this suite is not

Not a substitute for `docs/manual-qa-checklist.md`. It proves the frontend
wiring holds together against fake data — it says nothing about whether a
real Replicate call actually produces a good-looking room, whether real
Cloudinary uploads behave the same way, or whether real Clerk sessions work
end to end. Run the manual checklist against a real deployment before calling
anything beta-ready.

## State between tests

`test/mocks/db.js` is one in-memory store for the whole `next dev` process
the suite boots — `playwright.config.js` runs tests serially (`workers: 1`,
`fullyParallel: false`) specifically so specs can't race each other over it.
Each spec uses a distinct room/style combination so assertions don't collide
with data left behind by earlier specs in the same run.
