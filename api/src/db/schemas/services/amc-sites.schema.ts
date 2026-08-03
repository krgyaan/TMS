import { pgTable, bigserial, bigint, varchar, text, timestamp, index } from "drizzle-orm/pg-core";

export const amcSites = pgTable(
    "amc_sites",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        amcId: bigint("amc_id", { mode: "number" }).notNull(),
        name: varchar("name", { length: 255 }).notNull(),
        address: text("address").notNull(),
        mapLink: varchar("map_link", { length: 255 }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("amc_sites_amc_id_foreign").on(table.amcId),
    ]
);

export type AmcSite = typeof amcSites.$inferSelect;
export type NewAmcSite = typeof amcSites.$inferInsert;