# Deployment

This describes the recommended deployment architecture and the exact steps to
follow. For the pre-flight checklist to run through before actually deploying,
see `docs/deployment-checklist.md` — that file is the "did you actually
verify X" list; this one is the "how" reference.

**Status: not deployed.** Nothing in this document has been executed yet —
it documents what deploying *would* look like, prepared ahead of time so the
first real deployment isn't improvised.

## Recommended architecture

| Layer | Service | Why |
|---|---|---|
| App/frontend | Vercel | Built for Next.js App Router specifically; zero-config for this stack |
| Database | Neon Postgres | Already in use; serverless, branches well for a staging/prod split |
| Redis | Upstash | Already in use; REST-based, works natively in Vercel's serverless functions (no persistent TCP connection needed) |
| Image storage | Cloudinary | Already in use |
| AI inference | Current provider abstraction (`lib/generation/providers.ts`) → Replicate | No change needed to deploy; the abstraction exists so a future provider swap doesn't require touching route handlers |

Nothing here is a new choice — this is the stack the app already runs on
locally, deployed rather than re-architected.

## Build & start commands

```
Build:  npm run build
Start:  npm run start
```

Vercel infers both automatically for a standard Next.js project — no custom
`vercel.json` build configuration is needed. `next.config.mjs`'s test-mode
webpack swap (see `e2e/README.md`) is inert unless `PLAYWRIGHT_TEST_MODE=1`
is set, which must never be set in the Vercel project's environment
variables.

## Environment variables

Every variable in `.env.example` (`DATABASE_URL`; Clerk's publishable/secret/webhook
keys; Cloudinary's cloud name/API key/API secret; `REPLICATE_API_TOKEN`;
Upstash's REST URL/token), set to real production values in the deploy
target's environment variable settings — never committed, never pasted
into a chat session. Clerk, in particular, has separate Development and
Production instances with different key pairs; make sure the production
values come from the Production instance, not copied from local `.env.local`.

## Database migrations

Run migrations against the production database **before** the new code that
depends on them goes live, not after:

```
npx drizzle-kit migrate
```

Migrations `0000` through `0002`, `0004`-`0007` are safe to run
unconditionally (additive only). Migration `0003` is **not** safe to run
without first completing its own checklist — see `docs/db-migration-checklist.md`.
As of this document, migrations through `0007_add_generations_and_credit_transactions.sql`
exist; check `drizzle/` for anything added after this was written.

## Clerk configuration for production

- Clerk gives you a separate Production instance automatically — use its
  keys, not the Development instance's.
- Register a webhook endpoint pointing at `https://<your-domain>/api/webhooks/clerk`
  for the `user.created` event, and use *that* endpoint's signing secret
  for `CLERK_WEBHOOK_SECRET` in production (it's different from the
  development webhook's secret if you registered a separate dev endpoint).
- Set the production domain in Clerk's dashboard under allowed origins /
  redirect URLs so sign-in/sign-up redirects resolve correctly.

## CORS / origin considerations

All API routes in this app are same-origin (called from the same Next.js
app that serves them) — there is no separate frontend origin calling these
APIs cross-origin, so no CORS configuration is needed for normal operation.
The one exception to think about: `/share/:id` is a public page meant to be
opened from arbitrary external referrers (social platforms, messaging
apps) — that's normal navigation, not a CORS concern, since it's a page
load, not a cross-origin fetch.

## Health check

There is no dedicated `/api/health` endpoint currently. For a Vercel
deployment this is usually unnecessary (Vercel's own deployment status
covers "did the build/deploy succeed"), but if a future host requires an
explicit health check, the honest one to add would verify: the app boots,
`DATABASE_URL` resolves (a trivial `SELECT 1`), and Redis responds — not a
generation call, which costs real money per check.

## Rollback considerations

- **Code**: Vercel keeps previous deployments and supports instant rollback
  to any prior deployment via its dashboard — no special preparation needed
  as long as a database migration in the new deploy isn't a hard
  dependency the old code can't run without.
- **Database**: migrations in this repo are additive-only by design (no
  migration drops a column or table) specifically so a code rollback never
  needs a matching migration rollback — the old code simply ignores columns
  it doesn't know about. This is a real constraint to keep honoring for any
  future migration, not just a nice property of the ones that exist today.
- **Redis**: credits/rate-limit state in Redis isn't versioned or migrated
  at all — a code rollback doesn't affect it.

## Deployment steps (once ready to actually deploy)

1. Complete `docs/deployment-checklist.md` in full.
2. Set all environment variables in the Vercel project settings.
3. Run `npx drizzle-kit migrate` against the production `DATABASE_URL`
   (from a machine with that connection string, before the new deploy is
   live — see "Database migrations" above for which migrations are safe).
4. Connect the GitHub repo to a new Vercel project (or push to the branch
   an existing project tracks).
5. Register the Clerk production webhook endpoint pointing at the new
   domain, and set `CLERK_WEBHOOK_SECRET` to match.
6. After the deploy finishes, run through `docs/manual-qa-checklist.md`
   against the real production URL — do not consider the deployment
   verified until that's done.
