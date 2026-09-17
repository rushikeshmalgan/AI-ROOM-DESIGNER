import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/config/db', () => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  const mockWhere = vi.fn(() => Promise.resolve());
  const mockSet = vi.fn(() => ({ where: mockWhere }));
  const mockUpdate = vi.fn(() => ({ set: mockSet }));
  return {
    db: { insert: mockInsert, update: mockUpdate },
    __mockInsert: mockInsert,
    __mockValues: mockValues,
    __mockReturning: mockReturning,
    __mockUpdate: mockUpdate,
    __mockSet: mockSet,
    __mockWhere: mockWhere,
  };
});

vi.mock('@/config/schema', () => ({
  generations: {},
}));

import * as dbModule from '@/config/db';
import { runGenerationAttempt, linkGenerationToDesign } from '@/lib/generation/generationService';

describe('runGenerationAttempt', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbModule.__mockReturning.mockResolvedValue([{ id: 7 }]);
  });

  it('records a pending->completed row and returns the provider result', async () => {
    const call = vi.fn().mockResolvedValue({ imageUrls: ['https://example.com/out.jpg'] });

    const result = await runGenerationAttempt(
      { userId: 'user_1', generationType: 'initial', provider: 'replicate-sdxl', roomType: 'Bedroom', designStyle: 'Modern' },
      call
    );

    expect(result.success).toBe(true);
    expect(result.generationId).toBe(7);
    expect(result.imageUrls).toEqual(['https://example.com/out.jpg']);
    expect(typeof result.latencyMs).toBe('number');

    // First DB call: insert with status 'processing'
    const insertedValues = dbModule.__mockValues.mock.calls[0][0];
    expect(insertedValues.status).toBe('processing');
    expect(insertedValues.userId).toBe('user_1');

    // Second DB call: update to 'completed'
    expect(dbModule.__mockUpdate).toHaveBeenCalledTimes(1);
    const updatedValues = dbModule.__mockSet.mock.calls[0][0];
    expect(updatedValues.status).toBe('completed');
    expect(updatedValues.completedAt).toBeInstanceOf(Date);
  });

  it('records a pending->failed row when the provider call throws, and returns success:false', async () => {
    const call = vi.fn().mockRejectedValue(new Error('Replicate is down'));

    const result = await runGenerationAttempt(
      { userId: 'user_1', generationType: 'refinement', provider: 'replicate-sdxl', parentDesignId: 42 },
      call
    );

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Replicate is down');
    expect(result.generationId).toBe(7);

    const updatedValues = dbModule.__mockSet.mock.calls[0][0];
    expect(updatedValues.status).toBe('failed');
    expect(updatedValues.errorMessage).toBe('Replicate is down');
  });

  it('treats a provider call that resolves with zero images as a failed attempt, not completed', async () => {
    const call = vi.fn().mockResolvedValue({ imageUrls: [] });

    const result = await runGenerationAttempt(
      { userId: 'user_1', generationType: 'initial', provider: 'replicate-sdxl' },
      call
    );

    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Provider returned no images');

    const updatedValues = dbModule.__mockSet.mock.calls[0][0];
    expect(updatedValues.status).toBe('failed');
  });

  it('still runs the provider call and returns a result even if the attempt could not be recorded', async () => {
    dbModule.__mockInsert.mockImplementationOnce(() => { throw new Error('DB down'); });
    const call = vi.fn().mockResolvedValue({ imageUrls: ['https://example.com/out.jpg'] });

    const result = await runGenerationAttempt(
      { userId: 'user_1', generationType: 'initial', provider: 'replicate-sdxl' },
      call
    );

    expect(result.success).toBe(true);
    expect(result.generationId).toBeNull();
    expect(call).toHaveBeenCalledTimes(1);
  });
});

describe('linkGenerationToDesign', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates the generation row with the resulting designId', async () => {
    await linkGenerationToDesign(7, 100);
    expect(dbModule.__mockUpdate).toHaveBeenCalledTimes(1);
    expect(dbModule.__mockSet).toHaveBeenCalledWith({ designId: 100 });
  });

  it('is a no-op when generationId is null (attempt was never recorded)', async () => {
    await linkGenerationToDesign(null, 100);
    expect(dbModule.__mockUpdate).not.toHaveBeenCalled();
  });
});
