export interface ChainableDesign {
  id: number | string;
  parentDesignId: number | string | null;
  createdAt: string | Date;
  [key: string]: unknown;
}

// Groups a flat list of designs into version chains (original -> v1 ->
// v2 -> ...) using parentDesignId, without needing a tree UI: each
// chain is just an array ordered root-first. Groups are ordered by
// their most recent activity (any version in the chain), newest first.
export function buildDesignChains<T extends ChainableDesign>(designList: T[]): T[][] {
  const byId = new Map<T['id'], T>();
  for (const design of designList) {
    byId.set(design.id, design);
  }

  const rootIdOf = (design: T): T['id'] => {
    let current = design;
    const seen = new Set<T['id']>();
    while (current.parentDesignId != null && byId.has(current.parentDesignId) && !seen.has(current.id)) {
      seen.add(current.id);
      current = byId.get(current.parentDesignId)!;
    }
    return current.id;
  };

  const groups = new Map<T['id'], T[]>();
  for (const design of designList) {
    const rootId = rootIdOf(design);
    const group = groups.get(rootId) ?? [];
    group.push(design);
    groups.set(rootId, group);
  }

  const chains = Array.from(groups.values()).map((group) =>
    [...group].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
  );

  // Sort comparators run O(m log m) times for m chains — computing each
  // chain's latest timestamp inside the comparator recomputed it on every
  // comparison instead of once. Decorate-sort-undecorate: compute each
  // chain's key exactly once (O(n) total across all chains, since a
  // chain's latest is always its last element post-sort-above), then sort
  // the precomputed keys.
  return chains
    .map((chain) => ({ chain, latest: new Date(chain[chain.length - 1].createdAt).getTime() }))
    .sort((a, b) => b.latest - a.latest)
    .map(({ chain }) => chain);
}
