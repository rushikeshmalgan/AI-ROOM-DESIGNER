/**
 * Tests for POST /api/generate-design
 *
 * Mocked dependencies (zero real network calls):
 *   - @clerk/nextjs/server  → currentUser
 *   - @/config/replicateConfig → generateRoomDesign
 *   - @/config/db              → db (insert chain)
 *   - @/config/schema          → designs (passed through to the route)
 *
 * NOTE ON MOCK STRUCTURE: Vitest hoists vi.mock() calls above variable
 * declarations, so mock function references must be defined inside the
 * factory (not as top-level const) and retrieved via vi.mocked() after import.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mock declarations ────────────────────────────────────────────────────────
// All vi.mock calls are hoisted by Vitest — factories run before any imports.

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

vi.mock('@/config/replicateConfig', () => ({
  generateRoomDesign: vi.fn(),
}));

// The route calls: db.insert(designs).values({...}).returning()
// We build the chain entirely inside the factory so there's no
// "before initialization" reference from the hoisted mock.
vi.mock('@/config/db', () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  return {
    db: { insert: mockInsert },
    // expose the inner spies so tests can reset/inspect them
    __mockInsert: mockInsert,
    __mockValues: mockValues,
    __mockReturning: mockReturning,
  };
});

vi.mock('@/config/schema', () => ({
  designs: {},
  users: {},
}));

// ── Imports (after mocks) ────────────────────────────────────────────────────
import { currentUser } from '@clerk/nextjs/server';
import { generateRoomDesign } from '@/config/replicateConfig';
import * as dbModule from '@/config/db';
import { POST } from '@/app/api/generate-design/route.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(body) {
  return { json: async () => body };
}

const AUTHED_USER = { id: 'user_clerk_123', email: 'test@example.com' };
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
  });

  // ── Happy path ─────────────────────────────────────────────────────────────
  it('happy path — authenticated, valid body → 200 with success:true', async () => {
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

    expect(generateRoomDesign).toHaveBeenCalledWith({
      imageUrl: SAVED_DESIGN.originalImageUrl,
      roomType: 'living room',
      designStyle: 'Scandinavian',
      additionalRequirements: undefined,
    });
    expect(dbModule.__mockInsert).toHaveBeenCalledTimes(1);
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
    expect(generateRoomDesign).not.toHaveBeenCalled();
    expect(dbModule.__mockInsert).not.toHaveBeenCalled();
  });

  // ── 400 — missing imageUrl ─────────────────────────────────────────────────
  it('missing imageUrl → 400', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);

    const res = await POST(makeRequest({ roomType: 'kitchen', designType: 'Industrial' }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/imageUrl/);
    expect(generateRoomDesign).not.toHaveBeenCalled();
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
  });

  // ── 500 — Replicate returns empty array ────────────────────────────────────
  it('Replicate returns empty array → 500 "Failed to generate design"', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(generateRoomDesign).mockResolvedValue([]);

    const res = await POST(makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'living room',
      designType: 'Bohemian',
    }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to generate design');
    expect(dbModule.__mockInsert).not.toHaveBeenCalled();
  });

  // ── 500 — Replicate returns null ───────────────────────────────────────────
  it('Replicate returns null → 500 "Failed to generate design"', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(generateRoomDesign).mockResolvedValue(null);

    const res = await POST(makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'bedroom',
      designType: 'Coastal',
    }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to generate design');
  });

  // ── 500 — Replicate throws ─────────────────────────────────────────────────
  it('Replicate throws → 500 "Failed to generate room design"', async () => {
    vi.mocked(currentUser).mockResolvedValue(AUTHED_USER);
    vi.mocked(generateRoomDesign).mockRejectedValue(new Error('Replicate API error'));

    const res = await POST(makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'office',
      designType: 'Mid-Century Modern',
    }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe('Failed to generate room design');
  });

  // ── credits audit test ─────────────────────────────────────────────────────
  it('AUDIT: no credits check — user with no credits field still gets 200', async () => {
    // Documents the confirmed limitation: credits are never read server-side.
    // A user object with no credits property still produces a successful generation.
    vi.mocked(currentUser).mockResolvedValue({ id: 'user_no_credits' });
    vi.mocked(generateRoomDesign).mockResolvedValue([GENERATED_URL]);
    dbModule.__mockReturning.mockResolvedValue([{ ...SAVED_DESIGN, userId: 'user_no_credits' }]);

    const res = await POST(makeRequest({
      imageUrl: 'https://example.com/room.jpg',
      roomType: 'bathroom',
      designType: 'Modern',
    }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(generateRoomDesign).toHaveBeenCalledTimes(1);
  });
});
