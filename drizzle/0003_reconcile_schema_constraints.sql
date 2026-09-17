-- Reconciles config/schema.ts with drizzle-kit's migration history.
-- The 0002 migration's snapshot file was hand-authored (not produced by
-- `drizzle-kit generate`) and had drifted from schema.ts in several ways
-- that had nothing to do with the FK it was meant to add:
--   - schema.ts declares createdAt/credits as NOT NULL and email as
--     UNIQUE, but no prior migration ever added those constraints.
--   - migration 0002 created BOTH a UNIQUE constraint and a separate
--     UNIQUE INDEX on users.clerkId — Postgres already creates an
--     implicit unique index for a UNIQUE constraint, so the named index
--     was redundant; schema.ts only ever declared `.unique()`, so
--     drizzle-kit (correctly) wants to drop the redundant index.
--
-- IMPORTANT — do not run this blindly against production data:
--   - "ADD CONSTRAINT users_email_unique UNIQUE(email)" fails if any
--     duplicate emails already exist. Check first:
--       SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
--   - "ALTER COLUMN createdAt SET NOT NULL" / "credits SET NOT NULL"
--     fail if any existing rows have NULL in those columns. Check first:
--       SELECT COUNT(*) FROM designs WHERE "createdAt" IS NULL;
--       SELECT COUNT(*) FROM users WHERE credits IS NULL;
-- If either check finds rows, resolve them (backfill or delete) before
-- applying this migration.

DROP INDEX "users_clerkId_idx";--> statement-breakpoint
ALTER TABLE "designs" ALTER COLUMN "createdAt" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "credits" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
