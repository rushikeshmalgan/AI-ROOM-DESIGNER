-- Reconciles config/schema.ts with drizzle-kit's migration history.
-- The 0002 migration's snapshot file was hand-authored (not produced by
-- `drizzle-kit generate`) and had drifted from schema.ts in ways that
-- had nothing to do with the FK it was meant to add: schema.ts declares
-- createdAt/credits NOT NULL and email UNIQUE, but no prior migration
-- ever added those DB-level constraints, and 0002 created a redundant
-- named index alongside the clerkId unique constraint (Postgres already
-- creates an implicit unique index for a UNIQUE constraint).
--
-- Every statement below is idempotent (safe to run more than once) and
-- fails with a clear, specific error instead of applying a partial
-- change if the underlying data isn't actually safe — see docs/db-migration-checklist.md
-- for the pre-deployment checklist this pairs with.

-- 1. Drop the redundant named index. No-op if already gone.
DROP INDEX IF EXISTS "users_clerkId_idx";
--> statement-breakpoint

-- 2. designs.createdAt NOT NULL. Re-running SET NOT NULL when the
--    column is already NOT NULL is a no-op in Postgres, so this alone
--    is idempotent; the guard below turns a generic constraint-
--    violation error into a specific, actionable one.
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count FROM "designs" WHERE "createdAt" IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Cannot set designs.createdAt NOT NULL: % row(s) have NULL. Backfill or delete them first.', null_count;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "designs" ALTER COLUMN "createdAt" SET NOT NULL;
--> statement-breakpoint

-- 3. users.credits NOT NULL — same pattern as above.
DO $$
DECLARE
  null_count integer;
BEGIN
  SELECT COUNT(*) INTO null_count FROM "users" WHERE "credits" IS NULL;
  IF null_count > 0 THEN
    RAISE EXCEPTION 'Cannot set users.credits NOT NULL: % row(s) have NULL. Backfill or delete them first.', null_count;
  END IF;
END $$;
--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "credits" SET NOT NULL;
--> statement-breakpoint

-- 4. users.email UNIQUE. Unlike SET NOT NULL, re-adding an existing
--    named constraint errors rather than no-op-ing, so this checks
--    pg_constraint first and skips entirely if it's already there.
DO $$
DECLARE
  dup_count integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_email_unique'
  ) THEN
    SELECT COUNT(*) INTO dup_count FROM (
      SELECT "email" FROM "users" GROUP BY "email" HAVING COUNT(*) > 1
    ) dupes;
    IF dup_count > 0 THEN
      RAISE EXCEPTION 'Cannot add UNIQUE constraint on users.email: % duplicate email group(s) exist. Resolve them first.', dup_count;
    END IF;
    ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
  END IF;
END $$;
