import { pgTable, bigserial, varchar, timestamp, boolean } from "drizzle-orm/pg-core";

export const financialYears = pgTable("financial_years", {
    id: bigserial("id", { mode: "number" }).primaryKey(),

    financialYear: varchar("financial_year", { length: 255 }).notNull(),

    status: boolean("status").notNull().default(true),

    createdAt: timestamp("created_at", { withTimezone: false }),
    updatedAt: timestamp("updated_at", { withTimezone: false }),
});
