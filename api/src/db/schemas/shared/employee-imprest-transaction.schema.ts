import { pgTable, serial, integer, varchar, text, date, timestamp } from "drizzle-orm/pg-core";

export const employeeImprestTransactions = pgTable("employee_imprest_transactions", {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull(),
    txnDate: date("txn_date").notNull(),
    teamMemberName: varchar("team_member_name", { length: 255 }).notNull(),
    amount: integer("amount"),
    projectName: varchar("project_name", { length: 255 }).notNull(),
    status: integer("status").notNull().default(1),
    imprestId: integer("imprest_id"),
    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
});
