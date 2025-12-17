import { pgTable, serial, integer, varchar, text, date, timestamp } from "drizzle-orm/pg-core";

export const employeeImprestTransactions = pgTable("employee_imprest_transactions", {
    id: serial("id").primaryKey(),

    userId: integer("user_id").notNull(),

    txnDate: date("txn_date").notNull(),
    teamMemberName: varchar("team_member_name", { length: 255 }).notNull(),
    amount: integer("amount"),

    projectName: varchar("project_name", { length: 255 }).notNull(),

    approvalStatus: integer("approval_status").notNull().default(0),
    status: integer("status").notNull().default(1),

    ip: varchar("ip", { length: 255 }),
    strtotime: integer("strtotime"),

    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
});
