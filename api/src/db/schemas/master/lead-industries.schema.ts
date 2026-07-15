import { pgTable, bigserial, varchar, char, timestamp } from "drizzle-orm/pg-core";

export const leadIndustries = pgTable("lead_industries", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }),
    status: char("status", { length: 1 }).notNull().default('1'),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type LeadIndustry = typeof leadIndustries.$inferSelect;
export type NewLeadIndustry = typeof leadIndustries.$inferInsert;