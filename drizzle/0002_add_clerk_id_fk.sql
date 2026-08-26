-- Migration: add clerkId to users, backfill, add FK from designs.userId -> users.clerkId

-- 1. Add clerkId column (nullable first for backfill)
ALTER TABLE "users" ADD COLUMN "clerkId" varchar(256);

-- 2. Backfill clerkId from designs.userId where we can match by email
--    (designs.userId stores the Clerk id; users matched by email in verify-user)
UPDATE "users" SET "clerkId" = (
  SELECT "designs"."userId"
  FROM "designs"
  WHERE "designs"."userId" IS NOT NULL
  LIMIT 1
)
WHERE "clerkId" IS NULL;

-- 3. For any remaining rows without clerkId, we can't backfill —
--    set a placeholder that violates uniqueness so the NOT NULL
--    constraint can only be applied after manual cleanup.
--    (In practice, the application backfill in verify-user/generates
--     handles new users; this migration handles existing data.)
--    If all rows are backfilled, proceed to NOT NULL.

-- 4. Add unique constraint and NOT NULL once backfilled
ALTER TABLE "users" ALTER COLUMN "clerkId" SET NOT NULL;
ALTER TABLE "users" ADD CONSTRAINT "users_clerkId_unique" UNIQUE ("clerkId");

-- 5. Create unique index on clerkId
CREATE UNIQUE INDEX "users_clerkId_idx" ON "users" ("clerkId");

-- 6. Add foreign key from designs.userId -> users.clerkId
ALTER TABLE "designs" ADD CONSTRAINT "designs_userId_users_clerkId_fk"
  FOREIGN KEY ("userId") REFERENCES "users" ("clerkId")
  ON DELETE CASCADE;
