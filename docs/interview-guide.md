# Interview Guide

Questions based only on what's actually in this repo. Answers are written
the way a developer who built this would actually talk about it — direct,
with the tradeoff acknowledged, not a textbook definition.

---

**Q: Why Redis for credits instead of just a column in Postgres?**
*Tests:* whether you understand why a single Postgres `UPDATE ... SET
credits = credits - 1` isn't actually safe under concurrency without extra
work, and why you'd reach for something else instead of just adding a
lock.
*Answer:* "Two simultaneous requests both reading a Postgres row, decrementing in application code, and writing it back can race — you'd need `SELECT ... FOR UPDATE` or an atomic `UPDATE ... WHERE credits > 0 RETURNING credits` to make it safe in Postgres directly. I used Redis instead because it gives you atomic operations for free — a Lua script that does a check-and-decrement in one round trip, no separate lock needed — and it's fast enough that the rate limiter and the credit gate can both sit in the request's hot path without adding real latency. Postgres still has a `users.credits` column, but it's explicitly documented as a display-only mirror — Redis is the actual source of truth for whether a request is allowed to proceed."
*Code:* `lib/credits.ts`
*Follow-up:* "What if Redis goes down?" → Honest answer: right now, `getRedis()` isn't wrapped in a try/catch at the route level, so a Redis outage would 500 the generation routes rather than degrading gracefully. That's a real gap I'd fix before real load — probably fail open with a lower per-user limit, logged loudly, rather than fail closed and block everyone.

---

**Q: Walk me through how atomic credit deduction actually works.**
*Answer:* "It's a Lua script executed via Redis's `EVAL`. Lua scripts in Redis run atomically — no other command can interleave partway through. The script does `GET` on the credits key, checks if it's greater than zero, and if so does the `DECR` and returns the new value; if not, it returns a sentinel meaning 'insufficient.' Because it's one script, not two separate Redis calls from my application code, there's no window where two requests could both read '1 credit left' and both decide they're allowed to proceed."
*Code:* `lib/credits.ts` — the `luaDecrement` constant and `decrementCredit()`.
*Follow-up:* "Why not use `WATCH`/`MULTI`/`EXEC` instead?" → That's optimistic locking with a retry loop; a server-side Lua script is simpler for this specific check-and-decrement shape and avoids the retry logic entirely.

---

**Q: What happens if Replicate fails after the credit is already deducted?**
*Answer:* "The credit gets refunded — atomically, via Redis `INCR` — before the route returns its error response. I made a specific decision about ordering: validation happens before the credit is touched at all, so a bad request (missing field, etc.) never costs a credit in the first place. Only once the request is genuinely valid does the credit get decremented, and from that point on, any failure path refunds it. The one case that does NOT refund is when the provider call itself succeeds but the database write to save the resulting design fails — in that case the user already got a real, paid-for generation; refunding would mean giving away a free generation for a persistence bug, which is a different problem than a generation that never happened."
*Code:* `app/api/generate-design/route.ts`, same pattern in `generate-image` and `refine`.
*Follow-up:* "How do you know the refund actually happens and isn't itself lost?" → I don't have a bulletproof answer for a true crash mid-request — that's a real limitation of doing this synchronously in one HTTP request instead of through a durable queue with retries. It's an accepted tradeoff at this stage, documented in `PROJECT_AUDIT.md`'s "why not go async yet."

---

**Q: How do you prevent double charging on a retry or duplicate request?**
*Answer:* "There's no explicit idempotency key on these endpoints right now — if a client retries a POST to `/api/generate-design` after a timeout, that's a second real request and a second credit gets charged. What I do have is the rate limiter (10 requests/minute per user via a sliding window), which bounds how much damage a retry storm from a broken client could do, but it's not the same as true idempotency. If I were building this for real payment-grade correctness I'd add a client-generated idempotency key that gets checked against a recent-requests table before charging again."
*Code:* `lib/credits.ts`'s `checkRateLimit`.
*Follow-up:* honest — this is a named gap, not solved.

---

**Q: How does Clerk authentication work in this app?**
*Answer:* "`clerkMiddleware` wraps every route matched by the config in `middleware.js`, and for anything under `/dashboard`, it calls `auth.protect()`, which redirects unauthenticated visitors to sign-in. On the API side, every route that touches user data calls `currentUser()` as its first step and returns 401 if it's null — that's a consistent pattern across all nine route handlers, not something each one reinvents."
*Code:* `middleware.js`, and the first few lines of any route under `app/api/`.

---

**Q: How is webhook provisioning made idempotent?**
*Answer:* "There are two paths that can create a user row — the Clerk `user.created` webhook, and a client-side fallback call to `/api/verify-user` that fires on first load in case the webhook is delayed. Both call the same `upsertUserFromClerk()` function, which does an `INSERT ... ON CONFLICT DO NOTHING` keyed on email. If both paths race, one of them wins the insert and gets the row back from `.returning()`; the other gets zero rows back, falls through to a plain `SELECT`, and returns the same row the winner created. Neither path throws, and you never end up with two user rows for the same person."
*Code:* `lib/userUpsert.ts`.
*Follow-up:* "Why key on email instead of Clerk ID?" → Clerk ID is the primary identity, but at the time this was built email was the natural unique key already in place; `clerkId` was added later as its own unique column with a backfill migration once the FK relationship to `designs.userId` needed it.

---

**Q: How does the refinement chain work, and why a self-referencing relationship?**
*Answer:* "`designs.parentDesignId` points at another row in the same table — null for an original generation, set to the design it was refined from otherwise. That makes a chain just a linked list you can walk in either direction: querying `WHERE parentDesignId = X` gets you the children, following `parentDesignId` up gets you the ancestry. I considered a separate `refinements` join table, but a self-reference is simpler for a strictly linear chain — there's no branching or many-to-many relationship to model here, so a join table would be overhead without a real use case yet."
*Code:* `config/schema.ts` — `designs.parentDesignId`; `lib/designChains.ts` for how the UI groups a flat design list back into chains.
*Follow-up:* "What happens if you delete a design in the middle of a chain?" → `ON DELETE SET NULL` — the design's children become roots of their own chain rather than being cascade-deleted or orphaned with a dangling reference.

---

**Q: Why Cloudinary instead of, say, S3 directly?**
*Answer:* "Cloudinary gives you upload handling, storage, and a CDN URL back in one API call, plus built-in image transformations if I need them later — thumbnails, format conversion — without standing up my own processing pipeline. For a project this size, that's less infrastructure to own than S3 plus a separate image-processing step."
*Code:* `config/cloudinaryConfig.ts`, `app/api/upload-image/route.ts`.

---

**Q: Why build a separate AI provider abstraction instead of calling Replicate directly?**
*Answer:* "Because I don't want to be locked into Replicate specifically — there's real momentum toward self-hosting open-weight models (FLUX, Stable Diffusion variants, custom LoRAs) once cost or control becomes a bigger concern than convenience. So route handlers depend on an `ImageGenerationProvider` interface with `generate()`/`refine()`, and `ReplicateSdxlProvider` is the only thing implementing it today. Swapping to a self-hosted FastAPI service later means writing a new class that implements the same interface — the routes, the credit logic, the `generations` table, none of that has to change."
*Code:* `lib/generation/types.ts`, `lib/generation/providers.ts`.
*Follow-up:* "Why didn't you also force Ideogram through that interface?" → I actually tried, and it didn't fit — Ideogram is a free-text-prompt, generate-only model with no refine concept, and forcing it into `GenerateInput`'s room/style shape would've meant joining fields into a prompt string, which loses information rather than abstracting anything real. I decided a bad abstraction is worse than no abstraction, so Ideogram still calls its own config function directly.

---

**Q: How would you migrate from Replicate to self-hosted inference?**
*Answer:* "Write a `SelfHostedProvider` class implementing `ImageGenerationProvider`, pointing at a FastAPI service that wraps the actual GPU inference (probably Diffusers or ComfyUI under the hood). The route handlers and `GenerationService` don't change — they already only know about the interface. The real work is entirely on the other side of that interface: serving a model with acceptable latency, handling GPU availability constraints, probably introducing async job polling at that point since self-hosted inference queues differently than a pay-per-call API. That's explicitly the trigger point in `PROJECT_AUDIT.md` for revisiting the 'stay synchronous' decision."

---

**Q: What happens if the AI provider goes down entirely?**
*Answer:* "Every generation attempt is wrapped in a try/catch; a thrown error from the provider gets caught, the `generations` row is marked `failed` with the error message, the credit gets refunded, and the user sees a message telling them the credit wasn't charged. So a provider outage degrades to 'nobody can generate right now, but nobody loses credits either' rather than a confusing partial-charge state. What it doesn't do yet is proactively detect an outage and short-circuit — every request still pays the full timeout cost of trying and failing."

---

**Q: How would you handle 1,000 concurrent generations?**
*Answer:* "Honestly, at that volume I'd need to revisit the synchronous request model — Vercel serverless functions have execution time limits, and holding one open per in-flight 10-30 second generation doesn't scale well past a certain concurrency. The `generations` table's `pending`/`processing` states already model what a real job queue would need; the missing piece is actually decoupling the HTTP request from the generation itself — accept the request, return a job ID immediately, and let the client poll or use a webhook. I didn't build that now because there's no real traffic yet to justify the added complexity, but the schema doesn't need to change to get there."

---

**Q: What are the current bottlenecks?**
*Answer:* "There's no real traffic yet, so I don't have measured bottlenecks — I'd be guessing if I named one with confidence. The honest answer is I don't know yet, and `docs/analytics-funnel.md`'s latency queries are specifically there to find out once there's real usage, rather than optimizing blind."

---

**Q: What was the hardest bug you ran into, and how did you find it?**
*Answer:* "A production build that passed locally over and over turned out to be silently broken. Two route files exported plain constants alongside their POST handler, which Next.js's typed-route validation actually rejects — but only on a genuinely clean build. Locally, incremental build caching kept reusing a previously-valid type-check result, so the bug never surfaced until I specifically wiped `.next` and rebuilt from scratch. Separately, an E2E test-mode module swap (mocking external services for Playwright) got poisoned by the exact same caching mechanism — a real build run in between two test-mode builds left a stale, unaliased module resolution cached. I fixed both by (1) removing the invalid exports, and (2) giving test-mode builds their own separate build output directory so they can never share cache state with a real build. The lesson that stuck: 'it built fine on my machine ten times' isn't evidence if it's the same warm cache ten times."
*Code:* `next.config.mjs`'s `distDir` comment; the git history around that fix.

---

**Q: What would you change in a v2?**
*Answer, honestly:* "Real async job handling once there's actual load to justify it. A revoke path for shared designs — right now sharing is one-way. Idempotency keys on the generation endpoints so a client retry can't double-charge. And I'd want real usage data before touching the AI pipeline itself — the refinement quality feedback widget exists specifically so that decision (better prompting vs. lower strength vs. actual segmentation/masking) is made from data, not intuition."
