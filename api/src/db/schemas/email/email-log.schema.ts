import { pgTable, bigserial, varchar, bigint, timestamp, text, jsonb, integer } from 'drizzle-orm/pg-core';

export const emailLogs = pgTable('email_logs', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    referenceType: varchar('reference_type', { length: 50 }),
    referenceId: bigint('reference_id', { mode: 'number' }),
    eventType: varchar('event_type', { length: 100 }),
    fromUserId: bigint('from_user_id', { mode: 'number' }),
    fromEmail: varchar('from_email', { length: 255 }).notNull(),
    toEmails: jsonb('to_emails').notNull().$type<string[]>(),
    ccEmails: jsonb('cc_emails').$type<string[]>(),
    subject: varchar('subject', { length: 500 }).notNull(),
    templateName: varchar('template_name', { length: 100 }),
    templateData: jsonb('template_data').$type<Record<string, any>>(),
    bodyHtml: text('body_html'),
    labelPath: varchar('label_path', { length: 255 }),
    status: varchar('status', { length: 20 }).default('pending'),
    gmailMessageId: varchar('gmail_message_id', { length: 100 }),
    gmailThreadId: varchar('gmail_thread_id', { length: 100 }),
    errorMessage: text('error_message'),
    attempts: integer('attempts').default(0),
    lastAttemptAt: timestamp('last_attempt_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type NewEmailLog = typeof emailLogs.$inferInsert;
