import { pgTable, bigserial, bigint, varchar, text, decimal, date, smallint, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { frequencyEnum, stopReasonEnum, assignmentStatusEnum } from "./enums.schema";
import { users } from "./users.schema";
import { followupCategories } from "./followup-categories.schema";

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
        id: bigserial("id", { mode: "number" }).primaryKey(),

        // EMD Relationship (optional - for financial instrument linking)
        emdId: bigint("emd_id", { mode: "number" }),

        // Basic Information
        area: varchar("area", { length: 255 }).notNull(),
        partyName: varchar("party_name", { length: 255 }).notNull(),
        amount: decimal("amount", { precision: 15, scale: 2 }).notNull().default("0.00"),

        // Category (FK to followup_categories)
        categoryId: bigint("category_id", { mode: "number" }).references(() => followupCategories.id, { onDelete: "set null" }),

        // Assignment
        assignedToId: bigint("assigned_to_id", { mode: "number" })
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        createdById: bigint("created_by_id", { mode: "number" })
            .notNull()
            .references(() => users.id, { onDelete: "restrict" }),
        assignmentStatus: assignmentStatusEnum("assignment_status").notNull().default("assigned"),

        // Content
        comment: text("comment"), // Initial comment at creation
        details: text("details"), // Detailed description
        latestComment: text("latest_comment"), // Most recent status update

        // Embedded Contacts (replaces follow_up_persons table)
        contacts: jsonb("contacts").$type<FollowUpContact[]>().notNull().default([]),

        // Scheduling
        frequency: frequencyEnum("frequency").notNull().default("daily"),
        startFrom: date("start_from").notNull(),
        nextFollowUpDate: date("next_follow_up_date"),
        followUpHistory: jsonb("follow_up_history").$type<FollowUpHistoryEntry[]>().notNull().default([]),
        reminderCount: smallint("reminder_count").notNull().default(1),

        // Closure/Stop
        stopReason: stopReasonEnum("stop_reason"),
        proofText: text("proof_text"),
        proofImagePath: varchar("proof_image_path", { length: 500 }),
        stopRemarks: text("stop_remarks"),

        // Attachments (array of file paths)
        attachments: jsonb("attachments").$type<string[]>().notNull().default([]),

        // Timestamps
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true })
            .notNull()
            .defaultNow()
            .$onUpdate(() => new Date()),
        deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
    },
    table => ({
        // Index for listing (ORDER BY start_from DESC)
        startFromIdx: index("idx_followups_start_from")
            .on(table.startFrom.desc())
            .where(sql`${table.deletedAt} IS NULL`),

        // Index for filtering by frequency
        frequencyIdx: index("idx_followups_frequency")
            .on(table.frequency)
            .where(sql`${table.deletedAt} IS NULL`),

        // Index for filtering stopped follow-ups by reason
        stopReasonIdx: index("idx_followups_stop_reason")
            .on(table.stopReason)
            .where(sql`${table.deletedAt} IS NULL AND ${table.frequency} = 'stopped'`),

        // Index for user's follow-ups
        assignedToIdx: index("idx_followups_assigned_to")
            .on(table.assignedToId)
            .where(sql`${table.deletedAt} IS NULL`),

        // Index for future follow-ups
        futureIdx: index("idx_followups_future")
            .on(table.startFrom)
            .where(sql`${table.deletedAt} IS NULL`),

        // Composite index for amount aggregation
        amountCalcIdx: index("idx_followups_amount_calc")
            .on(table.assignedToId, table.stopReason)
            .where(sql`${table.deletedAt} IS NULL`),

        // Index for EMD relationship
        emdIdx: index("idx_followups_emd")
            .on(table.emdId)
            .where(sql`${table.emdId} IS NOT NULL`),

        // Index for category
        categoryIdx: index("idx_followups_category").on(table.categoryId),

        // Index for created_by
        createdByIdx: index("idx_followups_created_by")
            .on(table.createdById)
            .where(sql`${table.deletedAt} IS NULL`),
    })
);

// Type exports
export type FollowUp = typeof followUps.$inferSelect;
export type NewFollowUp = typeof followUps.$inferInsert;
