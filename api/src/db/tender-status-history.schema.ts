import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    text,
    timestamp,
} from 'drizzle-orm/pg-core';
import { tenderInfos } from './tenders.schema';
import { statuses } from './statuses.schema';
import { users } from './users.schema';

export const tenderStatusHistory = pgTable('tender_status_history', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenderId: bigint('tender_id', { mode: 'number' })
        .notNull()
        .references(() => tenderInfos.id, { onDelete: 'cascade' }),
    prevStatus: bigint('prev_status', { mode: 'number' })
        .references(() => statuses.id),
    newStatus: bigint('new_status', { mode: 'number' })
        .notNull()
        .references(() => statuses.id),
    comment: text('comment'),
    changedBy: bigint('changed_by', { mode: 'number' })
        .notNull()
        .references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export type TenderStatusHistory = typeof tenderStatusHistory.$inferSelect;
export type NewTenderStatusHistory = typeof tenderStatusHistory.$inferInsert;
