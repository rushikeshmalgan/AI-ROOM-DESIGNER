# Manual QA checklist

This exists because the previous sessions could not run against real Clerk /
Replicate / Cloudinary / Neon credentials in the sandboxed environment they ran
in — everything was verified via the automated test suite, `next build`'s
type-checking, and code review, **not** a real browser session. Do not call
the product beta-ready until every box below has actually been checked against
a real deployment (or `npm run dev` with real credentials).

## New user journey

- [ ] Landing page loads, "Get Started" goes to sign-up
- [ ] Sign-up completes, lands on `/dashboard`
- [ ] Dashboard shows the empty state (not a blank/broken screen) for a brand-new account
- [ ] "Redesign Room" goes to `/dashboard/create-new`
- [ ] Upload a real room photo — preview appears, no console errors
- [ ] Select a room type, a design style, optionally add a note
- [ ] Click Generate — staged loading captions appear and progress (not stuck on one)
- [ ] Generation succeeds, redirects to dashboard, new design card appears with a working before/after slider
- [ ] Credits counter in the header decremented by 1

## Refinement

- [ ] On a generated design, type "change the sofa to a beige sectional" and submit
- [ ] Refine button disables and shows "Refining..." while in flight
- [ ] A new version appears in the same chain (not a new separate card)
- [ ] The new version's slider compares it to the *previous* version, not the original
- [ ] Suggested-refinement chips populate the input when clicked
- [ ] Do a second refinement ("make the walls warmer") — chain now shows 3 versions in order
- [ ] Credits decremented once per refinement

## Failure states

- [ ] **Provider failure**: temporarily break `REPLICATE_API_TOKEN` (or throttle it) and confirm the error message says the credit wasn't charged, and the credits counter is actually unchanged after refresh
- [ ] **Network failure**: throttle/offline the network mid-request (browser devtools) — confirm a clear error, not a silent hang, and the button re-enables
- [ ] **Invalid image**: try uploading a `.pdf` or `.txt` renamed to `.jpg` — confirm a clear rejection, not a crash
- [ ] **Oversized image**: try a >10MB photo — confirm the 10MB limit message (client-side resize should make this rare, but the server limit is the real backstop)
- [ ] **Invalid instruction**: submit an empty refine instruction (should be blocked client-side); submit a 301+ character instruction (should be rejected with the length error)
- [ ] **Insufficient credits**: exhaust credits (or set them to 0 directly in Redis for a test user) — confirm the 402 message and that Generate/Refine don't silently no-op
- [ ] **Rate limit**: fire >10 requests in a minute — confirm the 429 message
- [ ] **Double-click**: rapidly double-click Generate and Refine — confirm only one request fires and only one credit is charged (buttons should already be disabled after the first click)
- [ ] **Page refresh mid-generation**: refresh the browser while a generation is in flight — confirm the in-flight request either completes server-side (credit correctly charged, design appears on next visit) or fails cleanly; confirm the UI doesn't get stuck in a permanent loading state
- [ ] **Browser back button**: navigate back from `/dashboard/create-new` mid-form-fill, then forward again — confirm no crash and no duplicate submission

## Security

- [ ] As User A, note a design ID from the URL/network tab
- [ ] As User B (different account), call `POST /api/designs/:id/refine` against User A's design ID (via devtools/curl, or a second browser profile)
- [ ] Confirm a 404 (not a 403, not a 500, and definitely not a successful refinement) — this is covered by an automated test (`refine-design.test.js`), but confirm it against the real deployed route too, since middleware/auth wiring in production can differ from the test mocks

## Mobile

- [ ] iPhone-sized viewport (or a real iPhone): landing, sign-up, dashboard all readable with no horizontal scroll
- [ ] Android-sized viewport: same
- [ ] Before/after slider responds to touch drag on a real touch device (not just mouse emulation in devtools — pointer events can behave differently)
- [ ] Image upload works from a mobile browser's camera/photo picker
- [ ] Refinement text input doesn't get obscured by the mobile keyboard
- [ ] Dashboard version chains are readable at narrow width (cards stack, don't overflow)

## Sign-off

Do not mark the product beta-ready in any report until this file has actual
checked boxes from a real run, with the date and who ran it noted here:

- Run by: ___________
- Date: ___________
- Environment tested: ___________ (e.g., production URL, or `npm run dev` with real keys)
- Outstanding issues found: ___________
