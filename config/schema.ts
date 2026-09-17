import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  timestamp,
  index,
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
}, (table) => ({
  parentDesignIdIdx: index("designs_parentDesignId_idx").on(table.parentDesignId),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Design = typeof designs.$inferSelect;
export type NewDesign = typeof designs.$inferInsert;