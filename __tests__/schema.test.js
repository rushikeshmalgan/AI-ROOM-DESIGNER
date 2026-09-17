/**
 * Schema shape tests.
 *
 * These assertions do NOT connect to any database. They inspect the Drizzle
 * column descriptor objects that drizzle-orm exposes at import time, so they
 * run entirely in-process with zero network calls.
 *
 * Column descriptor fields checked:
 *   - dataType   : the drizzle-internal type string ('serial', 'integer', etc.)
 *   - notNull    : boolean mirroring .notNull() / nullable
 *   - hasDefault : boolean (true when .default() or .defaultNow() is present)
 *   - columnType : maps to the pg-core column class name
 */

import { describe, it, expect } from 'vitest';
import { users, designs, generations, creditTransactions } from '@/config/schema';

// Helpers to pull the raw column config drizzle exposes.
function col(table, name) {
  return table[name];
}

// --------------------------------------------------------------------------
// users table
// --------------------------------------------------------------------------
describe('schema: users table', () => {
  it('has correct column names', () => {
    const cols = Object.keys(users);
    expect(cols).toEqual(expect.arrayContaining(['id', 'name', 'email', 'imageUrl', 'credits', 'clerkId']));
  });

  it('id — serial primary key', () => {
    const c = col(users, 'id');
    expect(c.columnType).toBe('PgSerial');
    expect(c.primary).toBe(true);
  });

  it('name — varchar, notNull', () => {
    const c = col(users, 'name');
    expect(c.columnType).toBe('PgVarchar');
    expect(c.notNull).toBe(true);
  });

  it('email — varchar, notNull', () => {
    const c = col(users, 'email');
    expect(c.columnType).toBe('PgVarchar');
    expect(c.notNull).toBe(true);
  });

  it('imageUrl — varchar, notNull', () => {
    const c = col(users, 'imageUrl');
    expect(c.columnType).toBe('PgVarchar');
    expect(c.notNull).toBe(true);
  });

  it('credits — integer, notNull, default 3', () => {
    const c = col(users, 'credits');
    expect(c.columnType).toBe('PgInteger');
    expect(c.notNull).toBe(true);
    expect(c.hasDefault).toBe(true);
    expect(c.default).toBe(3);
  });

  it('clerkId — varchar, notNull', () => {
    const c = col(users, 'clerkId');
    expect(c.columnType).toBe('PgVarchar');
    expect(c.notNull).toBe(true);
  });
});

// --------------------------------------------------------------------------
// designs table
// --------------------------------------------------------------------------
describe('schema: designs table', () => {
  it('has correct column names', () => {
    const cols = Object.keys(designs);
    expect(cols).toEqual(
      expect.arrayContaining([
        'id', 'userId', 'originalImageUrl', 'generatedImageUrl',
        'roomType', 'designType', 'additionalRequirements', 'createdAt',
      ])
    );
  });

  it('id — serial primary key', () => {
    const c = col(designs, 'id');
    expect(c.columnType).toBe('PgSerial');
    expect(c.primary).toBe(true);
  });

  it('userId — varchar, notNull', () => {
    const c = col(designs, 'userId');
    expect(c.columnType).toBe('PgVarchar');
    expect(c.notNull).toBe(true);
  });

  it('originalImageUrl — varchar, notNull', () => {
    const c = col(designs, 'originalImageUrl');
    expect(c.columnType).toBe('PgVarchar');
    expect(c.notNull).toBe(true);
  });

  it('generatedImageUrl — varchar, notNull', () => {
    const c = col(designs, 'generatedImageUrl');
    expect(c.columnType).toBe('PgVarchar');
    expect(c.notNull).toBe(true);
  });

  it('roomType — varchar, notNull', () => {
    const c = col(designs, 'roomType');
    expect(c.columnType).toBe('PgVarchar');
    expect(c.notNull).toBe(true);
  });

  it('designType — varchar, notNull', () => {
    const c = col(designs, 'designType');
    expect(c.columnType).toBe('PgVarchar');
    expect(c.notNull).toBe(true);
  });

  it('additionalRequirements — text, nullable', () => {
    const c = col(designs, 'additionalRequirements');
    expect(c.columnType).toBe('PgText');
    expect(c.notNull).toBe(false);
  });

  it('createdAt — timestamp, has defaultNow', () => {
    const c = col(designs, 'createdAt');
    expect(c.columnType).toBe('PgTimestamp');
    expect(c.hasDefault).toBe(true);
  });

  it('parentDesignId — nullable integer, self-referencing FK (design versioning)', () => {
    const c = col(designs, 'parentDesignId');
    expect(c.columnType).toBe('PgInteger');
    expect(c.notNull).toBe(false);
    const fks = designs[Symbol.for('drizzle:PgInlineForeignKeys')] ?? [];
    const selfFk = fks.find((fk) => fk.reference().foreignTable === designs);
    expect(selfFk).toBeDefined();
    expect(selfFk.reference().columns.map((c2) => c2.name)).toEqual(['parentDesignId']);
    expect(selfFk.reference().foreignColumns.map((c2) => c2.name)).toEqual(['id']);
    expect(selfFk.onDelete).toBe('set null');
  });

  it('userId declares an FK to users.clerkId (matches drizzle/0002_add_clerk_id_fk.sql)', () => {
    // drizzle/0002_add_clerk_id_fk.sql added a real FK at the DB level
    // (designs.userId -> users.clerkId, ON DELETE CASCADE). schema.ts
    // must declare it too via .references() so drizzle-kit and the type
    // system agree with what's actually in the database.
    const fks = designs[Symbol.for('drizzle:PgInlineForeignKeys')] ?? [];
    const userFk = fks.find((fk) => fk.reference().foreignTable === users);
    expect(userFk).toBeDefined();
    const reference = userFk.reference();
    expect(reference.columns.map((c) => c.name)).toEqual(['userId']);
    expect(reference.foreignColumns.map((c) => c.name)).toEqual(['clerkId']);
    expect(userFk.onDelete).toBe('cascade');
  });
});

// --------------------------------------------------------------------------
// generations table (audit trail for each provider attempt)
// --------------------------------------------------------------------------
describe('schema: generations table', () => {
  it('has correct column names', () => {
    const cols = Object.keys(generations);
    expect(cols).toEqual(
      expect.arrayContaining([
        'id', 'userId', 'parentDesignId', 'designId', 'status', 'generationType',
        'provider', 'roomType', 'designStyle', 'instruction', 'errorMessage',
        'latencyMs', 'startedAt', 'completedAt',
      ])
    );
  });

  it('userId — varchar, notNull, no FK (attempt log, like events)', () => {
    const c = col(generations, 'userId');
    expect(c.columnType).toBe('PgVarchar');
    expect(c.notNull).toBe(true);
  });

  it('status — enum, notNull, defaults to pending', () => {
    const c = col(generations, 'status');
    expect(c.notNull).toBe(true);
    expect(c.hasDefault).toBe(true);
    expect(c.default).toBe('pending');
    expect(c.enumValues).toEqual(['pending', 'processing', 'completed', 'failed']);
  });

  it('designId and parentDesignId both reference designs.id', () => {
    const fks = generations[Symbol.for('drizzle:PgInlineForeignKeys')] ?? [];
    expect(fks).toHaveLength(2);
    for (const fk of fks) {
      const reference = fk.reference();
      expect(reference.foreignTable).toBe(designs);
      expect(reference.foreignColumns.map((c) => c.name)).toEqual(['id']);
      expect(fk.onDelete).toBe('set null');
    }
    const referencedColumns = fks.map((fk) => fk.reference().columns[0].name).sort();
    expect(referencedColumns).toEqual(['designId', 'parentDesignId']);
  });
});

// --------------------------------------------------------------------------
// credit_transactions table (auditable ledger alongside Redis)
// --------------------------------------------------------------------------
describe('schema: credit_transactions table', () => {
  it('has correct column names', () => {
    const cols = Object.keys(creditTransactions);
    expect(cols).toEqual(
      expect.arrayContaining(['id', 'userId', 'type', 'amount', 'balanceAfter', 'generationId', 'createdAt'])
    );
  });

  it('userId — varchar, notNull, no FK (audit log, like events/generations)', () => {
    const c = col(creditTransactions, 'userId');
    expect(c.columnType).toBe('PgVarchar');
    expect(c.notNull).toBe(true);
  });

  it('type — enum, notNull, covers grant/generation/refund/purchase/adjustment', () => {
    const c = col(creditTransactions, 'type');
    expect(c.notNull).toBe(true);
    expect(c.enumValues).toEqual(['grant', 'generation', 'refund', 'purchase', 'adjustment']);
  });

  it('amount — integer, notNull (positive or negative, not constrained at the type level)', () => {
    const c = col(creditTransactions, 'amount');
    expect(c.columnType).toBe('PgInteger');
    expect(c.notNull).toBe(true);
  });

  it('generationId — nullable FK to generations.id', () => {
    const fks = creditTransactions[Symbol.for('drizzle:PgInlineForeignKeys')] ?? [];
    expect(fks).toHaveLength(1);
    const reference = fks[0].reference();
    expect(reference.foreignTable).toBe(generations);
    expect(reference.columns.map((c) => c.name)).toEqual(['generationId']);
    expect(fks[0].onDelete).toBe('set null');
  });
});
