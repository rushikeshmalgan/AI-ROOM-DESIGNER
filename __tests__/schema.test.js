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
import { users, designs } from '@/config/schema';

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
    expect(cols).toEqual(expect.arrayContaining(['id', 'name', 'email', 'imageUrl', 'credits']));
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

  it('credits — integer, nullable (no notNull), default 3', () => {
    const c = col(users, 'credits');
    expect(c.columnType).toBe('PgInteger');
    // credits has .default(3) but no .notNull() — nullable is intentional
    expect(c.notNull).toBe(false);
    expect(c.hasDefault).toBe(true);
    expect(c.default).toBe(3);
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

  it('no FK constraint declared between designs.userId and users.id', () => {
    // Drizzle exposes foreignKeyConfigs on a table. Asserting the array is
    // empty confirms that no FK was declared at the schema level — referential
    // integrity is app-enforced only.
    const fks = designs[Symbol.for('drizzle:PgInlineForeignKeys')] ?? [];
    expect(fks).toHaveLength(0);
  });
});
