import { pgTable, bigserial, bigint, varchar, numeric, timestamp, index } from "drizzle-orm/pg-core";
import { inventory } from "./inventory.schema";

export const inventoryMovements = pgTable(
    "inventory_movements",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        inventoryId: bigint("inventory_id", { mode: "number" }).references(() => inventory.id, { onDelete: "set null" }),
        projectId: bigint("project_id", { mode: "number" }).notNull(),
        movementType: varchar("movement_type", { length: 50 }).notNull(),
        referenceId: bigint("reference_id", { mode: "number" }),
        fromProjectId: bigint("from_project_id", { mode: "number" }),
        toProjectId: bigint("to_project_id", { mode: "number" }),
        poId: bigint("po_id", { mode: "number" }),
        qty: numeric("qty", { precision: 20, scale: 2 }).notNull(),
        price: numeric("price", { precision: 20, scale: 2 }).notNull(),
        itemName: varchar("item_name", { length: 255 }).notNull(),
        hsn: varchar("hsn", { length: 100 }),
        createdBy: bigint("created_by", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [index("idx_im_project_id").on(table.projectId), index("idx_im_inventory_id").on(table.inventoryId), index("idx_im_movement_type").on(table.movementType)]
);

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type NewInventoryMovement = typeof inventoryMovements.$inferInsert;
