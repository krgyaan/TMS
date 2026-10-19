import { pgTable, varchar, text, integer, timestamp, bigserial } from "drizzle-orm/pg-core";

export const urlShorteners = pgTable("url_shorteners", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    token: varchar("token", { length: 12 }).notNull().unique(),
    url: text("url").notNull(),
    purpose: varchar("purpose", { length: 50 }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    visitCount: integer("visit_count").notNull().default(0),
    createdBy: integer("created_by"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type UrlShortener = typeof urlShorteners.$inferSelect;
export type NewUrlShortener = typeof urlShorteners.$inferInsert;
