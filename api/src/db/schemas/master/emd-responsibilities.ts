import { pgTable, bigserial, varchar, boolean, timestamp, text } from "drizzle-orm/pg-core";

export const emdResponsibilityTypes = pgTable("instrument_responsibility_types", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    name: varchar("name", { length: 255 }),
    description: text("description"),
    status: boolean("status").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

export type EmdResponsibilityType = typeof emdResponsibilityTypes.$inferSelect;
export type NewEmdResponsibilityType = typeof emdResponsibilityTypes.$inferInsert;
