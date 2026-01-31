import { pgTable, bigint, varchar, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const vendorAccs = pgTable("vendor_accs", {
    id: bigint("id", { mode: "number" })
        .primaryKey()
        .default(sql`nextval('vendor_accs_id_seq')`),
    orgId: bigint("org_id", { mode: "number" }).notNull(),
    bankAccountName: varchar("bank_account_name", { length: 255 }).notNull(),
    accountNum: varchar("account_num", { length: 255 }).notNull(),
    ifscCode: varchar("ifsc_code", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export type VendorAcc = typeof vendorAccs.$inferSelect;
export type NewVendorAcc = typeof vendorAccs.$inferInsert;
