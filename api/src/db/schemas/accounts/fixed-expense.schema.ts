import { pgTable, bigserial, bigint, boolean, varchar, numeric, date, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users } from "@db/schemas/auth";

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
        type: varchar("type", { length: 50 }).notNull(),
        dueDate: date("due_date").notNull(),
        paymentFrequency: varchar("payment_frequency", { length: 20 }).notNull().default("monthly"),

        // Workflow status (New, ...)
        status: varchar("status", { length: 30 }).notNull().default("New"),

        // Archive flag: true = archived (soft deleted)
        deleteStatus: boolean("delete_status").notNull().default(false),

        // Reserved for the future maker-checker workflow
        makerId: bigint("maker_id", { mode: "number" }).references(() => users.id),

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
    maker: one(users, {
        fields: [fixedExpenses.makerId],
        references: [users.id],
        relationName: "fixedExpenseMaker",
    }),
}));

// ===================== TYPES =====================

export type FixedExpense = typeof fixedExpenses.$inferSelect;
export type NewFixedExpense = typeof fixedExpenses.$inferInsert;
