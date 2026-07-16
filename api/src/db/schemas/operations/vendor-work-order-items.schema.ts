import { pgTable, bigserial, bigint, text, varchar, integer, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { vendorWorkOrders } from "./vendor-work-orders.schema";

export const vendorWorkOrderItems = pgTable(
  "vendor_work_order_items",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    vendorWorkOrderId: bigint("vendor_work_order_id", { mode: "number" }).notNull()
      .references(() => vendorWorkOrders.id, { onDelete: "cascade" }),
    description: text("description"),
    hsnSac: varchar("hsn_sac", { length: 100 }),
    qty: numeric("qty", { precision: 5, scale: 2 }).notNull(),
    rate: numeric("rate", { precision: 12, scale: 2 }).notNull(),
    taxableAmount: numeric("taxable_amount", { precision: 14,scale: 2 }).notNull(),
    gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull(),
    gstAmount: numeric("gst_amount", { precision: 14, scale: 2 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ([{ vwoIdx: index("idx_vwoi_vendor_work_order_id").on(table.vendorWorkOrderId)}])
);

export type VendorWorkOrderItem = typeof vendorWorkOrderItems.$inferSelect;
export type NewVendorWorkOrderItem = typeof vendorWorkOrderItems.$inferInsert;
