import { pgTable, bigserial, bigint, varchar, text, decimal, date, smallint, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { frequencyEnum, stopReasonEnum, assignmentStatusEnum } from "./enums.schema";
import { users } from "../auth/users.schema";

// JSONB Type Definitions
export interface FollowUpContact {
    name: string;
    email: string | null;
    phone: string | null;
    org: string | null;
    addedAt: string; // ISO timestamp
}

export interface FollowUpHistoryEntry {
    date: string; // The scheduled date that was changed
    changedAt: string; // When the change was made
    changedById: number; // User ID who made the change
    changedByName: string; // User name (denormalized for display)
}

// Main follow_ups table
export const followUps = pgTable(
    "follow_ups",
    {
        id: bigint("id", { mode: "number" })
            .primaryKey()
            .default(sql`nextval('follow_ups_id_seq')`),

        emdId: bigint("emd_id", { mode: "number" }),

        area: varchar("area", { length: 255 }).notNull(),
        partyName: varchar("party_name", { length: 255 }).notNull(),
        amount: decimal("amount", { precision: 15, scale: 2 }).notNull().default("0.00"),

        // Foreign keys removed
        followupFor: varchar("followup_for", { length: 255 }),

        assignedToId: bigint("assigned_to_id", { mode: "number" }),
        createdById: bigint("created_by_id", { mode: "number" }),

        // assignment status now varchar
        assignmentStatus: varchar("assignment_status", { length: 255 }),

        comment: text("comment"),
        details: text("details"),
        latestComment: text("latest_comment"),

        contacts: jsonb("contacts").$type<FollowUpContact[]>().notNull().default([]),

        // frequency no longer enum
        frequency: smallint("frequency"),

        startFrom: date("start_from"),
        nextFollowUpDate: date("next_follow_up_date"),

        followUpHistory: jsonb("follow_up_history").$type<FollowUpHistoryEntry[]>().notNull().default([]),

        reminderCount: smallint("reminder_count").notNull().default(1),

        // stop_reason no longer enum
        stopReason: smallint("stop_reason"),

        proofText: text("proof_text"),
        proofImagePath: varchar("proof_image_path", { length: 500 }),
        stopRemarks: text("stop_remarks"),

        attachments: jsonb("attachments").$type<string[]>().notNull().default([]),

        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
        deletedAt: timestamp("deleted_at", { withTimezone: true }),
    },
    table => ({
        startFromIdx: index("idx_followups_start_from")
            .on(table.startFrom.desc())
            .where(sql`${table.deletedAt} IS NULL`),

        assignedToIdx: index("idx_followups_assigned_to")
            .on(table.assignedToId)
            .where(sql`${table.deletedAt} IS NULL`),

        createdByIdx: index("idx_followups_created_by")
            .on(table.createdById)
            .where(sql`${table.deletedAt} IS NULL`),

        futureIdx: index("idx_followups_future")
            .on(table.startFrom)
            .where(sql`${table.deletedAt} IS NULL`),

        emdIdx: index("idx_followups_emd")
            .on(table.emdId)
            .where(sql`${table.emdId} IS NOT NULL`),
    })
);

// Type exports
export type FollowUp = typeof followUps.$inferSelect;
export type NewFollowUp = typeof followUps.$inferInsert;
