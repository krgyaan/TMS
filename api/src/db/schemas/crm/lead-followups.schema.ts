import {
    pgTable,
    bigint,
    text,
    json,
    timestamp,
    varchar,
    pgEnum,
} from "drizzle-orm/pg-core";
import { leads } from "./leads.schema";
import { happyCalling } from "./happy-calling.schema";
import { leadEnquiries } from "./lead-enquiries.schema";
import { users } from "../auth/users.schema";

export const followupTypeEnum = pgEnum('followup_type', [
    'mail',
    'call',
    'visit',
    'letter',
    'whatsapp',
]);

export const mailFrequencyEnum = pgEnum('mail_frequency', [
    'daily',
    'weekly',
    'monthly',
    'custom',
]);

export const leadFollowups = pgTable("lead_followups", {
    id: bigint("id", { mode: "number" }).primaryKey().generatedAlwaysAsIdentity(),

    leadId: bigint("lead_id", { mode: "number" })
        .references(() => leads.id, { onDelete: "cascade" }),

    happyCallingId: bigint("happy_calling_id", { mode: "number" })
        .references(() => happyCalling.id, { onDelete: "cascade" }),

    enquiryId: bigint("enquiry_id", { mode: "number" })
        .references(() => leadEnquiries.id, { onDelete: "cascade" }),

    sourceType: varchar("source_type", { length: 50 }).notNull().default('lead'),

    type: followupTypeEnum("type").notNull(),

    // ── Universal Fields ───────────────────────────────────────────────
    // Mail     → mail body
    // Call     → points discussed
    // Visit    → points discussed
    // WhatsApp → what was sent
    body: text("body"),

    // Call / Visit only
    veResponsibility: text("ve_responsibility"),

    // Mail / WhatsApp / Letter soft copy
    // Stored as JSON array: ["uploads/file1.pdf", "uploads/file2.jpg"]
    attachments: json("attachments").$type<string[]>().default([]),

    // All types
    nextFollowupDate: timestamp("next_followup_date", { withTimezone: true }),

    // ── Mail-specific ──────────────────────────────────────────────────
    frequency: mailFrequencyEnum("frequency"),
    subject: varchar("subject", { length: 500 }),

    // ── Letter-specific ────────────────────────────────────────────────
    // Links to existing courier_dashboards table
    courierId: bigint("courier_id", { mode: "number" }),

    // ── Status / stop (recurring follow-up turn-off) ───────────────────
    status: varchar("status", { length: 50 }).notNull().default('active'),
    stopReason: varchar("stop_reason", { length: 255 }),
    stoppedAt: timestamp("stopped_at", { withTimezone: true }),

    // ── Metadata ──────────────────────────────────────────────────────
    createdBy: bigint("created_by", { mode: "number" })
        .references(() => users.id, { onDelete: "set null" }),

    createdAt: timestamp("created_at", { withTimezone: true })
        .defaultNow()
        .notNull(),

    updatedAt: timestamp("updated_at", { withTimezone: true })
        .defaultNow()
        .notNull(),
});

export type LeadFollowup = typeof leadFollowups.$inferSelect;
export type NewLeadFollowup = typeof leadFollowups.$inferInsert;