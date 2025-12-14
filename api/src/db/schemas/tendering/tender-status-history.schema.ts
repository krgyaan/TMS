import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    text,
    timestamp,
} from 'drizzle-orm/pg-core';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { statuses } from '@db/schemas/master/statuses.schema';
import { users } from '@db/schemas/auth/users.schema';

export const tenderStatusHistory = pgTable('tender_status_history', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenderId: bigint('tender_id', { mode: 'number' }).notNull(),
    prevStatus: bigint('prev_status', { mode: 'number' }),
    newStatus: bigint('new_status', { mode: 'number' }).notNull(),
    comment: text('comment'),
    changedBy: bigint('changed_by', { mode: 'number' }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export type TenderStatusHistory = typeof tenderStatusHistory.$inferSelect;
export type NewTenderStatusHistory = typeof tenderStatusHistory.$inferInsert;
