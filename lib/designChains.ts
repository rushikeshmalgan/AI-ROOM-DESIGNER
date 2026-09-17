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

  chains.sort((a, b) => {
    const aLatest = Math.max(...a.map((d) => new Date(d.createdAt).getTime()));
    const bLatest = Math.max(...b.map((d) => new Date(d.createdAt).getTime()));
    return bLatest - aLatest;
  });

  return chains;
}
