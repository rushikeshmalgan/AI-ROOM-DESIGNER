# Analytics funnel

The events this app tracks (see `lib/analytics.ts` for the authoritative type)
and the funnel they're meant to answer. No numbers below are real — there is
no production traffic yet. Once there is, run the queries in this doc against
the real `events`/`designs` tables to fill them in.

## The funnel

```
Landing        (landing_view)
  ↓
Signup         (signup)
  ↓
Upload         (image_uploaded)
  ↓
First Generation   (generation_succeeded, generationType=initial)
  ↓
First Refinement   (refinement_succeeded)
  ↓
Second Refinement  (refinement_succeeded, 2nd for the same original design)
  ↓
Save           (design_saved)
  ↓
Share          (design_shared)
  ↓
Return         (any event on a later calendar day)
```

**The most important number in this list is the first-refinement rate** —
what fraction of users who get a successful first generation ever ask for a
change. That number is the whole bet this product makes: that redesigning a
room is not a one-shot task. If it's low, the refinement UI isn't being
discovered, or the first result is already "good enough" that people don't
feel a need to iterate — either way, that's the single most important thing
to find out before investing further in AI quality work (see
`docs/ai-quality-decision-framework.md`).

Second is **return rate** — do people come back and generate or refine again
on a later day. Everything else in this funnel (share rate, save rate) matters
more for growth than for proving the core product works.

## Event reference

| Event | Where it fires | Key properties |
|---|---|---|
| `landing_view` | `app/page.js` on mount | — |
| `signup` | Clerk webhook, `user.created` | — |
| `dashboard_view` | `app/dashboard/page.jsx` on mount | — |
| `create_design_started` | `app/dashboard/create-new/page.jsx` on mount | — |
| `image_uploaded` | after a successful `/api/upload-image` call | — |
| `generation_started` / `_succeeded` / `_failed` | `generate-design`/`generate-image` route handlers | `roomType`, `designStyle`, `generationType: 'initial'`, `provider`, `latencyMs` (succeeded/failed only) |
| `refinement_started` / `_succeeded` / `_failed` | `refine` route handler | same as above plus `generationType: 'refinement'`, `parentDesignId` |
| `design_saved` | "Save" button in `DesignChain` | `designId` |
| `design_shared` | "Share" button in `DesignChain` | `designId`, `method: 'native_share' \| 'copy_link'` |
| `generation_feedback` | Phase 7 rating widget (not yet built) | `designId`, `rating` |
| `refinement_quality_feedback` | Phase 8 quality checkboxes (not yet built) | `designId`, `changedWhatAsked`, `preservedRoom`, `changedTooMuch`, `unrealistic` |

## Queries

All queries assume Postgres/Neon, querying the `events` and `designs` tables directly.

**Signup conversion** (landing views → signups, by day):
```sql
SELECT
  date_trunc('day', e1."createdAt") AS day,
  count(DISTINCT e1.id) FILTER (WHERE e1.event = 'landing_view') AS landing_views,
  count(DISTINCT e2.id) FILTER (WHERE e2.event = 'signup') AS signups
FROM events e1
FULL OUTER JOIN events e2 ON date_trunc('day', e1."createdAt") = date_trunc('day', e2."createdAt")
GROUP BY 1 ORDER BY 1;
```
(Simpler in practice: just count each event by day separately and compare — a full outer join like this only makes sense once there's enough volume that day-grouping needs to be exact. Start with two separate `COUNT(*) ... WHERE event = X GROUP BY day` queries.)

**Upload conversion** (signups → users who upload at least one image):
```sql
SELECT
  count(DISTINCT "userId") FILTER (WHERE event = 'signup') AS signups,
  count(DISTINCT "userId") FILTER (WHERE event = 'image_uploaded') AS uploaders
FROM events;
```

**Generation success rate**:
```sql
SELECT
  count(*) FILTER (WHERE event = 'generation_succeeded') AS succeeded,
  count(*) FILTER (WHERE event IN ('generation_succeeded', 'generation_failed')) AS attempted,
  round(
    100.0 * count(*) FILTER (WHERE event = 'generation_succeeded')
    / NULLIF(count(*) FILTER (WHERE event IN ('generation_succeeded', 'generation_failed')), 0),
    1
  ) AS success_rate_pct
FROM events;
```

**The key metric — first-refinement rate** (% of users with a successful generation who ever refine):
```sql
WITH generators AS (
  SELECT DISTINCT "userId" FROM events WHERE event = 'generation_succeeded' AND "userId" IS NOT NULL
),
refiners AS (
  SELECT DISTINCT "userId" FROM events WHERE event = 'refinement_succeeded' AND "userId" IS NOT NULL
)
SELECT
  (SELECT count(*) FROM generators) AS users_who_generated,
  (SELECT count(*) FROM generators g JOIN refiners r ON r."userId" = g."userId") AS users_who_refined,
  round(
    100.0 * (SELECT count(*) FROM generators g JOIN refiners r ON r."userId" = g."userId")
    / NULLIF((SELECT count(*) FROM generators), 0),
    1
  ) AS refinement_rate_pct;
```

**Second-refinement rate** (of users who refined once, how many refined again — using `designs.parentDesignId` chain depth rather than the events table, since it's the more precise source for "how deep did this chain go"):
```sql
WITH chain_depth AS (
  SELECT "userId", count(*) AS versions
  FROM designs
  WHERE "parentDesignId" IS NOT NULL
  GROUP BY "userId"
)
SELECT
  count(*) FILTER (WHERE versions >= 1) AS refined_once,
  count(*) FILTER (WHERE versions >= 2) AS refined_twice_plus,
  round(100.0 * count(*) FILTER (WHERE versions >= 2) / NULLIF(count(*) FILTER (WHERE versions >= 1), 0), 1) AS second_refinement_rate_pct
FROM chain_depth;
```

**Save rate / share rate** (of users who generated, how many ever saved/shared):
```sql
SELECT
  count(DISTINCT "userId") FILTER (WHERE event = 'generation_succeeded') AS generators,
  count(DISTINCT "userId") FILTER (WHERE event = 'design_saved') AS savers,
  count(DISTINCT "userId") FILTER (WHERE event = 'design_shared') AS sharers
FROM events;
```

**D1 / D7 retention** (of users active on day 0, what fraction had any event 1 or 7 days later):
```sql
WITH first_seen AS (
  SELECT "userId", min(date_trunc('day', "createdAt")) AS day0
  FROM events WHERE "userId" IS NOT NULL GROUP BY "userId"
),
active_days AS (
  SELECT DISTINCT "userId", date_trunc('day', "createdAt") AS day
  FROM events WHERE "userId" IS NOT NULL
)
SELECT
  count(DISTINCT f."userId") AS cohort_size,
  count(DISTINCT a1."userId") AS d1_retained,
  count(DISTINCT a7."userId") AS d7_retained
FROM first_seen f
LEFT JOIN active_days a1 ON a1."userId" = f."userId" AND a1.day = f.day0 + interval '1 day'
LEFT JOIN active_days a7 ON a7."userId" = f."userId" AND a7.day = f.day0 + interval '7 day';
```

## Do not optimize these numbers artificially

None of the above should be gamed (e.g., firing extra events, counting a page
view as "activation"). They exist to tell the truth about whether the
refinement loop is actually the value driver it's designed to be — if the
numbers say it isn't, that's the signal to listen to, not a target to hit by
changing what gets counted.
