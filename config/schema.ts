import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  integer,
  text,
  timestamp,
  index,
  jsonb,
  boolean,
  type AnyPgColumn,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  name: varchar("name", { length: 256 }).notNull(),

  email: varchar("email", { length: 256 }).notNull().unique(),

  imageUrl: varchar("imageUrl", { length: 512 }).notNull(),

  credits: integer("credits").default(3).notNull(),

  clerkId: varchar("clerkId", { length: 256 }).notNull().unique(),
});

export const designs = pgTable("designs", {
  id: serial("id").primaryKey(),

  // Clerk user ID. FK added at the DB level in
  // drizzle/0002_add_clerk_id_fk.sql (designs.userId -> users.clerkId,
  // ON DELETE CASCADE) — declared here too so drizzle-kit and the type
  // system agree with what's actually in the database.
  userId: varchar("userId", { length: 256 })
    .notNull()
    .references(() => users.clerkId, { onDelete: "cascade" }),

  originalImageUrl: varchar("originalImageUrl", {
    length: 512,
  }).notNull(),

  generatedImageUrl: varchar("generatedImageUrl", {
    length: 512,
  }).notNull(),

  roomType: varchar("roomType", { length: 100 }).notNull(),

  designType: varchar("designType", { length: 100 }).notNull(),

  additionalRequirements: text("additionalRequirements"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),

  // Self-reference: null for an original generation, set for a
  // refinement produced from another design. ON DELETE SET NULL so
  // deleting a parent design doesn't cascade-delete its refinements —
  // they just become roots of their own chain.
  parentDesignId: integer("parentDesignId").references(
    (): AnyPgColumn => designs.id,
    { onDelete: "set null" }
  ),

  // Private by default. A design only becomes visible at /share/:id
  // once its owner explicitly shares it — see POST /api/designs/:id/share.
  isPublic: boolean("isPublic").default(false).notNull(),
}, (table) => ({
  parentDesignIdIdx: index("designs_parentDesignId_idx").on(table.parentDesignId),
  // Every read of this table in the app (`/api/designs`, `/api/recommendations`)
  // filters by userId and orders by createdAt DESC. Without this, both do a
  // sequential scan across every user's designs, not just the caller's —
  // there was no index at all on userId despite it being the most-queried
  // column in the schema. Composite (not two single-column indexes) so the
  // same index serves the filter and the sort in one pass.
  userIdCreatedAtIdx: index("designs_userId_createdAt_idx").on(table.userId, table.createdAt),
}));

// Product analytics — one row per tracked event. Deliberately just a
// name + a small JSON bag of properties rather than a dedicated table
// per event type: the event list is still short and evolving (see
// lib/analytics.ts), and a normalized schema per event would be
// premature for the volume this product has right now.
export const events = pgTable("events", {
  id: serial("id").primaryKey(),

  // Clerk user ID. Nullable — landing_view and similar happen before
  // anyone is signed in. No FK to users.clerkId: unlike designs, an
  // event should never be lost/cascaded if the user row changes, and a
  // pre-signup event has no user row to reference at all.
  userId: varchar("userId", { length: 256 }),

  event: varchar("event", { length: 100 }).notNull(),

  properties: jsonb("properties"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  eventIdx: index("events_event_idx").on(table.event),
  userIdIdx: index("events_userId_idx").on(table.userId),
}));

export const generationStatusEnum = pgEnum("generation_status", [
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const generationTypeEnum = pgEnum("generation_type", ["initial", "refinement"]);

export const generationProviderEnum = pgEnum("generation_provider", [
  "replicate-sdxl",
  "replicate-ideogram",
]);

// One row per generation ATTEMPT (not per successful design) — this is
// the audit trail `designs` alone can't give you: a failed attempt, a
// slow one, or which provider/parameters produced a given result. It's
// deliberately still populated synchronously within one HTTP request
// (pending -> processing -> completed/failed all happen before the
// route responds) — see PROJECT_AUDIT.md's "Why not go async yet" for
// why this isn't a real job queue. That's also why status transitions
// don't need a separate updatedAt history: there's exactly one writer,
// one request, no concurrent status races to reconstruct later.
//
// No FK on userId, unlike `designs` — this table is an attempt log akin
// to `events`, and must be able to record an attempt even in the (rare,
// racy) case where a brand-new user's `users` row hasn't been
// provisioned yet by the time their very first generation request lands.
export const generations = pgTable("generations", {
  id: serial("id").primaryKey(),

  userId: varchar("userId", { length: 256 }).notNull(),

  // Set for a refinement attempt (the design being refined); null for
  // an initial generation attempt.
  parentDesignId: integer("parentDesignId").references(
    (): AnyPgColumn => designs.id,
    { onDelete: "set null" }
  ),

  // Set once the attempt succeeds and a designs row is persisted; stays
  // null for a failed attempt, or if generation succeeded but the
  // designs insert itself failed (the existing saved:false path).
  designId: integer("designId").references(() => designs.id, { onDelete: "set null" }),

  status: generationStatusEnum("status").notNull().default("pending"),
  generationType: generationTypeEnum("generationType").notNull(),
  provider: generationProviderEnum("provider").notNull(),

  roomType: varchar("roomType", { length: 100 }),
  designStyle: varchar("designStyle", { length: 100 }),
  instruction: text("instruction"),

  errorMessage: text("errorMessage"),
  latencyMs: integer("latencyMs"),

  startedAt: timestamp("startedAt").defaultNow().notNull(),
  completedAt: timestamp("completedAt"),
}, (table) => ({
  userIdIdx: index("generations_userId_idx").on(table.userId),
  designIdIdx: index("generations_designId_idx").on(table.designId),
  statusIdx: index("generations_status_idx").on(table.status),
}));

export const creditTransactionTypeEnum = pgEnum("credit_transaction_type", [
  "grant",
  "generation",
  "refund",
  "purchase",
  "adjustment",
]);

// Redis (lib/credits.ts) remains the fast, atomic source of truth for
// whether a request is allowed to proceed — this table does not replace
// that. It's the auditable history Redis alone can't give you: "why does
// this user have 2 credits" has an actual answer here instead of just a
// current balance. No FK on userId — same reasoning as `generations`.
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),

  userId: varchar("userId", { length: 256 }).notNull(),

  type: creditTransactionTypeEnum("type").notNull(),

  // Positive for grant/refund/purchase, negative for generation/a
  // downward adjustment.
  amount: integer("amount").notNull(),

  // The Redis balance immediately after this transaction, when known —
  // both decrementCredit() and refundCredit() already return this value,
  // so it costs nothing extra to record.
  balanceAfter: integer("balanceAfter"),

  generationId: integer("generationId").references(() => generations.id, { onDelete: "set null" }),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("credit_transactions_userId_idx").on(table.userId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Design = typeof designs.$inferSelect;
export type NewDesign = typeof designs.$inferInsert;

export type AnalyticsEvent = typeof events.$inferSelect;
export type NewAnalyticsEvent = typeof events.$inferInsert;

export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;

export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type NewCreditTransaction = typeof creditTransactions.$inferInsert;