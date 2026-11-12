import { boolean, bigserial, bigint, jsonb, numeric, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { teams } from "@db/schemas/master/teams.schema";

export const inventoryItems = pgTable("inventory_items", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    itemCode: varchar("item_code", { length: 30 }).notNull().unique(),
    itemGroup: varchar("item_group", { length: 40 }),
    teamId: bigint("team_id", { mode: "number" }).references(() => teams.id),
    itemName: varchar("item_name", { length: 120 }).notNull(),
    itemType: varchar("item_type", { length: 80 }),
    description: varchar("description", { length: 500 }),
    specifications: jsonb("specifications").$type<Record<string, string>>().notNull().default({}),
    unit: varchar("unit", { length: 80 }).notNull(),
    conversion: jsonb("conversion").$type<Record<string, string>>().notNull().default({}),
    conversionUnit: varchar("conversion_unit", { length: 80 }),
    conversionFactor: numeric("conversion_factor", { precision: 20, scale: 10 }),
    hsnCode: varchar("hsn_code", { length: 30 }),
    isActive: boolean("is_active").notNull().default(true),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
