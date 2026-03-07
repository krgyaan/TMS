import { pgTable, bigint, varchar, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const vendorGsts = pgTable("vendor_gsts", {
    id: bigint("id", { mode: "number" })
        .primaryKey()
        .default(sql`nextval('vendor_gsts_id_seq')`),
    orgId: bigint("org_id", { mode: "number" }).notNull(),
    gstState: varchar("gst_state", { length: 255 }).notNull(),
    gstNum: varchar("gst_num", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export type VendorGst = typeof vendorGsts.$inferSelect;
export type NewVendorGst = typeof vendorGsts.$inferInsert;
