import { pgTable, bigint, varchar, text, timestamp } from "drizzle-orm/pg-core";

export const woAcceptanceYes = pgTable("wo_acceptance_yes", {
    id: bigint("id", { mode: "number" }).primaryKey(),
    basicDetailId: bigint("basic_detail_id", { mode: "number" }),

    woYes: varchar("wo_yes", { length: 1 }).notNull(),

    pageNo: text("page_no"),
    clauseNo: text("clause_no"),
    currentStatement: text("current_statement"),
    correctedStatement: text("corrected_statement"),

    acceptedInitiate: varchar("accepted_initiate", { length: 20 }),
    acceptedSigned: varchar("accepted_signed", { length: 500 }),
    followupFrequency: varchar("followup_frequency", { length: 255 }),

    status: varchar("status", { length: 1 }).notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
});

export type WoAcceptanceYes = typeof woAcceptanceYes.$inferSelect;
export type NewWoAcceptanceYes = typeof woAcceptanceYes.$inferInsert;
