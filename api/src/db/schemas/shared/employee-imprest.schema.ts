import { pgTable, serial, integer, bigint, varchar, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const employeeImprests = pgTable("employee_imprests", {
    id: serial("id").primaryKey(),
    userId: integer("user_id"),
    categoryId: bigint("category_id", { mode: "number" }),
    teamId: integer("team_id"),
    partyName: varchar("party_name", { length: 255 }),
    projectName: varchar("project_name", { length: 255 }),
    amount: integer("amount"),
    remark: text("remark"),
    invoiceProof: jsonb("invoice_proof").notNull().default([]),
    approvalStatus: integer("approval_status").notNull().default(0),
    tallyStatus: integer("tally_status").notNull().default(0),
    proofStatus: integer("proof_status").notNull().default(0),
    status: integer("status").notNull().default(1),
    dateOfExpense: timestamp("date_of_expense", {withTimezone : true}),
    accRemark : text('acc_remark'),
    approvedDate: timestamp("approved_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
