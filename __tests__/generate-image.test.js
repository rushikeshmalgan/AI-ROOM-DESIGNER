import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

vi.mock('@/config/ideogramConfig', () => ({
  generateIdeogramImage: vi.fn(),
}));

// runGenerationAttempt's own DB bookkeeping is covered by
// lib/generation/generationService.test.ts — mocked here as a
// collaborator that still invokes the callback it's given, so the
// generateIdeogramImage mock above still gets exercised and asserted on.
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
  users: {},
  designs: {},
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

import { currentUser } from '@clerk/nextjs/server';
import { generateIdeogramImage } from '@/config/ideogramConfig';
import * as dbModule from '@/config/db';
import { decrementCredit, checkRateLimit, refundCredit } from '@/lib/credits';
import { trackEvent } from '@/lib/analytics';
import { POST } from '@/app/api/generate-image/route';

function makeRequest(body) {
  return { json: async () => body };
}

const AUTHED_USER = { id: 'user_clerk_123', primaryEmailAddress: { emailAddress: 'test@example.com' } };
const GENERATED_URL = 'https://replicate.delivery/generated-ideogram.png';

describe('POST /api/generate-image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 60000 });
    vi.mocked(decrementCredit).mockResolvedValue({ ok: true, remaining: 2 });
    vi.mocked(refundCredit).mockResolvedValue(3);
    // Backfill select returns empty (no existing user) by default
    dbModule.__mockWhere.mockResolvedValue([]);
  });

  it('happy path — authenticated, valid body → 200 with success:true and saved:true', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(generateIdeogramImage).mockResolvedValue(GENERATED_URL);
    dbModule.__mockReturning.mockResolvedValue([{ id: 1 }]);

    const res = await POST(makeRequest({
      prompt: 'A modern living room with Scandinavian design',
      style: 'photographic',
      aspectRatio: '16:9',
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.imageUrl).toBe(GENERATED_URL);
    expect(body.saved).toBe(true);
    expect(body.creditsRemaining).toBe(2);
    expect(decrementCredit).toHaveBeenCalledWith(AUTHED_USER.id);
    expect(trackEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'generation_started', userId: AUTHED_USER.id }));
    expect(trackEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'generation_succeeded', userId: AUTHED_USER.id }));
  });

  it('unauthenticated — currentUser() returns null → 401', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    const res = await POST(makeRequest({ prompt: 'A bedroom' }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(generateIdeogramImage).not.toHaveBeenCalled();
  });

  it('402 — decrementCredit returns ok:false → Payment Required', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(decrementCredit).mockResolvedValue({ ok: false, remaining: 0 });

    const res = await POST(makeRequest({ prompt: 'A kitchen' }));
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(body.error).toBe('Insufficient credits. Upgrade or wait for refill.');
    expect(generateIdeogramImage).not.toHaveBeenCalled();
  });

  it('429 — rate limit exceeded → too many requests', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 60000 });

    const res = await POST(makeRequest({ prompt: 'A bathroom' }));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toBe('Rate limit exceeded. Please wait before trying again.');
    expect(decrementCredit).not.toHaveBeenCalled();
    expect(generateIdeogramImage).not.toHaveBeenCalled();
  });

  it('400 — missing prompt → bad request, no credit charged', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);

    const res = await POST(makeRequest({ style: 'photographic' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/prompt/);
    expect(generateIdeogramImage).not.toHaveBeenCalled();
    expect(decrementCredit).not.toHaveBeenCalled();
  });

  it('500 — Ideogram returns null → credit refunded', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(generateIdeogramImage).mockResolvedValue(null);

    const res = await POST(makeRequest({ prompt: 'An office space' }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/not charged/);
    expect(body.creditsRemaining).toBe(3);
    expect(refundCredit).toHaveBeenCalledTimes(1);
    expect(refundCredit).toHaveBeenCalledWith(AUTHED_USER.id);
  });

  it('500 — Ideogram throws → credit refunded', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(generateIdeogramImage).mockRejectedValue(new Error('Replicate API error'));

    const res = await POST(makeRequest({ prompt: 'A sunroom' }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/not charged/);
    expect(refundCredit).toHaveBeenCalledTimes(1);
    expect(dbModule.__mockInsert).not.toHaveBeenCalled();
    expect(trackEvent).toHaveBeenCalledWith(expect.objectContaining({ event: 'generation_failed', userId: AUTHED_USER.id }));
  });

  it('DB insert fails → 200 with saved:false and warning, imageUrl still returned', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(generateIdeogramImage).mockResolvedValue(GENERATED_URL);
    // Simulate DB insert failure
    dbModule.__mockInsert.mockImplementationOnce(() => { throw new Error('DB write failed'); });

    const res = await POST(makeRequest({ prompt: 'A cozy reading nook' }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.imageUrl).toBe(GENERATED_URL);
    expect(body.saved).toBe(false);
    expect(body.warning).toBe('Image generated but could not be saved to your gallery. Please save it manually.');
    expect(body.creditsRemaining).toBe(2);
    // The provider call succeeded and cost money — this must NOT be refunded.
    expect(refundCredit).not.toHaveBeenCalled();
  });
});
