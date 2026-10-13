import { pgTable, bigserial, bigint, varchar, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { purchaseOrders } from "./purchase-orders.schema";
import { vendorWorkOrders } from "./vendor-work-orders.schema";

export const orderExtraCharges = pgTable(
    "order_extra_charges",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        projectId: bigint("project_id", { mode: "number" }).notNull(),
        purchaseOrderId: bigint("purchase_order_id", { mode: "number" }).references(() => purchaseOrders.id, { onDelete: "cascade" }),
        vendorWorkOrderId: bigint("vendor_work_order_id", { mode: "number" }).references(() => vendorWorkOrders.id, { onDelete: "cascade" }),
        label: varchar("label", { length: 100 }).notNull(),
        gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull().default("0"),
        taxableAmount: numeric("taxable_amount", { precision: 14, scale: 2 }).notNull(),
        gstAmount: numeric("gst_amount", { precision: 14, scale: 2 }).notNull().default("0"),
        totalAmount: numeric("total_amount", { precision: 14, scale: 2 }).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("idx_oec_purchase_order_id").on(table.purchaseOrderId),
        index("idx_oec_vendor_work_order_id").on(table.vendorWorkOrderId),
        index("idx_oec_project_id").on(table.projectId),
    ]
);

export type OrderExtraCharge = typeof orderExtraCharges.$inferSelect;
export type NewOrderExtraCharge = typeof orderExtraCharges.$inferInsert;
