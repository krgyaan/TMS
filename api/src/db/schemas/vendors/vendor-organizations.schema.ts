import { pgTable, bigint, varchar, boolean, timestamp, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const vendorOrganizations = pgTable("vendor_organizations", {
    id: bigint("id", { mode: "number" })
        .primaryKey()
        .default(sql`nextval('vendor_organizations_id_seq')`),
    name: varchar("name", { length: 255 }).notNull().unique(),
    address: text("address"),
    status: boolean("status").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type VendorOrganization = typeof vendorOrganizations.$inferSelect;
export type NewVendorOrganization = typeof vendorOrganizations.$inferInsert;
