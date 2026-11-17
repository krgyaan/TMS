import { bigint, bigserial, index, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";
import { users } from "@db/schemas/auth";

export const paymentCategory = pgTable(
    "payment_category",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),

        // Groups categories: 'fixed' drives fixed expenses; reusable for others.
        purpose: varchar("purpose", { length: 50 }).notNull(),
        category: varchar("category", { length: 100 }).notNull(),
        subCategory: varchar("sub_category", { length: 100 }),

        // 'active' | 'inactive'
        status: varchar("status", { length: 20 }).notNull().default("active"),

        createdBy: bigint("created_by", { mode: "number" })
            .notNull()
            .references(() => users.id),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [index("idx_payment_category_purpose").on(table.purpose)]
);

export type PaymentCategory = typeof paymentCategory.$inferSelect;
export type NewPaymentCategory = typeof paymentCategory.$inferInsert;
