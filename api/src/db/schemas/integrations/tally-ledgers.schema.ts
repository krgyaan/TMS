import { sql } from "drizzle-orm";
import { bigserial, boolean, index, pgTable, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";

export const tallyLedgers = pgTable(
    "tally_ledgers",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),

        company: varchar("company", { length: 255 }).notNull(),
        name: varchar("name", { length: 255 }).notNull(),
        nameNormalized: varchar("name_normalized", { length: 255 }).notNull(),
        parent: varchar("parent", { length: 255 }),
        guid: varchar("guid", { length: 100 }),

        isActive: boolean("is_active").notNull().default(true),
        lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),

        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        uniqueIndex("uq_tally_ledgers_name").on(table.company, table.nameNormalized),
        uniqueIndex("uq_tally_ledgers_guid")
            .on(table.company, table.guid)
            .where(sql`${table.guid} IS NOT NULL`),
        index("idx_tally_ledgers_parent").on(table.company, table.parent),
        index("idx_tally_ledgers_active").on(table.company, table.isActive),
    ]
);

export type TallyLedger = typeof tallyLedgers.$inferSelect;
export type NewTallyLedger = typeof tallyLedgers.$inferInsert;
