import { pgTable, serial, integer, bigint, varchar, text, jsonb, timestamp, index } from "drizzle-orm/pg-core";
import { projects } from "@/db/schemas/master/projects.schema";
import { users } from "@/db/schemas/auth/users.schema";
import { tallyLedgers } from "@/db/schemas/integrations/tally-ledgers.schema";

export const employeeImprests = pgTable(
    "employee_imprests",
    {
        id: serial("id").primaryKey(),
        userId: integer("user_id"),
        categoryId: bigint("category_id", { mode: "number" }),
        teamId: integer("team_id"),
        partyName: varchar("party_name", { length: 255 }),
        projectId: bigint("project_id", { mode: "number" }).references(() => projects.id, {
            onDelete: "set null",
        }),
        projectName: varchar("project_name", { length: 255 }),
        amount: integer("amount"),
        remark: text("remark").notNull(),
        invoiceProof: jsonb("invoice_proof").notNull().default([]),
        approvalStatus: integer("approval_status").notNull().default(0),
        tallyStatus: integer("tally_status").notNull().default(0),
        tallyLedgerId: bigint("tally_ledger_id", { mode: "number" }).references(() => tallyLedgers.id, {
            onDelete: "set null",
        }),
        tallyLedgerSource: varchar("tally_ledger_source", { length: 10 }).notNull().default("auto"),
        tallyLedgerReviewedBy: bigint("tally_ledger_reviewed_by", { mode: "number" }).references(() => users.id, {
            onDelete: "set null",
        }),
        tallyLedgerReviewedAt: timestamp("tally_ledger_reviewed_at", { withTimezone: true }),
        tallyLedgerNote: varchar("tally_ledger_note", { length: 500 }),
        proofStatus: integer("proof_status").notNull().default(0),
        status: integer("status").notNull().default(1),
        dateOfExpense: timestamp("date_of_expense", { withTimezone: true }).notNull(),
        accRemark: text("acc_remark"),
        approvedDate: timestamp("approved_date", { withTimezone: true }),
        insurancePolicyId: integer("insurance_policy_id"),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [index("idx_employee_imprests_tally_ledger").on(table.tallyLedgerId)]
);

export type EmployeeImprest = typeof employeeImprests.$inferSelect;
export type NewEmployeeImprest = typeof employeeImprests.$inferInsert;
