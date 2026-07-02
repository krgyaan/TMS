import { sql } from "drizzle-orm";
import { pgTable, bigint, varchar, timestamp } from "drizzle-orm/pg-core";
import { accountChecklist } from "./account-checklist";

export const accountChecklistReport = pgTable("account_checklist_report", {
    id: bigint("id", { mode: "number" })
        .primaryKey()
        .default(sql`nextval('account_checklist_report_id_seq')`),

    checklistId: bigint("checklist_id", { mode: "number" })
        .notNull()
        .references(() => accountChecklist.id),

    responsibleUserId: bigint("responsible_user_id", { mode: "number" }),
    accountableUserId: bigint("accountable_user_id", { mode: "number" }),

    dueDate: timestamp("due_date", { withTimezone: true }),

    respCompletedAt: timestamp("resp_completed_at", { withTimezone: true }),
    accCompletedAt: timestamp("acc_completed_at", { withTimezone: true }),

    respRemark: varchar("resp_remark", { length: 2000 }),
    respResultFile: varchar("resp_result_file", { length: 255 }),

    accRemark: varchar("acc_remark", { length: 2000 }),
    accResultFile: varchar("acc_result_file", { length: 255 }),

    respTimer: varchar("resp_timer", { length: 300 }).default("0"),
    accTimer: varchar("acc_timer", { length: 300 }).default("0"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});