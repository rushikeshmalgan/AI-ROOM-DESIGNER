import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/db', () => {
  const mockValues = vi.fn(() => Promise.resolve());
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  return { db: { insert: mockInsert }, __mockInsert: mockInsert, __mockValues: mockValues };
});

vi.mock('@/config/schema', () => ({ events: {} }));

import { trackEvent } from '@/lib/analytics';
import * as dbModule from '@/config/db';

describe('lib/analytics trackEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts an event row with the given event name, userId, and properties', async () => {
    await trackEvent({ event: 'landing_view', userId: 'user_1', properties: { foo: 'bar' } });

    expect(dbModule.__mockInsert).toHaveBeenCalledTimes(1);
    expect(dbModule.__mockValues).toHaveBeenCalledWith({
      userId: 'user_1',
      event: 'landing_view',
      properties: { foo: 'bar' },
    });
  });

  it('defaults userId and properties to null when omitted', async () => {
    await trackEvent({ event: 'signup' });

    expect(dbModule.__mockValues).toHaveBeenCalledWith({
      userId: null,
      event: 'signup',
      properties: null,
    });
  });

  it('never throws when the DB insert fails (best-effort, like syncCreditsToDb)', async () => {
    dbModule.__mockValues.mockImplementationOnce(() => {
      throw new Error('DB down');
    });

    await expect(trackEvent({ event: 'landing_view' })).resolves.toBeUndefined();
  });
});
