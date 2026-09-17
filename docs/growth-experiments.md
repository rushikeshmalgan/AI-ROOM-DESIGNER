# Growth experiments

Three, not ten. Do not add referral credits or any other incentive until
one of these shows sharing actually happens without it — paying for a
behavior nobody does yet is wasted spend before it's a growth lever.

All three depend on `/share/:id` (see `docs/analytics-funnel.md` for the
events each stage below maps to).

## Experiment A — Shareable transformations

**Hypothesis:** users who generate a design they like will share it if the
share flow is trivial, and some fraction of viewers will try the product.

**What to do:** nothing new to build — the share flow already exists
(`DesignChain`'s Share button → `/share/:id`). Run this by using the product
yourself and with the first beta users (Phase 14), and watch the funnel.

**Measure:** `design_shared` events → `/share/:id` page visits (needs basic
page-view logging on the share page itself, not yet instrumented — add a
`trackEvent('share_page_viewed', { designId })` server-side in
`app/share/[id]/page.jsx` before running this for real) → `signup` events
where the new user's first action was visiting a share link → their first
`generation_succeeded`.

**Decision rule:** if share → visit → signup conversion is near zero after
~20 shares, the CTA/page itself is the problem (fix copy/design before
assuming the whole channel doesn't work). If visits happen but signups
don't, the landing/onboarding after the click is the problem, not sharing.

## Experiment B — Before/after content

**Hypothesis:** posting good before/after transformations into
renter/apartment/moving communities (the persona identified in the original
audit) drives cold traffic better than waiting for organic shares.

**What to do:** manually pick the best 3-5 transformations from real usage
(do not fabricate examples), post them where that persona already spends
time — this is a manual, human task, not something to automate yet. Include
the `/share/:id` link in the post so the destination has the same
before/after presentation as the source content.

**Measure:** views on the post (platform-native) → visits to the share link
→ site visits → signups. This is the one experiment where the top of the
funnel isn't in this app's own data at all — track it with whatever the
posting platform gives you (view/click counts) and reconcile manually
against signups in the relevant time window.

**Decision rule:** this only makes sense to repeat if it produces signups
at a rate that beats the effort of finding/posting content — if it's mostly
views with no signups, the audience or the content isn't matching, not a
reason to post more of the same.

## Experiment C — Referral loop

**Hypothesis:** a viewer of a shared design who's told "want to redesign
your room?" converts better than one who isn't.

**What to do:** the share page already has this — "Design your own room" is
exactly that prompt. No new build needed to start.

**Measure:** `/share/:id` visits → signup → `generation_succeeded`, isolated
to visits that came from a share link (vs. direct/organic landing traffic)
so this experiment's conversion rate is comparable to Experiment A's.

**Decision rule:** do not add referral credits (giving the sharer something
for a successful referral) until this shows sharing already happens at a
meaningful rate without an incentive. An incentive on a channel that isn't
being used yet doesn't create usage — it just adds cost to whatever else was
already going to happen.
