import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@clerk/nextjs/server', () => ({
  currentUser: vi.fn(),
}));

vi.mock('@/config/db', () => {
  const mockWhere = vi.fn(() => Promise.resolve([]));
  const mockSet = vi.fn(() => ({ where: mockWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  return {
    db: { select: mockSelect, update: mockUpdate },
    __mockSelect: mockSelect,
    __mockFrom: mockFrom,
    __mockWhere: mockWhere,
    __mockUpdate: mockUpdate,
    __mockSet: mockSet,
  };
});

vi.mock('@/config/schema', () => ({
  designs: {},
}));

import { currentUser } from '@clerk/nextjs/server';
import * as dbModule from '@/config/db';
import { POST } from '@/app/api/designs/[id]/share/route';

function makeRequest() {
  return {};
}

function ctx(id) {
  return { params: Promise.resolve({ id }) };
}

const OWNER = { id: 'user_clerk_owner' };
const OTHER_USER = { id: 'user_clerk_other' };

const PRIVATE_DESIGN = {
  id: 42,
  userId: OWNER.id,
  roomType: 'living room',
  designType: 'Scandinavian',
  isPublic: false,
};

describe('POST /api/designs/:id/share', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbModule.__mockWhere.mockResolvedValue([PRIVATE_DESIGN]);
  });

  it('owner shares their private design → 200, marks it public, returns the share URL', async () => {
    vi.mocked(currentUser).mockResolvedValue(OWNER);

    const res = await POST(makeRequest(), ctx('42'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.shareUrl).toBe('/share/42');
    expect(dbModule.__mockUpdate).toHaveBeenCalledTimes(1);
    expect(dbModule.__mockSet).toHaveBeenCalledWith({ isPublic: true });
  });

  it('is idempotent — sharing an already-public design does not re-issue an update', async () => {
    vi.mocked(currentUser).mockResolvedValue(OWNER);
    dbModule.__mockWhere.mockResolvedValue([{ ...PRIVATE_DESIGN, isPublic: true }]);

    const res = await POST(makeRequest(), ctx('42'));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.shareUrl).toBe('/share/42');
    expect(dbModule.__mockUpdate).not.toHaveBeenCalled();
  });

  it('unauthenticated → 401', async () => {
    vi.mocked(currentUser).mockResolvedValue(null);

    const res = await POST(makeRequest(), ctx('42'));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe('Unauthorized');
    expect(dbModule.__mockUpdate).not.toHaveBeenCalled();
  });

  it('invalid design ID → 400', async () => {
    vi.mocked(currentUser).mockResolvedValue(OWNER);

    const res = await POST(makeRequest(), ctx('not-a-number'));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toMatch(/Invalid design ID/);
  });

  it('nonexistent design → 404', async () => {
    vi.mocked(currentUser).mockResolvedValue(OWNER);
    dbModule.__mockWhere.mockResolvedValue([]);

    const res = await POST(makeRequest(), ctx('9999'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Design not found');
  });

  it("another user's design → 404 (not 403), never reveals it exists", async () => {
    vi.mocked(currentUser).mockResolvedValue(OTHER_USER);
    // PRIVATE_DESIGN.userId belongs to OWNER, not OTHER_USER

    const res = await POST(makeRequest(), ctx('42'));
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error).toBe('Design not found');
    expect(dbModule.__mockUpdate).not.toHaveBeenCalled();
  });
});
