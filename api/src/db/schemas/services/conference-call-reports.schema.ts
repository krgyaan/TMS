import { pgTable, bigserial, bigint, varchar, text, timestamp, index, jsonb } from "drizzle-orm/pg-core";

export const conferenceCallReports = pgTable(
    "service_conference_call_reports",
    {
        id: bigserial("id", { mode: "number" }).primaryKey(),
        complaintId: bigint("complaint_id", { mode: "number" }).notNull(),
        issueDescription: text("issue_description").notNull(),
        materialsRequired: text("materials_required"),
        actionsPlanned: text("actions_planned"),
        voiceRecordingPath: varchar("voice_recording_path", { length: 255 }),
        attachments: jsonb("attachments"),
        createdBy: bigint("created_by", { mode: "number" }),
        createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    },
    table => [
        index("fk_ccr_complaint_id").on(table.complaintId),
    ],
);

export type ConferenceCallReport = typeof conferenceCallReports.$inferSelect;
export type NewConferenceCallReport = typeof conferenceCallReports.$inferInsert;