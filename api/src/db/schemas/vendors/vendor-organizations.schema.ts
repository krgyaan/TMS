import { pgTable, bigint, varchar, boolean, timestamp, text, uniqueIndex, integer, numeric } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const vendorOrganizations = pgTable(
    "vendor_organizations",
    {
        id: bigint("id", { mode: "number" })
            .primaryKey()
            .default(sql`nextval('vendor_organizations_id_seq')`),
        name: varchar("name", { length: 255 }).notNull().unique(),
        category: varchar("category", { length: 50 }),
        msme: varchar("msme", { length: 50 }),
        // MSME size from the vendor sheet: Micro / Small / Medium.
        msmeSize: varchar("msme_size", { length: 10 }),
        msmeType: varchar("msme_type", { length: 1 }),
        // Manufacturing / Services / Trading, from the sheet's MAJOR ACTIVITY column.
        majorActivity: varchar("major_activity", { length: 50 }),
        registrationType: varchar("registration_type", { length: 20 }),
        creditPeriodDays: integer("credit_period_days"),
        creditAmount: numeric("credit_amount", { precision: 14, scale: 2 }),
        pan: varchar("pan", { length: 100 }),
        // Also holds the sheet's "Unregistered Address" for UNREGISTERED vendors.
        address: text("address"),
        status: boolean("status").notNull().default(true),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    // The column-level `.unique()` above is case/space-sensitive, so "Acme" and
    // "Acme " both insert. This partial unique index closes that gap for ACTIVE
    // orgs (inactive rows are archived merge leftovers and may share a name).
    // Keep the predicate in lockstep with scripts/merge-vendor-orgs-runbook.md,
    // which de-dupes on `lower(btrim(name)) WHERE status`.
    table => [
        uniqueIndex("vendor_organizations_name_norm_unique")
            .on(sql`lower(btrim(${table.name}))`)
            .where(sql`${table.status}`),
    ]
);

export type VendorOrganization = typeof vendorOrganizations.$inferSelect;
export type NewVendorOrganization = typeof vendorOrganizations.$inferInsert;
