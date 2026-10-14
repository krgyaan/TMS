import { pgTable, bigint, varchar, boolean, timestamp, text, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const vendorOrganizations = pgTable(
    "vendor_organizations",
    {
        id: bigint("id", { mode: "number" })
            .primaryKey()
            .default(sql`nextval('vendor_organizations_id_seq')`),
        name: varchar("name", { length: 255 }).notNull().unique(),
        alias: varchar("alias", { length: 255 }),
        msme: varchar("msme", { length: 50 }),
        msmeType: varchar("msme_type", { length: 1 }),
        pan: varchar("pan", { length: 100 }),
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
