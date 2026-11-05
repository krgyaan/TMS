import { pgTable, bigserial, bigint, varchar, numeric, date, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "@db/schemas/auth";
import { fixedExpenses } from "./fixed-expense.schema";

// ===================== STATUSES =====================

export const FIXED_EXPENSE_HISTORY_STATUSES = ["Awaited Maker", "Maker Created", "Maker Done", "Payment Done", "Maker Rejected"] as const;

export type FixedExpenseHistoryStatus = (typeof FIXED_EXPENSE_HISTORY_STATUSES)[number];

/** Maps a payment request status to the fixed expense history status. */
export const MR_STATUS_TO_HISTORY_STATUS: Record<string, FixedExpenseHistoryStatus> = {
    pending: "Maker Created",
    maker_done: "Maker Done",
    payment_done: "Payment Done",
    rejected: "Maker Rejected",
};

// ===================== TABLE =====================

export const fixedExpensesHistory = pgTable(
    "fixed_expenses_history",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),

        // One workflow row per fixed expense.
        expenseId: bigint("expense_id", { mode: "number" })
            .notNull()
            .unique()
            .references(() => fixedExpenses.id, { onDelete: "cascade" }),

        // Snapshot of the fixed expense
        partyName: varchar("party_name", { length: 255 }).notNull(),
        amountType: varchar("amount_type", { length: 20 }).notNull().default("fixed"),
        amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
        paymentMode: varchar("payment_mode", { length: 30 }).notNull().default("auto_debit"),
        accountName: varchar("account_name", { length: 255 }),
        accountNumber: varchar("account_number", { length: 100 }),
        ifscCode: varchar("ifsc_code", { length: 50 }),
        categoryId: bigint("category_id", { mode: "number" }),
        dueDate: date("due_date").notNull(),
        paymentFrequency: varchar("payment_frequency", { length: 20 }).notNull().default("monthly"),
        makerId: bigint("maker_id", { mode: "number" }),

        // Workflow
        status: varchar("status", { length: 30 }).notNull().default("Awaited Maker"),
        updatedBy: bigint("updated_by", { mode: "number" }).references(() => users.id),

        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [index("idx_fixed_expenses_history_status").on(table.status)]
);

// ===================== TYPES =====================

export type FixedExpenseHistory = typeof fixedExpensesHistory.$inferSelect;
export type NewFixedExpenseHistory = typeof fixedExpensesHistory.$inferInsert;
