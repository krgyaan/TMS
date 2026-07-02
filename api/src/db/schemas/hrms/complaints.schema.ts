import {
  pgTable, bigserial, bigint, varchar,
  integer, timestamp, text, jsonb, boolean, date
} from 'drizzle-orm/pg-core';

export const complaints = pgTable('hrms_complaints', {
  id:                     bigserial('id', { mode: 'number' }).primaryKey(),
  complaintCode:          varchar('complaint_code', { length: 50 }).notNull().unique(),
  complainantId:          bigint('complainant_id', { mode: 'number' }).notNull(),
  complaintType:          varchar('complaint_type', { length: 100 }).notNull(),
  complaintAgainstType:   varchar('complaint_against_type', { length: 50 }),
  complaintAgainstId:     bigint('complaint_against_id', { mode: 'number' }),
  complaintAgainstDept:   varchar('complaint_against_dept', { length: 255 }),
  subject:                varchar('subject', { length: 500 }).notNull(),
  description:            text('description').notNull(),
  priority:               varchar('priority', { length: 20 }).notNull().default('medium'),
  incidentAt:             timestamp('incident_at', { withTimezone: true }),
  incidentLocation:       varchar('incident_location', { length: 255 }),
  previousAttempts:       text('previous_attempts'),
  witnesses:              text('witnesses'),
  supportingDocs:         jsonb('supporting_docs').default([]),
  expectedResolution:     text('expected_resolution'),
  status:                 varchar('status', { length: 50 }).notNull().default('submitted'),
  assignedTo:             bigint('assigned_to', { mode: 'number' }),
  acknowledgmentDate:     timestamp('acknowledgment_date', { withTimezone: true }),
  investigationStartDate: date('investigation_start_date'),
  targetResolutionDate:   date('target_resolution_date'),
  statusUpdatedAt:        timestamp('status_updated_at', { withTimezone: true }),
  resolutionSummary:      text('resolution_summary'),
  actionTaken:            text('action_taken'),
  correctiveMeasures:     text('corrective_measures'),
  preventiveMeasures:     text('preventive_measures'),
  resolvedBy:             bigint('resolved_by', { mode: 'number' }),
  resolvedAt:             timestamp('resolved_at', { withTimezone: true }),
  satisfactionRating:     integer('satisfaction_rating'),
  feedbackComments:       text('feedback_comments'),
  reopenRequested:        boolean('reopen_requested').default(false),
  reopenReason:           text('reopen_reason'),
  createdAt:              timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:              timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Complaint = typeof complaints.$inferSelect;
export type NewComplaint = typeof complaints.$inferInsert;
