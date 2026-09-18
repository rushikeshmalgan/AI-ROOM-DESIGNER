# Product Readiness Report

No fabricated evidence — a row is only PASS if it was actually run and
observed in this session (Vitest, Playwright E2E, or a clean production
build). Anything that requires real external credentials is NOT TESTED,
regardless of how confident the code review is, per this project's own
rule: don't claim something works until it's verified.

| Area | Status | Evidence |
|---|---|---|
| Authentication (logic) | PASS | Vitest: every route 401s on `currentUser() === null`; webhook svix signature verified/rejected correctly |
| Authentication (real Clerk) | PASS | Real sign-in observed in production logs against a real Clerk user (`user_3JSvpv8WFDa3RRcSOBInuF9gQSV`); `/api/verify-user` succeeded and provisioned a real `users` row |
| Authorization / ownership | PASS | Vitest + E2E: cross-user 404 (not 403) on refine and share, both directions tested |
| Database schema | PASS (structurally) | 27 schema tests pass; `drizzle-kit generate` reports zero pending diff against current schema.ts; all 9 migrations are additive-only |
| Database (real Neon) | PASS | All 9 migrations applied to the real production Neon branch; tables verified directly via `neon psql`; real reads/writes observed in production logs after the initial "relation does not exist" bug was found and fixed |
| Redis credit system (logic) | PASS | Vitest: atomic decrement/refund/rate-limit logic against a fake in-memory Redis, including the `credit_transactions` audit-log recording |
| Redis (real Upstash) | PASS (basic usage) / NOT TESTED (concurrency) | A real bug was found and fixed against real Upstash Redis this session (a new user's key was never seeded, causing every first-time request to be rejected as "insufficient credits"); no deliberate concurrent-request race test has been run |
| Image upload | PASS | MIME/size validation unit-tested; E2E covers the full upload→preview→submit UI flow against a mocked Cloudinary; a real wrong-cloud-name bug was found and fixed against the real Cloudinary account, and real uploads succeeded afterward per production logs |
| AI generation (logic) | PASS | Vitest + E2E cover the full request lifecycle (validate→credit→generate→persist→respond) against a mocked provider |
| AI generation (real Replicate) | NOT TESTED | The Replicate token was invalid (401) for most of this session; it was replaced with a working token (verified 200 against Replicate's `/account` endpoint) and deployed, but as of this report zero generation attempts have been made against it — this is the single most important thing to verify next |
| Generation provider abstraction | PASS | `ImageGenerationProvider` interface exists; `ReplicateSdxlProvider` is the only implementation; route handlers depend on the interface, verified by the fact their tests mock the provider, not Replicate's SDK |
| Refinement | PASS (logic) / NOT TESTED (real provider) | Same split as generation — chain/parentDesignId logic fully tested, real image quality never observed |
| Generations audit table | PASS | pending→processing→completed/failed lifecycle unit-tested in isolation (`generationService.test.ts`), including the "provider resolved but returned zero images = failed" case |
| Credit transactions ledger | PASS | insert-on-generation/insert-on-refund unit-tested; schema FK to `generations` verified |
| Sharing | PASS | E2E proves the actual flow: private by default → 404 → explicit share → publicly visible, no auth required on the public page |
| Analytics | PASS | Event tracking unit-tested; real `landing_view`/`dashboard_view` rows observed being written in production logs after the schema-migration fix |
| Security (ownership bypass) | PASS | Explicitly tested: a second user attempting to refine/share the first user's design gets 404, verified in both Vitest and E2E |
| Security (secret handling) | PASS | `.gitignore` covers all `.env*`; full git history checked — no secret has ever been committed; no API key/token is ever passed to `lib/observability.ts` or `lib/analytics.ts` |
| Security (dependency advisories) | KNOWN GAP | `@clerk/nextjs` has an unpatched critical "authorization bypass" advisory; the fix requires a major-version bump that conflicts with the pinned React version — deliberately deferred rather than rushed, tracked here instead of silently ignored |
| Testing | PASS | 116 Vitest tests + 6 Playwright E2E tests, both suites passing on a clean build as of this report |
| Deployment | PASS | Live in production on Vercel; a missing DB migration, a wrong Cloudinary cloud name, an unseeded Redis key, and two Next.js CVEs were all found and fixed against the real deployment, not just in code review |
| CI | PASS | GitHub Actions runs the full Vitest + Playwright suite and a production build on every push/PR |

## What "PASS" means here, precisely

PASS means: the logic was exercised by an automated test or a real clean
build, and it produced the expected result. It does **not** mean the
feature has been used by a real person with real data, and it does not
mean it will behave identically against real external services — those
are exactly the NOT TESTED rows, and the honest gap this report exists to
name.
