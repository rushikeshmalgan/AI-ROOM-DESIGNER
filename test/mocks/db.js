// E2E test-mode mock for @/config/db — an in-memory store, not a real
// Postgres connection. It only needs to support the exact query shapes
// this codebase actually issues (enumerated in the Vitest route tests),
// not general Drizzle semantics. State lives for the lifetime of the
// `next dev`/`next start` process the E2E run boots — see
// __resetTestDb()/__seedTestDb() below if a spec needs a clean slate.
import { users, designs, events, generations, creditTransactions } from '@/config/schema';

// Duplicated (not imported) from drizzle-orm.js: NormalModuleReplacementPlugin
// swaps the resolved resource for config/db.ts but doesn't preserve this
// module's own directory as the base for further relative resolution, so a
// relative import back to a sibling mock file fails to resolve. Small
// enough to just rebuild here rather than fight that.
const columnKeyMap = new Map();
for (const [key, col] of Object.entries(users)) columnKeyMap.set(col, key);
for (const [key, col] of Object.entries(designs)) columnKeyMap.set(col, key);
for (const [key, col] of Object.entries(events)) columnKeyMap.set(col, key);
for (const [key, col] of Object.entries(generations)) columnKeyMap.set(col, key);
for (const [key, col] of Object.entries(creditTransactions)) columnKeyMap.set(col, key);

const TABLES = new Map([
  [users, 'users'],
  [designs, 'designs'],
  [events, 'events'],
  [generations, 'generations'],
  [creditTransactions, 'creditTransactions'],
]);

let stores = { users: [], designs: [], events: [], generations: [], creditTransactions: [] };
let nextIds = { users: 1, designs: 1, events: 1, generations: 1, creditTransactions: 1 };

export function __resetTestDb() {
  stores = { users: [], designs: [], events: [], generations: [], creditTransactions: [] };
  nextIds = { users: 1, designs: 1, events: 1, generations: 1, creditTransactions: 1 };
}

export function __seedTestDb(seed = {}) {
  for (const key of Object.keys(stores)) {
    if (seed[key]) stores[key] = seed[key];
  }
}

function tableKey(table) {
  return TABLES.get(table) ?? 'designs'; // unrecognized table objects fall back rather than throw
}

function storeFor(table) {
  return stores[tableKey(table)];
}

function nextIdFor(table) {
  const key = tableKey(table);
  return nextIds[key]++;
}

function applyWhere(rows, condition) {
  return condition ? rows.filter(condition.predicate) : rows;
}

function project(row, projection) {
  if (!projection) return { ...row };
  const out = {};
  for (const [outKey, column] of Object.entries(projection)) {
    out[outKey] = row[columnKeyMap.get(column)];
  }
  return out;
}

function whereResult(rows) {
  // Awaitable directly (`await ...where(cond)`), but also exposes
  // .orderBy() for the one call site that chains it
  // (GET /api/designs) — attaching a method to a Promise instance is
  // unusual but valid, and keeps this mock's shape matching real
  // Drizzle's chainable builder without reimplementing it.
  const promise = Promise.resolve(rows);
  promise.orderBy = (orderCond) => {
    const sorted = [...rows].sort((a, b) => {
      const av = a[orderCond.key];
      const bv = b[orderCond.key];
      if (av < bv) return -orderCond.dir;
      if (av > bv) return orderCond.dir;
      return 0;
    });
    return Promise.resolve(sorted);
  };
  return promise;
}

export const db = {
  select(projection) {
    return {
      from(table) {
        return {
          where(condition) {
            const filtered = applyWhere(storeFor(table), condition).map((r) => project(r, projection));
            return whereResult(filtered);
          },
        };
      },
    };
  },

  insert(table) {
    return {
      values(valuesObj) {
        let conflictTarget = null;
        let inserted = false;

        function doInsert(projection) {
          if (inserted) return Promise.resolve([]); // defensive: never double-insert
          inserted = true;
          const store = storeFor(table);
          if (conflictTarget) {
            const key = columnKeyMap.get(conflictTarget);
            if (store.some((r) => r[key] === valuesObj[key])) {
              return Promise.resolve([]); // ON CONFLICT DO NOTHING
            }
          }
          const row = { id: nextIdFor(table), createdAt: new Date(), ...valuesObj };
          store.push(row);
          return Promise.resolve([project(row, projection)]);
        }

        return {
          onConflictDoNothing({ target } = {}) {
            conflictTarget = target;
            return { returning: (projection) => doInsert(projection) };
          },
          returning(projection) {
            return doInsert(projection);
          },
          // Real Drizzle's `.values()` result is itself awaitable when
          // no `.returning()`/`.onConflictDoNothing()` follows (e.g.
          // trackEvent's and recordCreditTransaction's bare inserts) —
          // without this, `await db.insert(x).values(y)` alone would
          // resolve to this plain object without ever performing the
          // insert.
          then(resolve, reject) {
            return doInsert(undefined).then(resolve, reject);
          },
        };
      },
    };
  },

  update(table) {
    return {
      set(patch) {
        return {
          where(condition) {
            const matched = applyWhere(storeFor(table), condition);
            matched.forEach((row) => Object.assign(row, patch));
            return Promise.resolve({ rowCount: matched.length });
          },
        };
      },
    };
  },
};
