import { pgTable, bigserial, bigint, text, varchar, timestamp, decimal, jsonb, index } from 'drizzle-orm/pg-core';
import { tenderResults } from './tender-result.schema';

export const tenderResultDetails = pgTable(
    'tender_result_details',
    {
        id: bigserial('id', { mode: 'number' }).primaryKey(),
        tenderResultId: bigint('tender_result_id', { mode: 'number' })
            .notNull()
            .references(() => tenderResults.id),

        result: varchar('result', { length: 50 }),
        l1Price: decimal('l1_price', { precision: 15, scale: 2 }),
        l2Price: decimal('l2_price', { precision: 15, scale: 2 }),
        ourPrice: decimal('our_price', { precision: 15, scale: 2 }),
        qualifiedPartiesScreenshot: jsonb('qualified_parties_screenshot').$type<string[]>(),
        finalResultScreenshot: jsonb('final_result_screenshot').$type<string[]>(),
        resultUploadedAt: timestamp('result_uploaded_at', { withTimezone: true }),
        resultReason: text('result_reason'),

        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    (table) => [
        index('tender_result_details_result_id_idx').on(table.tenderResultId),
    ]
);

export type TenderResultDetail = typeof tenderResultDetails.$inferSelect;
export type InsertTenderResultDetail = typeof tenderResultDetails.$inferInsert;
