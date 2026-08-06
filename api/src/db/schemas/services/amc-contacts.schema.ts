import { pgTable, bigserial, bigint, varchar, timestamp, index } from "drizzle-orm/pg-core";

export const amcContacts = pgTable(
    "amc_contacts",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        amcId: bigint("amc_id", { mode: "number" }).notNull(),
        amcSiteId: bigint("amc_site_id", { mode: "number" }),
        name: varchar("name", { length: 255 }).notNull(),
        organization: varchar("organization", { length: 255 }),
        mobile: varchar("mobile", { length: 255 }).notNull(),
        email: varchar("email", { length: 255 }),
        source: varchar("source", { length: 50 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("amc_contacts_amc_id_foreign").on(table.amcId),
        index("amc_contacts_amc_site_id_foreign").on(table.amcSiteId),
    ]
);

export type AmcContact = typeof amcContacts.$inferSelect;
export type NewAmcContact = typeof amcContacts.$inferInsert;
