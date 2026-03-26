import {
  pgTable, bigserial, bigint, varchar,
  date, timestamp, text, jsonb, boolean, integer
} from 'drizzle-orm/pg-core';

export const exitWorkflows = pgTable('hrms_exit_workflows', {
  id:                    bigserial('id', { mode: 'number' }).primaryKey(),
  userId:                bigint('user_id', { mode: 'number' }).notNull().unique(),
  resignationDate:       date('resignation_date').notNull(),
  lastWorkingDay:        date('last_working_day').notNull(),
  noticePeriodDays:      integer('notice_period_days'),
  exitReason:            varchar('exit_reason', { length: 50 }).notNull(),
  exitReasonDetail:      text('exit_reason_detail'),
  resignationEmailUrl:   varchar('resignation_email_url', { length: 500 }),
  acceptanceEmailUrl:    varchar('acceptance_email_url', { length: 500 }),
  clearanceStatus:       jsonb('clearance_status').default({}),
  handoverDocUrl:        varchar('handover_doc_url', { length: 500 }),
  projectStatusUrl:      varchar('project_status_url', { length: 500 }),
  clientTransitionUrl:   varchar('client_transition_url', { length: 500 }),
  handoverApprovedBy:    bigint('handover_approved_by', { mode: 'number' }),
  handoverApprovedAt:    timestamp('handover_approved_at', { withTimezone: true }),
  assetsReturned:        boolean('assets_returned').default(false),
  assetReturnRemarks:    text('asset_return_remarks'),
  salaryTillLwd:         boolean('salary_till_lwd').default(false),
  leaveEncashment:       boolean('leave_encashment').default(false),
  incentivesSettled:     boolean('incentives_settled').default(false),
  noticePeriodRecovery:  boolean('notice_period_recovery').default(false),
  ffStatus:              varchar('ff_status', { length: 20 }).notNull().default('pending'),
  ffCompletedAt:         timestamp('ff_completed_at', { withTimezone: true }),
  exitInterviewDone:     boolean('exit_interview_done').default(false),
  exitFeedbackUrl:       varchar('exit_feedback_url', { length: 500 }),
  exitReasonCategory:    varchar('exit_reason_category', { length: 100 }),
  experienceLetterUrl:   varchar('experience_letter_url', { length: 500 }),
  relievingLetterUrl:    varchar('relieving_letter_url', { length: 500 }),
  documentsIssuedAt:     timestamp('documents_issued_at', { withTimezone: true }),
  initiatedBy:           bigint('initiated_by', { mode: 'number' }),
  exitCompletedAt:       timestamp('exit_completed_at', { withTimezone: true }),
  createdAt:             timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:             timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ExitWorkflow = typeof exitWorkflows.$inferSelect;
export type NewExitWorkflow = typeof exitWorkflows.$inferInsert;
