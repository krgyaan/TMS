import { pgTable, bigserial, bigint, varchar, integer, numeric, timestamp, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const inventory = pgTable(
    "inventory",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        projectId: bigint("project_id", { mode: "number" }).notNull(),
        warehouseId: bigint("warehouse_id", { mode: "number" }),
        itemName: varchar("item_name", { length: 255 }).notNull(),
        hsn: varchar("hsn", { length: 100 }),
        price: numeric("price", { precision: 20, scale: 2 }).notNull(),
        qty: numeric("qty", { precision: 20, scale: 2 }).notNull(),
        remainingQty: numeric("remaining_qty", { precision: 20, scale: 2 }).notNull(),
        lineItem: integer("line_item"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("idx_inventory_project_id").on(table.projectId),
        index("idx_inventory_warehouse_id").on(table.warehouseId),
        uniqueIndex("idx_inventory_project_wh_item_hsn_price").on(table.projectId, table.warehouseId, table.itemName, sql`COALESCE(${table.hsn}, '')`, table.price),
    ]
);

export type Inventory = typeof inventory.$inferSelect;
export type NewInventory = typeof inventory.$inferInsert;
