import {
    pgTable,
    bigserial,
    bigint,
    text,
    timestamp,
    decimal,
    jsonb,
    pgEnum,
} from 'drizzle-orm/pg-core';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';

// Enum for bid submission status
export const bidSubmissionStatusEnum = pgEnum('bid_submission_status', [
    'Submission Pending',
    'Bid Submitted',
    'Tender Missed',
]);

// Type for document storage
export interface BidDocuments {
    submittedDocs: string[];      // Array of file paths (1-3 docs)
    submissionProof: string | null;
    finalPriceSs: string | null;
}

export const bidSubmissions = pgTable('bid_submissions', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenderId: bigint('tender_id', { mode: 'number' }).notNull().references(() => tenderInfos.id, { onDelete: 'cascade' }),
    status: bidSubmissionStatusEnum('status').notNull().default('Submission Pending'),

    // For Bid Submitted
    submissionDatetime: timestamp('submission_datetime', { withTimezone: true }),
    finalBiddingPrice: decimal('final_bidding_price', { precision: 15, scale: 2 }),

    // Documents stored in single JSON field
    documents: jsonb('documents').$type<BidDocuments>(),

    submittedBy: bigint('submitted_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),

    // For Tender Missed
    reasonForMissing: text('reason_for_missing'),
    preventionMeasures: text('prevention_measures'),
    tmsImprovements: text('tms_improvements'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type BidSubmission = typeof bidSubmissions.$inferSelect;
export type InsertBidSubmission = typeof bidSubmissions.$inferInsert;
