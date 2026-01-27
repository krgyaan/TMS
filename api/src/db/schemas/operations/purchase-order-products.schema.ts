import { pgTable, bigserial, bigint, text, varchar, integer, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { purchaseOrders } from "./purchase-orders.schema";

export const purchaseOrderProducts = pgTable(
    "purchase_order_products",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),

        purchaseOrderId: bigint("purchase_order_id", { mode: "number" })
            .notNull()
            .references(() => purchaseOrders.id, { onDelete: "cascade" }),

        description: text("description"),

        hsnSac: varchar("hsn_sac", { length: 100 }),

        qty: integer("qty").notNull(),

        rate: numeric("rate", { precision: 12, scale: 2 }).notNull(),

        gstRate: numeric("gst_rate", { precision: 5, scale: 2 }).notNull(),

        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),

        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => ({
        poIdx: index("idx_pop_purchase_order_id").on(table.purchaseOrderId),
    })
);

export type PurchaseOrderProduct = typeof purchaseOrderProducts.$inferSelect;
export type NewPurchaseOrderProduct = typeof purchaseOrderProducts.$inferInsert;
