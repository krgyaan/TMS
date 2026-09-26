import { pgTable, bigint, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const vendorGsts = pgTable("vendor_gsts", {
    id: bigint("id", { mode: "number" })
        .primaryKey()
        .default(sql`nextval('vendor_gsts_id_seq')`),
    orgId: bigint("org_id", { mode: "number" }).notNull(),
    gstState: varchar("gst_state", { length: 255 }),
    gstNo: varchar("gst_no", { length: 255 }),
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export type VendorGst = typeof vendorGsts.$inferSelect;
export type NewVendorGst = typeof vendorGsts.$inferInsert;
