# Pre-deployment checklist: `0003_reconcile_schema_constraints.sql`

This migration is **generated but not applied**. It is additive/constraint-only
(no columns or tables are dropped), and every statement in it is now idempotent
and self-checking (see the file itself) — but "idempotent" only means it's safe
to *re-run*, not that it's guaranteed to *succeed* against real data. Run this
checklist before applying it to any database with real rows.

## Checklist

- [ ] **Check NULL values** — run against the target database:
  ```sql
  SELECT COUNT(*) FROM designs WHERE "createdAt" IS NULL;
  SELECT COUNT(*) FROM users WHERE credits IS NULL;
  ```
  Both must return `0`. If not, backfill (`UPDATE ... SET createdAt = now() WHERE createdAt IS NULL`, or the equivalent for `credits`) before proceeding — do not delete rows to make this pass without understanding why they're null first.

- [ ] **Check duplicate values**:
  ```sql
  SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;
  ```
  Must return no rows. If it does, resolve the duplicates (merge or rename) — the migration will refuse to run and tell you the count, but it won't tell you *which* rows, so find them with this query first.

- [ ] **Check existing FK** — confirm `designs.userId -> users.clerkId` already exists (this migration doesn't touch it, but it's worth confirming the earlier `0002` migration actually applied):
  ```sql
  SELECT conname FROM pg_constraint WHERE conname = 'designs_userId_users_clerkId_fk';
  ```

- [ ] **Check existing indexes** — confirm what's actually there before the `DROP INDEX IF EXISTS` runs (informational only; the statement is safe either way):
  ```sql
  SELECT indexname FROM pg_indexes WHERE tablename = 'users';
  ```

- [ ] **Backup the database.** Neon supports point-in-time restore / branching — take a branch snapshot immediately before running this, regardless of how confident the checks above make you.

- [ ] **Run the migration in staging first** (a Neon branch is sufficient) — run it twice in a row there to confirm the idempotency actually holds in practice, not just on paper.

- [ ] **Verify the application** against staging after migrating: sign up, upload, generate, refine — the app doesn't depend on these constraints existing (it already treats `createdAt`/`credits` as non-null and `email` as unique at the application level), so this step is really about confirming the migration itself didn't error partway through.

- [ ] **Apply the production migration** — `npx drizzle-kit migrate` (or however migrations are run in your deploy pipeline) — only after every box above is checked on production's actual data, not staging's.

## If a check fails

Don't edit the migration to route around bad data (e.g., don't change `SET NOT NULL` to allow nulls) — fix the data, or explicitly decide the constraint is wrong and change `config/schema.ts` instead, then regenerate. The migration failing with a clear `RAISE EXCEPTION` message is the intended behavior, not a bug to silence.
