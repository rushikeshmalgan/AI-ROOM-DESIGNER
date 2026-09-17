import {
  pgTable,
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

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Design = typeof designs.$inferSelect;
export type NewDesign = typeof designs.$inferInsert;

export type AnalyticsEvent = typeof events.$inferSelect;
export type NewAnalyticsEvent = typeof events.$inferInsert;