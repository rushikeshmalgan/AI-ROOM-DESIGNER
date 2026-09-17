# Deciding on AI v2 (segmentation/masking/inpainting)

**Do not implement this yet.** The current refinement pipeline
(`config/replicateConfig.refineRoomDesign`) is plain SDXL image-to-image —
no masking, no region targeting. README already documents the honest
limitation: it can bias toward a smaller, more targeted change via lower
`strength`, but it cannot guarantee only the requested object changes.

The temptation is to jump straight to a "real" fix:

```
User: "Change only the sofa."
    ↓
Identify sofa (object detection)
    ↓
Generate mask
    ↓
Inpaint masked region
    ↓
Preserve everything else
```

That's a legitimate architecture, and a genuinely stronger engineering
story if it's ever built. It is also real scope: a new model/API
integration, new latency and cost, new failure modes, and real engineering
time. Building it before there's evidence the current approach is
inadequate is exactly the kind of AI-investment-without-data this project
has otherwise avoided.

## The actual decision process, in order

1. **Collect real failure examples.** `RefinementQualityFeedback` (see
   `app/components/ui/RefinementQualityFeedback.jsx`) exists specifically to
   generate this data — "it changed too much" / "it changed what I asked" /
   "unrealistic" checkboxes tied to a `designId`, one row per refinement in
   the `events` table.

2. **Measure failure frequency**, not just anecdotes:
   ```sql
   SELECT
     count(*) FILTER (WHERE (properties->>'changedTooMuch')::boolean) AS changed_too_much,
     count(*) FILTER (WHERE (properties->>'changedWhatAsked')::boolean) AS changed_what_asked,
     count(*) FILTER (WHERE (properties->>'unrealistic')::boolean) AS unrealistic,
     count(*) AS total_feedback
   FROM events WHERE event = 'refinement_quality_feedback';
   ```
   Also cross-reference against the *volume* of refinements actually
   happening (`docs/analytics-funnel.md`'s refinement-rate query) — a high
   failure rate on a handful of refinements is a different situation than
   the same rate across hundreds.

3. **Read the actual failed examples**, not just the aggregate percentage.
   Pull the `designId`s tied to negative feedback and look at the
   before/refined image pairs directly. A "changed too much" complaint
   might mean the whole room repainted, or it might mean one extra piece of
   furniture moved slightly — those call for very different fixes.

4. **Estimate the cost of the current approach's failures** — wasted
   credits (should be rare, since a technical failure already triggers a
   refund; this is about a refinement that *succeeded* technically but
   produced something the user didn't want and had to redo), and the
   qualitative cost of a broken first impression of the refinement feature.

5. **Before committing to segmentation specifically**, also consider the
   cheaper alternatives the data might actually point to:
   - **Better prompting** — if failures cluster around specific instruction
     phrasings, the fix might be prompt engineering, not architecture.
   - **Lower refinement strength** — if failures are "changed too much"
     but "preserved room" is usually true, tightening `strength` further
     (currently 0.5) may be sufwfficient.
   - **Segmentation/masking/inpainting** — justified specifically when
     feedback shows the model keeps altering objects/regions nowhere near
     what was asked, and prompting/strength tuning hasn't fixed it.

6. **If segmentation looks justified**, before writing code: test available
   models (e.g. SAM for segmentation, an inpainting-capable diffusion model)
   against 5-10 of the actual failed examples collected in step 3, and
   compare quality and estimated per-generation cost against the current
   pipeline. Only build the integration once that comparison shows a real
   improvement on real failure cases — not on a synthetic "change the sofa"
   demo image.

## What "justified" looks like

A concrete bar, not a vibe: segmentation is worth building when the data
shows a meaningful share of refinements (not a handful of isolated
complaints) reporting the model changed something well outside the
requested scope, prompting and strength tuning have already been tried
against those same cases and didn't fix it, and a quick model comparison on
the actual failure set shows a real quality improvement worth the added
latency/cost/complexity. Until then, this stays a documented limitation,
not a build item.
