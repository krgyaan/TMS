import { pgTable, bigserial, bigint, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";

export const amcProducts = pgTable(
    "amc_products",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        amcId: bigint("amc_id", { mode: "number" }).notNull(),
        itemId: bigint("item_id", { mode: "number" }).notNull(),
        description: text("description"),
        make: varchar("make", { length: 255 }),
        model: varchar("model", { length: 255 }),
        serialNo: varchar("serial_no", { length: 255 }),
        quantity: integer("quantity").notNull().default(1),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("amc_products_amc_id_foreign").on(table.amcId),
        index("amc_products_item_id_foreign").on(table.itemId),
    ]
);

export type AmcProduct = typeof amcProducts.$inferSelect;
export type NewAmcProduct = typeof amcProducts.$inferInsert;