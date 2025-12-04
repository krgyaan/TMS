import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    text,
    timestamp,
    integer,
    pgEnum,
} from 'drizzle-orm/pg-core';
import { tenderInfos } from './tenders.schema';
import { users } from './users.schema';
import { tqTypes } from './tq-types.schema';

// Enum for TQ status
export const tqStatusEnum = pgEnum('tq_status', [
    'Received',
    'Replied',
    'Missed',
]);

export const tenderQueries = pgTable('tender_queries', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenderId: bigint('tender_id', { mode: 'number' }).notNull().references(() => tenderInfos.id, { onDelete: 'cascade' }),

    // TQ Received Info
    tqSubmissionDeadline: timestamp('tq_submission_deadline', { withTimezone: true }).notNull(),
    tqDocumentReceived: varchar('tq_document_received', { length: 500 }),
    receivedBy: bigint('received_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
    receivedAt: timestamp('received_at', { withTimezone: true }),

    // TQ Status Flow
    status: tqStatusEnum('status').default('Received'),

    // TQ Replied Info
    repliedDatetime: timestamp('replied_datetime', { withTimezone: true }),
    repliedDocument: varchar('replied_document', { length: 500 }),
    proofOfSubmission: varchar('proof_of_submission', { length: 500 }),
    repliedBy: bigint('replied_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
    repliedAt: timestamp('replied_at', { withTimezone: true }),

    // TQ Missed Info
    missedReason: text('missed_reason'),
    preventionMeasures: text('prevention_measures'),
    tmsImprovements: text('tms_improvements'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// TQ Query Items (normalized from JSON)
export const tenderQueryItems = pgTable('tender_query_items', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenderQueryId: bigint('tender_query_id', { mode: 'number' }).notNull().references(() => tenderQueries.id, { onDelete: 'cascade' }),
    srNo: integer('sr_no').notNull(),
    tqTypeId: bigint('tq_type_id', { mode: 'number' }).references(() => tqTypes.id, { onDelete: 'set null' }),
    queryDescription: text('query_description').notNull(),
    response: text('response'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});


export type TenderQuery = typeof tenderQueries.$inferSelect;
export type InsertTenderQuery = typeof tenderQueries.$inferInsert;
export type TenderQueryItem = typeof tenderQueryItems.$inferSelect;
export type InsertTenderQueryItem = typeof tenderQueryItems.$inferInsert;
