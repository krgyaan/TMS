import { bigint, bigserial, boolean, index, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { tallyLedgers } from "../integrations/tally-ledgers.schema";

export const imprestCategories = pgTable(
    "imprest_categories",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        name: varchar("name", { length: 100 }).notNull().unique(),
        heading: varchar("heading", { length: 100 }),
        status: boolean("status").notNull().default(true),
        tallyLedgerId: bigint("tally_ledger_id", { mode: "number" }).references(() => tallyLedgers.id, { onDelete: "set null" }),
        tallyBlocked: boolean("tally_blocked").notNull().default(false),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [index("idx_imprest_categories_tally_ledger").on(table.tallyLedgerId)]
);

export type ImprestCategory = typeof imprestCategories.$inferSelect;
export type NewImprestCategory = typeof imprestCategories.$inferInsert;
