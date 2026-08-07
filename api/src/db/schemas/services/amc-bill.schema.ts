import { pgTable, bigserial, bigint, integer, date, timestamp, varchar, numeric, index, jsonb } from "drizzle-orm/pg-core";

export const amcBills = pgTable(
    "amc_bill",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        amcId: bigint("amc_id", { mode: "number" }).notNull(),
        amcSiteId: bigint("amc_site_id", { mode: "number" }).notNull(),
        billNo: integer("bill_no").notNull(),
        billDueDate: date("bill_due_date").notNull(),
        status: varchar("status", { length: 50 }).notNull().default("Pending"),
        invoices: jsonb("invoices").notNull().default("[]"),
        paymentReceipts: jsonb("payment_receipts").notNull().default("[]"),
        amount: numeric("amount", { precision: 10, scale: 2 }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("amc_bill_amc_id_foreign").on(table.amcId),
        index("amc_bill_amc_site_id_foreign").on(table.amcSiteId),
    ]
);

export type AmcBill = typeof amcBills.$inferSelect;
export type NewAmcBill = typeof amcBills.$inferInsert;
