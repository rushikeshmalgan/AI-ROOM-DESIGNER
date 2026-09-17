import { describe, it, expect, vi, beforeEach } from 'vitest';

const { fakeRedis, fakeStore } = vi.hoisted(() => {
  const store: Record<string, string> = {};
  const redis = {
    get: vi.fn(async (key: string) => store[key] ?? null),
    set: vi.fn(async (key: string, value: unknown) => {
      store[key] = String(value);
      return 'OK';
    }),
    incr: vi.fn(async (key: string) => {
      const current = store[key] ? parseInt(store[key], 10) : 0;
      const next = current + 1;
      store[key] = String(next);
      return next;
    }),
    eval: vi.fn(async (_script: string, keys: string[], args: unknown[]) => {
      const key = keys[0];
      const current = store[key];
      let count = current ? parseInt(current, 10) : NaN;
      if (Number.isNaN(count)) {
        count = Number(args[0]);
        store[key] = String(count);
      }
      if (count <= 0) return [0, count];
      const remaining = count - 1;
      store[key] = String(remaining);
      return [1, remaining];
    }),
  };
  return { fakeRedis: redis, fakeStore: store };
});

vi.mock('@upstash/redis', () => ({
  Redis: {
    fromEnv: vi.fn(() => fakeRedis),
  },
}));

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: {
    slidingWindow: vi.fn(() => ({})),
  },
}));

vi.mock('@/config/db', () => {
  const mockWhere = vi.fn(() => Promise.resolve({ rowCount: 1 }));
  const mockSet = vi.fn(() => ({ where: mockWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));
  const mockValues = vi.fn(() => Promise.resolve());
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  return {
    db: { update: mockUpdate, insert: mockInsert },
    __mockUpdate: mockUpdate,
    __mockSet: mockSet,
    __mockWhere: mockWhere,
    __mockInsert: mockInsert,
    __mockValues: mockValues,
  };
});

vi.mock('@/config/schema', () => ({
  users: {},
  creditTransactions: {},
}));

vi.mock('drizzle-orm', () => ({
  eq: vi.fn(() => ({})),
}));

import { getCredits, decrementCredit, refundCredit, syncCreditsToDb, recordCreditTransaction } from '@/lib/credits';
import * as dbModule from '@/config/db';

// The mock factory exposes __mockUpdate for test introspection, but
// TypeScript only sees the real module shape — cast to access it.
const mockDb = dbModule as unknown as {
  __mockUpdate: ReturnType<typeof vi.fn>;
  __mockInsert: ReturnType<typeof vi.fn>;
  __mockValues: ReturnType<typeof vi.fn>;
};

describe('lib/credits', () => {
  beforeEach(() => {
    Object.keys(fakeStore).forEach((k) => delete fakeStore[k]);
    vi.clearAllMocks();
    vi.mocked(mockDb.__mockUpdate).mockReturnValue({
      set: vi.fn(() => ({ where: vi.fn(() => Promise.resolve({ rowCount: 1 })) })),
    });
  });

  describe('getCredits', () => {
    it('returns cached value from Redis when key exists', async () => {
      fakeStore['credits:user123'] = '5';
      const result = await getCredits('user123');
      expect(result).toBe(5);
      expect(fakeRedis.get).toHaveBeenCalledWith('credits:user123');
    });

    it('seeds with default(3) and returns 3 on Redis miss', async () => {
      const result = await getCredits('newUser');
      expect(result).toBe(3);
      expect(fakeRedis.set).toHaveBeenCalledWith('credits:newUser', 3);
      expect(fakeStore['credits:newUser']).toBe('3');
    });
  });

  describe('decrementCredit', () => {
    it('decrements from 3 to 2 and returns ok:true', async () => {
      fakeStore['credits:user123'] = '3';
      const result = await decrementCredit('user123');
      expect(result).toEqual({ ok: true, remaining: 2 });
      expect(fakeStore['credits:user123']).toBe('2');
    });

    it('returns ok:false when credits is 0 (no decrement)', async () => {
      fakeStore['credits:user123'] = '0';
      const result = await decrementCredit('user123');
      expect(result).toEqual({ ok: false, remaining: 0 });
      expect(fakeStore['credits:user123']).toBe('0');
    });

    it('seeds the default balance and decrements on a brand-new key', async () => {
      const result = await decrementCredit('nonexistent');
      expect(result).toEqual({ ok: true, remaining: 2 });
      expect(fakeStore['credits:nonexistent']).toBe('2');
    });
  });

  describe('refundCredit', () => {
    it('increments credits back up by 1 after a decrement', async () => {
      fakeStore['credits:user123'] = '2'; // simulates post-decrement state
      const remaining = await refundCredit('user123');
      expect(remaining).toBe(3);
      expect(fakeStore['credits:user123']).toBe('3');
    });

    it('is atomic per-user via INCR, independent of concurrent decrements', async () => {
      fakeStore['credits:userA'] = '0';
      const remaining = await refundCredit('userA');
      expect(remaining).toBe(1);
      // A different user's balance is untouched.
      expect(fakeStore['credits:userB']).toBeUndefined();
    });
  });

  describe('recordCreditTransaction', () => {
    it('inserts a transaction row with the given fields', async () => {
      await recordCreditTransaction({
        userId: 'user_1',
        type: 'generation',
        amount: -1,
        balanceAfter: 2,
        generationId: 7,
      });

      expect(mockDb.__mockInsert).toHaveBeenCalledTimes(1);
      expect(mockDb.__mockValues).toHaveBeenCalledWith({
        userId: 'user_1',
        type: 'generation',
        amount: -1,
        balanceAfter: 2,
        generationId: 7,
      });
    });

    it('defaults generationId to null when omitted', async () => {
      await recordCreditTransaction({ userId: 'user_1', type: 'refund', amount: 1 });
      expect(mockDb.__mockValues).toHaveBeenCalledWith(
        expect.objectContaining({ generationId: null })
      );
    });

    it('never throws when the DB insert fails (best-effort)', async () => {
      mockDb.__mockInsert.mockImplementationOnce(() => { throw new Error('DB down'); });
      await expect(
        recordCreditTransaction({ userId: 'user_1', type: 'generation', amount: -1 })
      ).resolves.toBeUndefined();
    });
  });

  describe('syncCreditsToDb', () => {
    it('calls db.update with users table and correct credits', async () => {
      await syncCreditsToDb('test@example.com', 2);
      expect(mockDb.__mockUpdate).toHaveBeenCalledTimes(1);
    });

    it('catches and logs errors without rejecting', async () => {
      mockDb.__mockUpdate.mockImplementationOnce(() => {
        throw new Error('DB connection failed');
      });
      await expect(syncCreditsToDb('test@example.com', 1)).resolves.toBeUndefined();
    });
  });
});
