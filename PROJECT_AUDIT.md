# Project Audit

Written before any Phase 5+ architecture changes in this pass. This is the
inspection required before touching anything — see the accompanying
"Architecture Plan" section below for what happens next and why.

## Audit table

| Area | Current implementation | Strength | Problem | Proposed change | Priority |
|---|---|---|---|---|---|
| Frontend structure | Next.js 15 App Router, `app/dashboard/**`, `app/share/[id]`, root landing/auth pages | Clear, conventional, matches App Router idioms | None structural | Keep as-is | — |
| Routing | `/`, `/dashboard`, `/dashboard/create-new`, `/dashboard/generate-image`, `/share/[id]`, `/sign-in`, `/sign-up` | Small, every route earns its place, all tested | The requested `/design/new`, `/design/[id]` structure doesn't exist | **Not adopting it** — see "Why not restructure routes" below | — |
| Backend/API | 9 route handlers, all with consistent auth→validate→rate-limit→credit→provider→persist ordering | Very consistent pattern across routes, easy to onboard a new route into | Generation logic (prompt construction + provider call) lives directly in `config/replicateConfig.ts`, called directly by 2 routes — no seam to swap providers | **Provider abstraction** (this pass) | High |
| Database schema | `users`, `designs` (self-referencing `parentDesignId`), `events` | Correct FKs, indexed, migrations idempotent and verified | No `generations` table — a generation's lifecycle (attempt, failure, retry) isn't recorded, only the end state via `designs`; no `credit_transactions` ledger — Redis has the atomic counter but Postgres has no per-event history | **Add `generations` + `credit_transactions`** (this pass) | High |
| Authentication | Clerk, `clerkMiddleware`, `currentUser()` in every data route, webhook + client dual provisioning, atomic upsert | Race-safe, consistent, already audited twice this project | None found | Keep as-is | — |
| Authorization | 404-not-403 ownership check pattern (refine, share) | Correct, doesn't leak existence of other users' resources | `generate-design`/`generate-image` don't need ownership checks (they create, not access, a resource) — verified not applicable | Keep as-is; will replicate the same 404 pattern into the new `generations` read paths | — |
| Credits (Redis) | Atomic Lua decrement, atomic `INCR` refund, sliding-window rate limit | Correct concurrency handling, unit-tested | No queryable history — "why does this user have 2 credits" has no audit trail beyond current balance | **`credit_transactions` table**, Redis stays the fast/atomic gate | High |
| AI generation | `generateRoomDesign()`/`refineRoomDesign()` in `config/replicateConfig.ts`, called directly from route handlers | Correct prompt/parameter reasoning (documented), correct refund-on-failure | Tightly coupled to Replicate's SDK/model IDs directly inside route handlers | **`ImageGenerationProvider` interface + `ReplicateProvider`** | High |
| Refinement | Self-referencing `parentDesignId`, sources from parent's generated image, tuned strength/guidance | Correct, tested, documented limitation (no masking) | Same coupling issue as above | Same fix, one abstraction covers both | High |
| Cloudinary | MIME/size validation server-side, client-side resize, `tags: [user.id]` | Doesn't trust client Content-Type alone (checks the actual upload's declared MIME + size, and Cloudinary's own validation) | No deletion path exists (uploads are never cleaned up) | **Not building deletion this pass** — no evidence of storage-cost pressure yet, and it's a clean, separable addition later; noted as a gap, not silently ignored | Low |
| Sharing | `isPublic` flag, owner-only opt-in, 404-not-403, `generateMetadata` for OG/Twitter | Doesn't leak credits/prompts/internal IDs beyond the numeric `designs.id` in the URL | No revoke path; numeric sequential ID is guessable (low severity — the design must independently be marked public, so guessing an ID just finds designs the owner already chose to publish) | Revoke path is a real, small gap — **adding it this pass** | Medium |
| Analytics | `events` table, 14 event types, client (fire-and-forget) + server tracking | Doesn't block the request it's attached to on failure | Event names in this new prompt (`GENERATION_STARTED`, etc.) are already covered by the existing `generation_started`/etc. — just a naming-convention difference | Keep existing names (already shipped, already has real test coverage) rather than rename for cosmetic consistency | — |
| Observability | `lib/observability.ts`, one JSON log line per generation attempt | Structured, includes latency/success/provider/IDs | No correlation ID that ties a single HTTP request across auth→credit→generation→persist log lines (there's a `generationId` per attempt, but not a full request-scoped trace ID) | Reuse `generationId` as the correlation ID now that generation becomes a proper DB row — no new field needed | Low |
| Testing | 99 Vitest tests, 6 Playwright E2E tests, both passing on a clean build | Genuinely verified (not just "should work") — this is the strongest part of the project | New `generations`/`credit_transactions` tables and the provider abstraction need their own coverage | Add tests alongside the implementation, not after | High |
| Environment variables | `.env.example` complete, `.env*` gitignored, no secret ever committed (checked full git history) | Correct | None | Keep as-is | — |
| Deployment | No deploy target configured yet; `docs/deployment-checklist.md` exists | Checklist is accurate and specific | Never executed | Out of scope for this pass (explicitly deferred until code is "deployment-ready", not deployed) | — |
| Error handling | Consistent try/catch per route, `app/error.jsx`/`not-found.jsx` boundaries, no raw stack traces returned to clients | Solid | New `generations` table needs its own failure-state handling (see Phase 6 implementation below) | Handled as part of this pass | Medium |
| Security | Ownership checks verified via tests (cross-user 404 on refine/share), Clerk-gated middleware, svix webhook verification, MIME/size validation on upload | Solid, previously reviewed | Re-verified explicitly this pass (see "Security review" below) | — | — |
| Performance | Client-side image resize before upload, indexed FK columns | Reasonable for current scale | No caching layer, no CDN-level optimization beyond Cloudinary/Replicate's own — **no evidence this is a real bottleneck** at zero real users | Not touching this without a measured problem | — |
| Accessibility | Radix-based `Select` (already accessible), `BeforeAfterSlider` has `role="slider"` + arrow-key support, alt text on images | Reasonable baseline | Not exhaustively audited (no screen-reader pass performed) | Out of scope for this pass — no evidence-based reason to prioritize it over the architecture work requested | — |

## Why not restructure routes (Phase 2)

The requested structure (`/design/new`, `/design/[id]`, `/design/[id]/refine`,
`/design/[id]/share`) is a reasonable *possible* IA, but the prompt's own
rule 2 applies: "do not blindly use these routes, use the existing
application where appropriate." The current structure
(`/dashboard/create-new`, designs surfaced as cards on `/dashboard`,
`/api/designs/:id/refine`, `/api/designs/:id/share`) is already coherent,
already tested end-to-end (6 E2E tests depend on these exact paths), and
renaming it buys nothing for a user or an interviewer — it's not measurably
clearer, and it would touch every test, every internal link, and the
deployed-nowhere-yet app for a purely cosmetic reorganization. Rule 10
("prefer simple, maintainable architecture over premature
[changes]") and the audit's own directive ("if existing implementation is
already good, KEEP IT") both point the same direction. Not doing this.

## Architecture: current vs. target (this pass)

```
CURRENT
Route handler (generate-design, generate-image, refine)
  → directly calls config/replicateConfig.ts functions
  → directly calls Replicate's SDK
  → directly inserts a completed `designs` row (no in-between state)
  → credits: Redis atomic counter only, Postgres has current balance,
    no per-event ledger

TARGET (this pass — no queue, no async worker, still one HTTP request)
Route handler
  → GenerationService.generate() / .refine()
      → inserts a `generations` row (status: pending)
      → calls ImageGenerationProvider.generate() / .refine()
          → ReplicateProvider (the only implementation right now)
      → updates the `generations` row (status: completed | failed,
        latency, error)
      → inserts a `credit_transactions` row (GENERATION or REFUND)
      → inserts/links the `designs` row as today
  → route handler returns the same response shape as today (no API
    contract change for the frontend)

FUTURE (not built now — this is what the abstraction sets up)
GenerationService → ImageGenerationProvider → SelfHostedProvider → FastAPI → GPU
```

The frontend and route handler response shapes are unchanged — this is a
backend-internal seam, not a rewrite of anything user-facing.

## Files that will be modified

- `config/schema.ts` — add `generations`, `credit_transactions` tables
- `app/api/generate-design/route.ts`, `app/api/generate-image/route.ts`, `app/api/designs/[id]/refine/route.ts` — call the new `GenerationService` instead of `config/replicateConfig.ts` directly
- `config/replicateConfig.ts` — becomes `ReplicateProvider`'s implementation, behind the new interface (logic unchanged, just relocated/wrapped)
- `lib/credits.ts` — add a function to record a `credit_transactions` row (Redis logic unchanged)
- `app/api/designs/[id]/share/route.ts` + new unshare route — add revoke
- Test files for all of the above
- `README.md`, new `docs/deployment.md` (per this prompt's exact requested filename — supersedes nothing, `docs/deployment-checklist.md` stays as the execution checklist), `docs/product-readiness.md`, `docs/interview-guide.md`

## Files that will NOT be modified

- `middleware.js`, all of `lib/userUpsert.ts`, `app/api/webhooks/clerk/route.ts`'s provisioning logic, `config/db.ts`, `config/cloudinaryConfig.ts`, all of `app/dashboard/_components/**` UI (no evidence-based UX problem found — see Phase 21 note below), `test/mocks/**` and `e2e/**` (only extended, not restructured), `next.config.mjs`'s test-mode swap mechanism (still correct and needed)

## Dependency changes

None required. The provider abstraction is a plain TypeScript interface —
no new package.

## Database changes

Two new tables (`generations`, `credit_transactions`), both additive
migrations, no changes to existing columns. Detailed below in the
implementation section.

## Generation abstraction plan

```ts
interface ImageGenerationProvider {
  generate(input: GenerateInput): Promise<ProviderResult>;
  refine(input: RefineInput): Promise<ProviderResult>;
}
```

`getStatus()`/`cancel()` from the prompt's sketch are **not** implemented —
they only make sense for an async/polling provider, and this pass keeps
generation synchronous (see "Why not go async yet" below). Adding no-op or
speculative methods to an interface before anything implements them
meaningfully is exactly the kind of premature abstraction rule 10 warns
against. They can be added when a provider actually needs them.

## Why not go async yet (Phase 6)

A real job queue (PENDING → PROCESSING with polling/webhooks) is justified
when generation latency or Vercel's function timeout actually becomes a
problem. At zero real users and SDXL's ~10-30s typical latency (per
README, still not measured against real traffic), synchronous
request/response is simpler, easier to reason about, and every existing
test and the frontend's current UX (staged loading captions during one
`await`) already assumes it. What *is* being built now — the
`generations` table with a status column — records the lifecycle
(`pending` → `processing` → `completed`/`failed`) within the single
synchronous request, so the schema doesn't need to change when async
execution is eventually justified; only the route handler's control flow
would.

## Security review (re-verified this pass, not assumed)

- Ownership: refine/share already tested for cross-user 404 (not 403).
  New `generations` rows inherit the same design ownership — no new access
  path is introduced that bypasses the existing design-ownership check.
- Secrets: grepped for API-key-shaped strings and confirmed none are
  logged by `lib/observability.ts` or `lib/analytics.ts` (both only log
  IDs, provider names, latency, booleans, and short user-supplied strings
  like `roomType`/`designStyle` — never tokens or connection strings).
- Upload validation: server checks the uploaded file's actual declared
  MIME type and byte size before calling Cloudinary — not just trusting
  a client-side `accept` attribute (which is UX-only, not a real gate).
- Share links: numeric sequential IDs are guessable, but a guessed ID only
  reveals a design its owner already explicitly chose to make public
  (`isPublic` check on every load) — this is a real but low-severity
  property, noted rather than silently accepted.

## Roadmap for this pass (in commit order)

1. `PROJECT_AUDIT.md` (this file)
2. `generations` + `credit_transactions` schema + migration
3. `ImageGenerationProvider` interface + `ReplicateProvider`, wired into a `GenerationService`
4. Route handlers updated to use `GenerationService`, tests updated/added
5. Share revoke endpoint + test
6. Security/error-handling verification pass (documented, code changes only where a real gap is found)
7. `docs/deployment.md`, `docs/product-readiness.md`, `docs/interview-guide.md`, README updates
8. Final verification: typecheck, tests, clean build, E2E
