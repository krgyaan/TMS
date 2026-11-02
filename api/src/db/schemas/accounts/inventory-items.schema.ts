import { boolean, bigserial, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const inventoryItems = pgTable("inventory_items", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    itemName: varchar("item_name", { length: 120 }).notNull(),
    itemType: varchar("item_type", { length: 80 }),
    specifications: jsonb("specifications").$type<Record<string, string>>().notNull().default({}),
    unit: varchar("unit", { length: 80 }).notNull(),
    conversion: jsonb("conversion").$type<Record<string, string>>().notNull().default({}),
    hsnCode: varchar("hsn_code", { length: 30 }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
