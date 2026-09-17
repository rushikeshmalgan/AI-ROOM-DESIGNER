import { describe, it, expect } from 'vitest';
import { buildDesignChains } from '@/lib/designChains';

function d(id, parentDesignId, createdAt) {
  return { id, parentDesignId, createdAt };
}

describe('buildDesignChains', () => {
  it('puts unrelated designs in their own single-item chains', () => {
    const chains = buildDesignChains([
      d(1, null, '2024-01-01T00:00:00Z'),
      d(2, null, '2024-01-02T00:00:00Z'),
    ]);
    expect(chains).toHaveLength(2);
    expect(chains.every((c) => c.length === 1)).toBe(true);
  });

  it('groups a root and its refinements into one chain, ordered root-first', () => {
    const chains = buildDesignChains([
      d(2, 1, '2024-01-02T00:00:00Z'), // v1 (refinement of 1)
      d(1, null, '2024-01-01T00:00:00Z'), // root, fed in out of order
      d(3, 2, '2024-01-03T00:00:00Z'), // v2 (refinement of v1)
    ]);
    expect(chains).toHaveLength(1);
    expect(chains[0].map((x) => x.id)).toEqual([1, 2, 3]);
  });

  it('orders chains by most recent activity, newest first', () => {
    const chains = buildDesignChains([
      d(1, null, '2024-01-01T00:00:00Z'), // old, untouched chain
      d(10, null, '2024-01-05T00:00:00Z'),
      d(11, 10, '2024-01-06T00:00:00Z'), // refined recently
    ]);
    expect(chains[0].map((x) => x.id)).toEqual([10, 11]);
    expect(chains[1].map((x) => x.id)).toEqual([1]);
  });

  it('does not infinite-loop on a corrupted self-referencing parentDesignId', () => {
    const chains = buildDesignChains([
      d(1, 1, '2024-01-01T00:00:00Z'),
    ]);
    expect(chains).toHaveLength(1);
    expect(chains[0].map((x) => x.id)).toEqual([1]);
  });

  it('treats a parentDesignId pointing outside the given list as its own root', () => {
    const chains = buildDesignChains([
      d(5, 999, '2024-01-01T00:00:00Z'), // parent 999 not in this list
    ]);
    expect(chains).toHaveLength(1);
    expect(chains[0].map((x) => x.id)).toEqual([5]);
  });
});
