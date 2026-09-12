import { pgTable, bigserial, bigint, numeric, text, timestamp, index } from "drizzle-orm/pg-core";

export const inventoryTransfers = pgTable(
    "inventory_transfers",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        itemId: bigint("item_id", { mode: "number" }).notNull(),
        fromProject: bigint("from_project", { mode: "number" }).notNull(),
        toProject: bigint("to_project", { mode: "number" }).notNull(),
        qty: numeric("qty", { precision: 20, scale: 2 }).notNull(),
        price: numeric("price", { precision: 20, scale: 2 }).notNull(),
        remark: text("remark"),
        transferredBy: bigint("transferred_by", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [index("idx_it_from_project").on(table.fromProject), index("idx_it_to_project").on(table.toProject), index("idx_it_item_id").on(table.itemId)]
);

export type InventoryTransfer = typeof inventoryTransfers.$inferSelect;
export type NewInventoryTransfer = typeof inventoryTransfers.$inferInsert;
