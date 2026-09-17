# Beta readiness checklist

Do not call this beta-ready until every box is checked for real. This file
tracks that explicitly, including which items were verified in an automated
sandbox (no real Clerk/Replicate/Cloudinary credentials available) versus
which still need a human to confirm against a real deployment.

## Verified this session (automated, sandboxed — no real provider credentials)

- [x] Production build passes from a clean checkout (`npm run build`, real
      env var format, no test-mode aliasing)
- [x] Vitest suite passes (99 tests — auth, ownership, rate limits, credit
      exhaustion/refund, DB-write-failure fallbacks, analytics event
      tracking, all with external providers mocked)
- [x] E2E suite passes (6 tests — create-new flow, refinement, version
      chains, sharing — against in-memory test doubles, not real services)
- [x] No dead buttons/broken routes found in this pass (the ones found in
      the original audit — "Buy More Credits", "Settings" — were already
      removed in an earlier phase)
- [x] Database migration safety reviewed — `0003`'s reconciliation
      migration is idempotent and fails fast with a specific diagnostic;
      see `docs/db-migration-checklist.md` for what still needs checking
      against real production data before it's applied

## Still needs a human, against a real deployment

- [ ] Real signup tested (`docs/manual-qa-checklist.md`'s "New user" section)
- [ ] Real image upload tested against real Cloudinary
- [ ] Real generation tested against real Replicate — confirm actual output
      quality, not just that the API call succeeds
- [ ] Real refinement tested — confirm the strength/guidance tuning
      (documented in `config/replicateConfig.ts`) actually produces
      reasonable results on real photos, not just that the request completes
- [ ] Credit failure/refund tested against real Redis
- [ ] Rate limit tested against real Redis
- [ ] Authorization tested against real Clerk sessions (two real accounts,
      one trying to refine/share the other's design)
- [ ] Mobile tested on real devices (`docs/manual-qa-checklist.md`'s
      "Mobile" section) — the E2E suite deliberately does not cover this;
      see `e2e/README.md` for why
- [ ] Share page tested with a real shared link, including checking the
      social preview actually renders correctly when pasted into
      Slack/iMessage/Twitter
- [ ] Analytics verified — confirm events are actually landing in the
      production `events` table, not just that `trackEvent` doesn't throw
- [ ] Error recovery tested against a real (not mocked) provider failure
- [ ] `docs/deployment-checklist.md` completed in full

## Sign-off

- [ ] `docs/manual-qa-checklist.md` completed and signed
- [ ] README updated to reflect the deployed state (live URL, screenshots)
      once there is one

Until every unchecked box above is checked by an actual person against a
real deployment, the honest status is: **technically sound, functionally
unverified against real external services.** That is not the same as
beta-ready.
