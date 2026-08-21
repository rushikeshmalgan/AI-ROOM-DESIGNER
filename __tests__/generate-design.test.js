import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock declarations ────────────────────────────────────────────────────────

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

vi.mock('@/config/replicateConfig', () => ({
  generateRoomDesign: vi.fn(),
}));

vi.mock('@/config/db', () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  return {
    db: { insert: mockInsert },
    __mockInsert: mockInsert,
    __mockValues: mockValues,
    __mockReturning: mockReturning,
  };
});

vi.mock('@/config/schema', () => ({
  designs: {},
  users: {},
}));

vi.mock('@/lib/credits', () => ({
  deductCredit: vi.fn(),
  refundCredit: vi.fn(),
  checkRateLimit: vi.fn(),
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────
import { currentUser } from '@clerk/nextjs/server';
import { generateRoomDesign } from '@/config/replicateConfig';
import * as dbModule from '@/config/db';
import { deductCredit, refundCredit, checkRateLimit } from '@/lib/credits';
import { POST } from '@/app/api/generate-design/route';

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(body) {
  return { json: async () => body };
}

const AUTHED_USER = {
  id: 'user_clerk_123',
  fullName: 'Test User',
  imageUrl: 'https://example.com/avatar.jpg',
  primaryEmailAddress: { emailAddress: 'test@example.com' },
};
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
    vi.mocked(deductCredit).mockResolvedValue({ success: true, creditsRemaining: 2 });
    vi.mocked(refundCredit).mockResolvedValue();
  });

  // ── Happy path ─────────────────────────────────────────────────────────────
  it('happy path — authenticated, credits available, valid body → 200 with success:true', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(generateRoomDesign).mockResolvedValue([GENERATED_URL]);
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

    expect(deductCredit).toHaveBeenCalledWith('test@example.com', 'Test User', 'https://example.com/avatar.jpg');
    expect(generateRoomDesign).toHaveBeenCalledWith({
      imageUrl: SAVED_DESIGN.originalImageUrl,
      roomType: 'living room',
      designStyle: 'Scandinavian',
      additionalRequirements: undefined,
    });
    expect(dbModule.__mockInsert).toHaveBeenCalledTimes(1);
    expect(refundCredit).not.toHaveBeenCalled();
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
    expect(deductCredit).not.toHaveBeenCalled();
    expect(generateRoomDesign).not.toHaveBeenCalled();
  });

  // ── 429 — rate limit exceeded ──────────────────────────────────────────────
  it('rate limit exceeded → 429', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 30000 });

    const req = makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'bedroom',
      designType: 'Minimalist',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toMatch(/Rate limit exceeded/i);
    expect(deductCredit).not.toHaveBeenCalled();
  });

  // ── 403 — 0 credits available ──────────────────────────────────────────────
  it('insufficient credits (0 credits) → 403 and does NOT call Replicate', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(deductCredit).mockResolvedValue({ success: false, error: 'INSUFFICIENT_CREDITS' });

    const req = makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'bedroom',
      designType: 'Minimalist',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toMatch(/Insufficient credits/i);
    expect(generateRoomDesign).not.toHaveBeenCalled();
    expect(dbModule.__mockInsert).not.toHaveBeenCalled();
  });

  // ── 400 — missing required fields ──────────────────────────────────────────
  it('missing imageUrl → 400 and does NOT deduct credit', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);

    const res = await POST(makeRequest({ roomType: 'kitchen', designType: 'Industrial' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/imageUrl/);
    expect(deductCredit).not.toHaveBeenCalled();
    expect(generateRoomDesign).not.toHaveBeenCalled();
  });

  // ── 500 & Refund — Replicate fails ─────────────────────────────────────────
  it('Replicate fails → 500 and refunds the deducted credit', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(generateRoomDesign).mockRejectedValue(new Error('Replicate GPU timeout'));

    const req = makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'office',
      designType: 'Modern',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/Failed to generate/i);
    expect(deductCredit).toHaveBeenCalledTimes(1);
    expect(refundCredit).toHaveBeenCalledWith('test@example.com');
  });

  // ── 500 & Refund — Replicate returns empty ─────────────────────────────────
  it('Replicate returns empty array → 500 and refunds the credit', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(generateRoomDesign).mockResolvedValue([]);

    const req = makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'living room',
      designType: 'Bohemian',
    });

    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(refundCredit).toHaveBeenCalledWith('test@example.com');
  });
});
