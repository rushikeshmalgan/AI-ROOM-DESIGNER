import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  timestamp,
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

  // Clerk user ID
  userId: varchar("userId", { length: 256 }).notNull(),

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
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Design = typeof designs.$inferSelect;
export type NewDesign = typeof designs.$inferInsert;