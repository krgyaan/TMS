import { pgTable, bigint, varchar, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const vendors = pgTable("vendors", {
    id: bigint("id", { mode: "number" })
        .primaryKey()
        .default(sql`nextval('vendors_id_seq')`),
    orgId: bigint("org_id", { mode: "number" }),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    mobile: varchar("mobile", { length: 22 }).notNull(),
    address: varchar("address", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
