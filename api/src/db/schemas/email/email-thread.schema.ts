import { pgTable, bigserial, varchar, bigint, timestamp, unique } from 'drizzle-orm/pg-core';

export const emailThreads = pgTable('email_threads', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    referenceType: varchar('reference_type', { length: 50 }).notNull(),
    referenceId: bigint('reference_id', { mode: 'number' }).notNull(),
    gmailThreadId: varchar('gmail_thread_id', { length: 100 }),
    messageId: varchar('message_id', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => ([
    {
        uniqueRef: unique().on(table.referenceType, table.referenceId),
    },
]));

export type EmailThread = typeof emailThreads.$inferSelect;
export type NewEmailThread = typeof emailThreads.$inferInsert;
