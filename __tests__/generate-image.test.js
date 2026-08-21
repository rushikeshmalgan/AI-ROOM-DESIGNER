import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock declarations ────────────────────────────────────────────────────────

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

vi.mock('@/config/ideogramConfig', () => ({
  generateIdeogramImage: vi.fn(),
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
import { generateIdeogramImage } from '@/config/ideogramConfig';
import * as dbModule from '@/config/db';
import { deductCredit, refundCredit, checkRateLimit } from '@/lib/credits';
import { POST } from '@/app/api/generate-image/route';

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
const GENERATED_URL = 'https://example.com/generated.png';
const SAVED_DESIGN = {
  id: 10,
  userId: AUTHED_USER.id,
  originalImageUrl: GENERATED_URL,
  generatedImageUrl: GENERATED_URL,
  roomType: 'Text to Image',
  designType: 'minimalist',
};

// ── Tests ────────────────────────────────────────────────────────────────────
describe('POST /api/generate-image', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(checkRateLimit).mockResolvedValue({ success: true, remaining: 9, reset: Date.now() + 60000 });
    vi.mocked(deductCredit).mockResolvedValue({ success: true, creditsRemaining: 2 });
    vi.mocked(refundCredit).mockResolvedValue();
  });

  // ── Happy path with DB persistence ─────────────────────────────────────────
  it('happy path — authenticated, valid body → 200 with imageUrl and saved design', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(generateIdeogramImage).mockResolvedValue(GENERATED_URL);
    dbModule.__mockReturning.mockResolvedValue([SAVED_DESIGN]);

    const req = makeRequest({ prompt: 'modern living room', style: 'minimalist', aspectRatio: '16:9' });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.imageUrl).toBe(GENERATED_URL);
    expect(body.design).toEqual(SAVED_DESIGN);
    expect(body.creditsRemaining).toBe(2);
    expect(generateIdeogramImage).toHaveBeenCalledTimes(1);
    expect(deductCredit).toHaveBeenCalledWith('test@example.com', 'Test User', 'https://example.com/avatar.jpg');
    expect(dbModule.__mockInsert).toHaveBeenCalledTimes(1);
    expect(refundCredit).not.toHaveBeenCalled();
  });

  // ── 401 — Unauthenticated ──────────────────────────────────────────────────
  it('unauthenticated — currentUser() returns null → 401', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    const res = await POST(makeRequest({ prompt: 'modern living room' }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(generateIdeogramImage).not.toHaveBeenCalled();
    expect(deductCredit).not.toHaveBeenCalled();
  });

  // ── 400 — Missing prompt ───────────────────────────────────────────────────
  it('missing prompt → 400', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);

    const res = await POST(makeRequest({ style: 'minimalist' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/prompt/i);
    expect(deductCredit).not.toHaveBeenCalled();
  });

  // ── 403 — Insufficient credits ─────────────────────────────────────────────
  it('403 — credits exhausted → 403 Forbidden', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(deductCredit).mockResolvedValue({ success: false, error: 'INSUFFICIENT_CREDITS' });

    const res = await POST(makeRequest({ prompt: 'modern living room' }));
    const body = await res.json();

    expect(res.status).toBe(403);
    expect(body.error).toMatch(/Insufficient credits/i);
    expect(generateIdeogramImage).not.toHaveBeenCalled();
  });

  // ── 429 — Rate limit exceeded ──────────────────────────────────────────────
  it('429 — rate limit exceeded → too many requests', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(checkRateLimit).mockResolvedValue({ success: false, remaining: 0, reset: Date.now() + 60000 });

    const res = await POST(makeRequest({ prompt: 'modern living room' }));
    const body = await res.json();

    expect(res.status).toBe(429);
    expect(body.error).toMatch(/Rate limit exceeded/i);
    expect(generateIdeogramImage).not.toHaveBeenCalled();
  });

  // ── 500 — Generation error + refund ────────────────────────────────────────
  it('500 — Ideogram throws → 500 and refunds credit', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(generateIdeogramImage).mockRejectedValue(new Error('Ideogram API error'));

    const res = await POST(makeRequest({ prompt: 'modern living room' }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toMatch(/Failed to generate image/i);
    expect(refundCredit).toHaveBeenCalledWith('test@example.com');
  });
});
