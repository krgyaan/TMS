import { pgTable, bigserial, bigint, varchar, timestamp, index } from "drizzle-orm/pg-core";

export const amcSiteContacts = pgTable(
    "amc_site_contacts",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        amcSiteId: bigint("amc_site_id", { mode: "number" }).notNull(),
        name: varchar("name", { length: 255 }).notNull(),
        organization: varchar("organization", { length: 255 }),
        mobile: varchar("mobile", { length: 255 }).notNull(),
        email: varchar("email", { length: 255 }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("amc_site_contacts_amc_site_id_foreign").on(table.amcSiteId),
    ]
);

export type AmcSiteContact = typeof amcSiteContacts.$inferSelect;
export type NewAmcSiteContact = typeof amcSiteContacts.$inferInsert;