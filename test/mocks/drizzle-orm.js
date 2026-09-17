// E2E test-mode mock for drizzle-orm's query helpers. Paired with
// test/mocks/db.js, which is the thing that actually interprets these.
//
// eq()/desc() don't build a real SQL AST — they capture a predicate
// (eq) or a sort key (desc) directly against the in-memory store that
// db.js maintains, using column object identity (via @/config/schema,
// which is NOT aliased in test mode, so these are the real column
// descriptors) to know which JS property to compare.
import { users, designs, events, generations, creditTransactions } from '@/config/schema';

const columnKeyMap = new Map();
for (const [key, col] of Object.entries(users)) columnKeyMap.set(col, key);
for (const [key, col] of Object.entries(designs)) columnKeyMap.set(col, key);
for (const [key, col] of Object.entries(events)) columnKeyMap.set(col, key);
for (const [key, col] of Object.entries(generations)) columnKeyMap.set(col, key);
for (const [key, col] of Object.entries(creditTransactions)) columnKeyMap.set(col, key);

export function eq(column, value) {
  const key = columnKeyMap.get(column);
  return { predicate: (row) => row[key] === value };
}

export function desc(column) {
  const key = columnKeyMap.get(column);
  return { key, dir: -1 };
}

export { columnKeyMap };
