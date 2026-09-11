import { pgTable, bigserial, bigint, varchar, timestamp, index } from "drizzle-orm/pg-core";

export const warehouses = pgTable(
    "warehouses",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        name: varchar("name", { length: 255 }).notNull(),
        type: varchar("type", { length: 50 }).notNull(),
        projectId: bigint("project_id", { mode: "number" }),
        parentId: bigint("parent_id", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("idx_warehouses_project_id").on(table.projectId),
        index("idx_warehouses_type").on(table.type),
        index("idx_warehouses_parent_id").on(table.parentId),
    ]
);

export type Warehouse = typeof warehouses.$inferSelect;
export type NewWarehouse = typeof warehouses.$inferInsert;