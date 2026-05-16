import { bigserial, integer, pgTable, bigint, varchar, timestamp, text, index } from "drizzle-orm/pg-core";
import { woDetails } from "./work-order.schema";

export const woKickoffMeetings = pgTable("wo_kickoff_meetings", {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    woDetailId: bigint("wo_detail_id", { mode: "number" }).notNull().unique()
        .references(() => woDetails.id, { onDelete: "cascade" }),

    meetingDate: timestamp("meeting_date", { withTimezone: true }),
    meetingLink: varchar("meeting_link", { length: 500 }),
    
    // Uploaded MOM
    momFilePath: varchar("mom_file_path", { length: 500 }),
    momUploadedAt: timestamp("mom_uploaded_at", { withTimezone: true }),
    momUploadedBy: bigint("mom_uploaded_by", { mode: "number" }),

    // Status: 'scheduled' | 'mom_uploaded'
    status: varchar("status", { length: 50 }).default('scheduled'),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdBy: bigint("created_by", { mode: "number" }),
    updatedBy: bigint("updated_by", { mode: "number" }),
}, (table) => [
    index("idx_wo_kickoff_meeting_wo_detail").on(table.woDetailId),
    index("idx_wo_kickoff_meeting_status").on(table.status),
]);

export type WoKickoffMeeting = typeof woKickoffMeetings.$inferSelect;
export type NewWoKickoffMeeting = typeof woKickoffMeetings.$inferInsert;
