import { pgTable, bigint, varchar, timestamp } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const vendorFiles = pgTable("vendor_files", {
    id: bigint("id", { mode: "number" })
        .primaryKey()
        .default(sql`nextval('vendor_files_id_seq')`),
    vendorId: bigint("vendor_id", { mode: "number" }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    filePath: varchar("file_path", { length: 255 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export type VendorFile = typeof vendorFiles.$inferSelect;
export type NewVendorFile = typeof vendorFiles.$inferInsert;
