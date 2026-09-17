import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock declarations ────────────────────────────────────────────────────────
// All vi.mock calls are hoisted by Vitest — factories run before any imports.

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

// The route depends on the ImageGenerationProvider interface, not
// config/replicateConfig.ts directly — mock the provider, same role
// generateRoomDesign used to play in this test.
vi.mock('@/lib/generation/providers', () => ({
  replicateSdxlProvider: { generate: vi.fn(), refine: vi.fn() },
}));

// runGenerationAttempt's own DB bookkeeping is covered by
// lib/generation/generationService.test.ts — here it's a mocked
// collaborator that still actually invokes the callback it's given, so
// assertions on what the route passed to replicateSdxlProvider.generate
// keep working, while success/failure is derived the same way the real
// implementation derives it.
vi.mock('@/lib/generation/generationService', () => ({
  runGenerationAttempt: vi.fn(async (_meta, call) => {
    try {
      const result = await call();
      if (!result?.imageUrls || result.imageUrls.length === 0) {
        return { generationId: 1, success: false, errorMessage: 'Provider returned no images', latencyMs: 5 };
      }
      return { generationId: 1, success: true, imageUrls: result.imageUrls, latencyMs: 5 };
    } catch (err) {
      return { generationId: 1, success: false, errorMessage: err.message, latencyMs: 5 };
    }
  }),
  linkGenerationToDesign: vi.fn(),
}));

vi.mock('@/config/db', () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  const mockWhere = vi.fn(() => Promise.resolve([]));
  const mockSet = vi.fn(() => ({ where: mockWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));
  const mockSelectResult = vi.fn(() => ({ where: mockWhere }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return {
    db: { insert: mockInsert, update: mockUpdate, select: mockSelect },
    __mockInsert: mockInsert,
    __mockValues: mockValues,
    __mockReturning: mockReturning,
    __mockSelect: mockSelect,
    __mockFrom: mockFrom,
    __mockWhere: mockWhere,
  };
});

vi.mock('@/config/schema', () => ({
  designs: {},
  users: {},
}));

vi.mock('@/lib/credits', () => ({
  decrementCredit: vi.fn(),
  checkRateLimit: vi.fn(),
  syncCreditsToDb: vi.fn(),
  refundCredit: vi.fn(),
  recordCreditTransaction: vi.fn(),
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: vi.fn(),
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────
import { currentUser } from '@clerk/nextjs/server';
import { replicateSdxlProvider } from '@/lib/generation/providers';
import * as dbModule from '@/config/db';
import { decrementCredit, checkRateLimit, refundCredit, recordCreditTransaction } from '@/lib/credits';
import { trackEvent } from '@/lib/analytics';
import { POST } from '@/app/api/generate-design/route';

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(body) {
  return { json: async () => body };
}

const AUTHED_USER = { id: 'user_clerk_123', primaryEmailAddress: { emailAddress: 'test@example.com' } };
const GENERATED_URL = 'https://replicate.delivery/generated-room.jpg';
const SAVED_DESIGN = {
  id: 1,
  userId: AUTHED_USER.id,
  originalImageUrl: 'https://res.cloudinary.com/original.jpg',
  generatedImageUrl: GENERATED_URL,
  roomType: 'living room',
  designType: 'Scandinavian',
};

// ── Tests ────────────────────────────────────────────────────────────────────
describe('POST /api/generate-design', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 60000 });
    vi.mocked(decrementCredit).mockResolvedValue({ ok: true, remaining: 2 });
    vi.mocked(refundCredit).mockResolvedValue(3);
    // Backfill select returns empty (no existing user) by default
    dbModule.__mockWhere.mockResolvedValue([]);
  });

  // ── Happy path ─────────────────────────────────────────────────────────────
  it('happy path — authenticated, valid body → 200 with success:true', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(replicateSdxlProvider.generate).mockResolvedValue({ imageUrls: [GENERATED_URL] });
    dbModule.__mockReturning.mockResolvedValue([SAVED_DESIGN]);

    const req = makeRequest({
      imageUrl: SAVED_DESIGN.originalImageUrl,
      roomType: 'living room',
      designType: 'Scandinavian',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.generatedImageUrl).toBe(GENERATED_URL);
    expect(body.design).toEqual(SAVED_DESIGN);
    expect(body.creditsRemaining).toBe(2);

    expect(replicateSdxlProvider.generate).toHaveBeenCalledWith({
      imageUrl: SAVED_DESIGN.originalImageUrl,
      roomType: 'living room',
      designStyle: 'Scandinavian',
      additionalRequirements: undefined,
    });
    expect(dbModule.__mockInsert).toHaveBeenCalledTimes(1);
    expect(decrementCredit).toHaveBeenCalledTimes(1);
    expect(decrementCredit).toHaveBeenCalledWith(AUTHED_USER.id);

    expect(trackEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'generation_started', userId: AUTHED_USER.id }));
    expect(trackEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'generation_succeeded', userId: AUTHED_USER.id }));
    expect(recordCreditTransaction).toHaveBeenCalledWith(expect.objectContaining({ type: 'generation', amount: -1, generationId: 1 }));
  });

  // ── 401 — unauthenticated ──────────────────────────────────────────────────
  it('unauthenticated — currentUser() returns null → 401', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    const req = makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'bedroom',
      designType: 'Minimalist',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(replicateSdxlProvider.generate).not.toHaveBeenCalled();
    expect(dbModule.__mockInsert).not.toHaveBeenCalled();
  });

  // ── 402 — credits exhausted ─────────────────────────────────────────────────
  it('402 — decrementCredit returns ok:false → Payment Required', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(decrementCredit).mockResolvedValue({ ok: false, remaining: 0 });

    const res = await POST(makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'living room',
      designType: 'Scandinavian',
    }));
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toBe('Insufficient credits. Upgrade or wait for refill.');
    expect(replicateSdxlProvider.generate).not.toHaveBeenCalled();
    expect(dbModule.__mockInsert).not.toHaveBeenCalled();
  });

  // ── 429 — rate limit exceeded ────────────────────────────────────────────────
  it('429 — rate limit exceeded → too many requests', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 60000 });

    const res = await POST(makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'living room',
      designType: 'Scandinavian',
    }));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe('Rate limit exceeded. Please wait before trying again.');
    expect(decrementCredit).not.toHaveBeenCalled();
    expect(replicateSdxlProvider.generate).not.toHaveBeenCalled();
  });

  // ── 400 — missing imageUrl ─────────────────────────────────────────────────
  it('missing imageUrl → 400, no credit charged', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);

    const res = await POST(makeRequest({ roomType: 'kitchen', designType: 'Industrial' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/imageUrl/);
    expect(replicateSdxlProvider.generate).not.toHaveBeenCalled();
    expect(decrementCredit).not.toHaveBeenCalled();
  });

  // ── 400 — missing roomType ─────────────────────────────────────────────────
  it('missing roomType → 400', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);

    const res = await POST(makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      designType: 'Industrial',
    }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/roomType/);
    expect(decrementCredit).not.toHaveBeenCalled();
  });

  // ── 400 — missing designType ───────────────────────────────────────────────
  it('missing designType → 400', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);

    const res = await POST(makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'kitchen',
    }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/designType/);
    expect(decrementCredit).not.toHaveBeenCalled();
  });

  // ── 500 — Replicate returns empty array → credit refunded ─────────────────
  it('Replicate returns empty array → 500, credit refunded', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(replicateSdxlProvider.generate).mockResolvedValue({ imageUrls: [] });

    const res = await POST(makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'living room',
      designType: 'Bohemian',
    }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/not charged/);
    expect(body.creditsRemaining).toBe(3);
    expect(dbModule.__mockInsert).not.toHaveBeenCalled();
    expect(decrementCredit).toHaveBeenCalledTimes(1);
    expect(refundCredit).toHaveBeenCalledTimes(1);
    expect(refundCredit).toHaveBeenCalledWith(AUTHED_USER.id);
    expect(recordCreditTransaction).toHaveBeenCalledWith(expect.objectContaining({ type: 'refund', amount: 1 }));
  });

  // ── 500 — Replicate throws → credit refunded ────────────────────────────────
  it('Replicate throws → 500, credit refunded (not lost)', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(replicateSdxlProvider.generate).mockRejectedValue(new Error('Replicate API error'));

    const res = await POST(makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'office',
      designType: 'Mid-Century Modern',
    }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/not charged/);
    expect(body.creditsRemaining).toBe(3);
    expect(refundCredit).toHaveBeenCalledTimes(1);
    expect(refundCredit).toHaveBeenCalledWith(AUTHED_USER.id);
    expect(dbModule.__mockInsert).not.toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'generation_failed', userId: AUTHED_USER.id }));
  });

  // ── generation succeeds but DB save fails → 200 with saved:false ───────────
  it('DB insert fails after successful generation → 200, saved:false, no refund', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(replicateSdxlProvider.generate).mockResolvedValue({ imageUrls: [GENERATED_URL] });
    dbModule.__mockInsert.mockImplementationOnce(() => { throw new Error('DB write failed'); });

    const res = await POST(makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'living room',
      designType: 'Rustic',
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.generatedImageUrl).toBe(GENERATED_URL);
    expect(body.saved).toBe(false);
    expect(body.warning).toMatch(/could not be saved/);
    // The provider call succeeded and cost money — this must NOT be refunded.
    expect(refundCredit).not.toHaveBeenCalled();
  });

  // ── credits now enforced ─────────────────────────────────────────────────────
  it('authenticated user with credits — generation proceeds → 200', async () => {
    vi.mocked(currentUser).mockResolvedValue({ id: 'user_credits_available', primaryEmailAddress: { emailAddress: 'test@example.com' } });
    vi.mocked(replicateSdxlProvider.generate).mockResolvedValue({ imageUrls: [GENERATED_URL] });
    dbModule.__mockReturning.mockResolvedValue([{ ...SAVED_DESIGN, userId: 'user_credits_available' }]);

    const res = await POST(makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'bathroom',
      designType: 'Modern',
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.creditsRemaining).toBe(2);
    expect(decrementCredit).toHaveBeenCalledTimes(1);
    expect(replicateSdxlProvider.generate).toHaveBeenCalledTimes(1);
  });
});
