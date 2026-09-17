# Deployment checklist

Run through this before pointing a real domain at this app. Each item
notes what to actually check, not just a box to tick.

## Production build

- [ ] `npm run build` succeeds from a **completely clean** checkout (no
      reused `.next`/`.next/cache` from a previous session) — this is not
      redundant with CI passing once; this session found two real bugs
      (a stale-cache-poisoned module alias, and route files exporting
      values Next.js's typed-route validation rejects) that only surfaced
      on a genuinely clean build after being silently masked by incremental
      caching locally. If your deploy platform's build isn't guaranteed
      fresh per deploy, don't assume last week's green build means this
      week's will be.

## Environment variables

Set on the real deployment target (Vercel or otherwise), all as **real**
production values, none left as local/test placeholders:

- [ ] `DATABASE_URL` — production Neon connection string
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` — production Clerk instance, not the dev/test instance
- [ ] `CLERK_WEBHOOK_SECRET` — matches the webhook endpoint registered in the Clerk dashboard for *this* deployment's URL
- [ ] `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` / `NEXT_PUBLIC_CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET`
- [ ] `REPLICATE_API_TOKEN`
- [ ] `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`
- [ ] `PLAYWRIGHT_TEST_MODE` is **not** set anywhere in the production environment (it should never be — this is a sanity check, not a step, since setting it would swap in the E2E test mocks in production)

## Database

- [ ] Migrations up through `0005_add_analytics_events.sql` and
      `0006_add_design_public_sharing.sql` applied to production
- [ ] `0003_reconcile_schema_constraints.sql` handled per
      `docs/db-migration-checklist.md` — do not skip its data checks
- [ ] Confirm `designs.isPublic` defaults to `false` on production data (it
      does per the migration, but worth confirming no existing rows were
      already public via some other path — there is none, but check anyway
      before this feature is live for real users)

## Redis

- [ ] Upstash instance is the production one, not a free/dev instance that
      could be reset or hit usage limits unexpectedly
- [ ] Confirm credits/rate-limit keys aren't pre-seeded with test data

## Clerk

- [ ] Webhook URL in the Clerk dashboard points at the real deployment's
      `/api/webhooks/clerk`, not `localhost` or a preview URL
- [ ] Test the webhook actually fires on a real sign-up against production
      (Clerk's dashboard has a "send test event" tool — use it, then check
      the `users` table for the provisioned row)

## Cloudinary / Replicate

- [ ] Confirm the Cloudinary account/folder used in production isn't the
      same one used for local development testing (avoid mixing real user
      uploads with test images)
- [ ] Confirm the Replicate account has billing set up and isn't going to
      silently fail once a free-tier credit runs out

## Domain / routing

- [ ] Production domain configured and HTTPS working
- [ ] `/share/:id` pages load correctly on the real domain (test with an
      actual shared design, not just locally) — this is the page most
      likely to be hit by someone with zero context on the product, so it
      needs to work on the first try
- [ ] Images from Cloudinary/Replicate's CDN actually load on the deployed
      domain (check `next.config.mjs` / `next/image` remote patterns if
      images don't render — this app currently uses plain `<img>` tags in
      several places rather than `next/image`, so this is less likely to
      be an issue than on a typical Next.js app, but still worth a visual
      check)

## Error handling

- [ ] Trigger a real error path in production (e.g., temporarily use a
      malformed image) and confirm `app/error.jsx` / `app/not-found.jsx`
      render instead of a raw stack trace or blank page
- [ ] Confirm error logs are actually reaching wherever you'll look for
      them post-launch (Vercel logs, or whatever the deploy target provides)
