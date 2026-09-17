import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

vi.mock('@/config/replicateConfig', () => ({
  refineRoomDesign: vi.fn(),
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
  designs: {},
  users: {},
}));

vi.mock('@/lib/credits', () => ({
  decrementCredit: vi.fn(),
  checkRateLimit: vi.fn(),
  syncCreditsToDb: vi.fn(),
  refundCredit: vi.fn(),
}));

import { currentUser } from '@clerk/nextjs/server';
import { refineRoomDesign } from '@/config/replicateConfig';
import * as dbModule from '@/config/db';
import { decrementCredit, checkRateLimit, refundCredit } from '@/lib/credits';
import { POST } from '@/app/api/designs/[id]/refine/route';

function makeRequest(body) {
  return { json: async () => body };
}

function ctx(id) {
  return { params: Promise.resolve({ id }) };
}

const OWNER = { id: 'user_clerk_owner', primaryEmailAddress: { emailAddress: 'owner@example.com' } };
const OTHER_USER = { id: 'user_clerk_other', primaryEmailAddress: { emailAddress: 'other@example.com' } };

const PARENT_DESIGN = {
  id: 42,
  userId: OWNER.id,
  originalImageUrl: 'https://res.cloudinary.com/original.jpg',
  generatedImageUrl: 'https://replicate.delivery/v1.jpg',
  roomType: 'living room',
  designType: 'Scandinavian',
  parentDesignId: null,
};

const REFINED_URL = 'https://replicate.delivery/v2.jpg';

describe('POST /api/designs/:id/refine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 60000 });
    vi.mocked(decrementCredit).mockResolvedValue({ ok: true, remaining: 2 });
    vi.mocked(refundCredit).mockResolvedValue(3);
    // First __mockWhere call in most tests is the clerkId backfill select
    // (empty = no existing row), second is the parent-design lookup.
    dbModule.__mockWhere
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([PARENT_DESIGN]);
  });

  it('happy path — owner refines their design → 200, uses previous image as source, parentDesignId set', async () => {
    vi.mocked(currentUser).mockResolvedValue(OWNER);
    vi.mocked(refineRoomDesign).mockResolvedValue([REFINED_URL]);
    dbModule.__mockReturning.mockResolvedValue([{ ...PARENT_DESIGN, id: 43, generatedImageUrl: REFINED_URL, parentDesignId: 42 }]);

    const res = await POST(makeRequest({ instruction: 'Change the sofa to a beige sectional' }), ctx('42'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.generatedImageUrl).toBe(REFINED_URL);
    expect(body.parentDesignId).toBe(42);
    expect(body.creditsRemaining).toBe(2);

    expect(refineRoomDesign).toHaveBeenCalledWith({
      sourceImageUrl: PARENT_DESIGN.generatedImageUrl, // the previous generation, not the original photo
      roomType: PARENT_DESIGN.roomType,
      designStyle: PARENT_DESIGN.designType,
      instruction: 'Change the sofa to a beige sectional',
    });

    const insertedValues = dbModule.__mockValues.mock.calls[0][0];
    expect(insertedValues.parentDesignId).toBe(42);
    expect(insertedValues.originalImageUrl).toBe(PARENT_DESIGN.originalImageUrl);
  });

  it('unauthenticated — 401, nothing touched', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    const res = await POST(makeRequest({ instruction: 'Change the sofa' }), ctx('42'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(refineRoomDesign).not.toHaveBeenCalled();
    expect(decrementCredit).not.toHaveBeenCalled();
  });

  it('invalid design ID (non-numeric) → 400', async () => {
    vi.mocked(currentUser).mockResolvedValue(OWNER);

    const res = await POST(makeRequest({ instruction: 'Change the sofa' }), ctx('not-a-number'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Invalid design ID/);
    expect(decrementCredit).not.toHaveBeenCalled();
  });

  it('429 — rate limited → no credit touched', async () => {
    vi.mocked(currentUser).mockResolvedValue(OWNER);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 60000 });

    const res = await POST(makeRequest({ instruction: 'Change the sofa' }), ctx('42'));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(decrementCredit).not.toHaveBeenCalled();
    expect(refineRoomDesign).not.toHaveBeenCalled();
  });

  it('missing instruction → 400, no credit charged', async () => {
    vi.mocked(currentUser).mockResolvedValue(OWNER);

    const res = await POST(makeRequest({}), ctx('42'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/instruction/);
    expect(decrementCredit).not.toHaveBeenCalled();
  });

  it('empty/whitespace-only instruction → 400', async () => {
    vi.mocked(currentUser).mockResolvedValue(OWNER);

    const res = await POST(makeRequest({ instruction: '   ' }), ctx('42'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/instruction/);
    expect(decrementCredit).not.toHaveBeenCalled();
  });

  it('oversized instruction → 400, no credit charged', async () => {
    vi.mocked(currentUser).mockResolvedValue(OWNER);
    const longInstruction = 'x'.repeat(301);

    const res = await POST(makeRequest({ instruction: longInstruction }), ctx('42'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/300 characters/);
    expect(decrementCredit).not.toHaveBeenCalled();
  });

  it('nonexistent design → 404, no credit charged', async () => {
    vi.mocked(currentUser).mockResolvedValue(OWNER);
    dbModule.__mockWhere.mockReset();
    dbModule.__mockWhere
      .mockResolvedValueOnce([]) // clerkId backfill select
      .mockResolvedValueOnce([]); // parent lookup: not found

    const res = await POST(makeRequest({ instruction: 'Change the sofa' }), ctx('9999'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Design not found');
    expect(decrementCredit).not.toHaveBeenCalled();
    expect(refineRoomDesign).not.toHaveBeenCalled();
  });

  it("another user's design → 404 (not 403), never reveals it exists, no credit charged", async () => {
    vi.mocked(currentUser).mockResolvedValue(OTHER_USER);
    // PARENT_DESIGN.userId belongs to OWNER, not OTHER_USER

    const res = await POST(makeRequest({ instruction: 'Change the sofa' }), ctx('42'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Design not found');
    expect(decrementCredit).not.toHaveBeenCalled();
    expect(refineRoomDesign).not.toHaveBeenCalled();
  });

  it('402 — insufficient credits → Payment Required', async () => {
    vi.mocked(currentUser).mockResolvedValue(OWNER);
    vi.mocked(decrementCredit).mockResolvedValue({ ok: false, remaining: 0 });

    const res = await POST(makeRequest({ instruction: 'Change the sofa' }), ctx('42'));
    const body = await res.json();

    expect(res.status).toBe(402);
    expect(refineRoomDesign).not.toHaveBeenCalled();
  });

  it('Replicate throws during refinement → 500, credit refunded', async () => {
    vi.mocked(currentUser).mockResolvedValue(OWNER);
    vi.mocked(refineRoomDesign).mockRejectedValue(new Error('Replicate API error'));

    const res = await POST(makeRequest({ instruction: 'Change the sofa' }), ctx('42'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/not charged/);
    expect(refundCredit).toHaveBeenCalledWith(OWNER.id);
    expect(dbModule.__mockInsert).not.toHaveBeenCalled();
  });

  it('Replicate returns empty array → 500, credit refunded', async () => {
    vi.mocked(currentUser).mockResolvedValue(OWNER);
    vi.mocked(refineRoomDesign).mockResolvedValue([]);

    const res = await POST(makeRequest({ instruction: 'Change the sofa' }), ctx('42'));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/not charged/);
    expect(refundCredit).toHaveBeenCalledTimes(1);
  });

  it('DB insert fails after successful refinement → 200, saved:false, no refund', async () => {
    vi.mocked(currentUser).mockResolvedValue(OWNER);
    vi.mocked(refineRoomDesign).mockResolvedValue([REFINED_URL]);
    dbModule.__mockInsert.mockImplementationOnce(() => { throw new Error('DB write failed'); });

    const res = await POST(makeRequest({ instruction: 'Change the sofa' }), ctx('42'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.saved).toBe(false);
    expect(body.warning).toMatch(/could not be saved/);
    expect(refundCredit).not.toHaveBeenCalled();
  });
});
