import { sql } from "drizzle-orm";
import { pgTable, bigint, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";

export const accountChecklist = pgTable("account_checklist", {
    id: bigint("id", { mode: "number" })
        .primaryKey()
        .default(sql`nextval('account_checklist_id_seq')`),

    taskName: varchar("task_name", { length: 255 }).notNull(),

    frequency: varchar("frequency", { length: 255 }).notNull(),
    frequencyCondition: integer("frequency_condition"),

    responsibility: varchar("responsibility", { length: 255 }).notNull(),
    accountability: varchar("accountability", { length: 255 }).notNull(),

    description: text("description"),

    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});