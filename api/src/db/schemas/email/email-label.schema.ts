import { pgTable, bigserial, varchar, bigint, timestamp, unique } from 'drizzle-orm/pg-core';

export const emailLabels = pgTable('email_labels', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    userId: bigint('user_id', { mode: 'number' }).notNull(),
    labelName: varchar('label_name', { length: 255 }).notNull(),
    gmailLabelId: varchar('gmail_label_id', { length: 100 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => ([
    {
        uniqueUserLabel: unique().on(table.userId, table.labelName),
    },
]));

export type EmailLabel = typeof emailLabels.$inferSelect;
export type NewEmailLabel = typeof emailLabels.$inferInsert;
