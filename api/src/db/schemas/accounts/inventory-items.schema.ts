import { boolean, bigserial, bigint, index, jsonb, numeric, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { teams } from "@db/schemas/master/teams.schema";
import { users } from "@db/schemas/auth/users.schema";

export const inventoryItems = pgTable("inventory_items", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    itemCode: varchar("item_code", { length: 80 }).notNull().unique(),
    itemGroup: varchar("item_group", { length: 40 }),
    teamId: bigint("team_id", { mode: "number" }).references(() => teams.id),
    category: varchar("category", { length: 80 }),
    makeBrand: varchar("make_brand", { length: 120 }),
    createdBy: bigint("created_by", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
    updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id, { onDelete: "set null" }),
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
}, table => ({
    categoryIdx: index("inventory_items_category_idx").on(table.category),
    createdByIdx: index("inventory_items_created_by_idx").on(table.createdBy),
}));

export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;
