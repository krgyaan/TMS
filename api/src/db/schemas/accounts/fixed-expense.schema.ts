import { pgTable, bigserial, bigint, boolean, varchar, numeric, date, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "@db/schemas/auth";
import { paymentCategory } from "@db/schemas/master/payment-category.schema";

// ===================== TABLES =====================

export const fixedExpenses = pgTable(
    "fixed_expenses",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),

        // Party / payee details
        partyName: varchar("party_name", { length: 255 }).notNull(),

        // Amount: fixed | variable
        amountType: varchar("amount_type", { length: 20 }).notNull().default("fixed"),
        amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),

        // Payment: auto_debit | bank_transfer
        paymentMode: varchar("payment_mode", { length: 30 }).notNull().default("auto_debit"),

        // Bank account details (required when paymentMode = bank_transfer)
        accountName: varchar("account_name", { length: 255 }),
        accountNumber: varchar("account_number", { length: 100 }),
        ifscCode: varchar("ifsc_code", { length: 50 }),

        // Classification & schedule
        type: varchar("type", { length: 100 }).notNull(),
        subCategory: varchar("sub_category", { length: 100 }),
        categoryId: bigint("category_id", { mode: "number" }).references(() => paymentCategory.id),
        dueDate: date("due_date").notNull(),
        paymentFrequency: varchar("payment_frequency", { length: 20 }).notNull().default("monthly"),

        // Workflow status (New, ...)
        status: varchar("status", { length: 30 }).notNull().default("New"),

        // Archive flag: true = archived (soft deleted)
        deleteStatus: boolean("delete_status").notNull().default(false),

        // Linked maker request (project_payment_requests.id). The FK is created
        // in migration 0165; kept reference-free here to avoid a circular import.
        makerId: bigint("maker_id", { mode: "number" }),

        // Audit
        createdBy: bigint("created_by", { mode: "number" })
            .notNull()
            .references(() => users.id),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [index("idx_fixed_expenses_type").on(table.type), index("idx_fixed_expenses_due_date").on(table.dueDate)]
);

// ===================== RELATIONS =====================

export const fixedExpensesRelations = relations(fixedExpenses, ({ one }) => ({
    creator: one(users, {
        fields: [fixedExpenses.createdBy],
        references: [users.id],
        relationName: "fixedExpenseCreator",
    }),
    category: one(paymentCategory, {
        fields: [fixedExpenses.categoryId],
        references: [paymentCategory.id],
        relationName: "fixedExpenseCategory",
    }),
}));

// ===================== TYPES =====================

export type FixedExpense = typeof fixedExpenses.$inferSelect;
export type NewFixedExpense = typeof fixedExpenses.$inferInsert;
