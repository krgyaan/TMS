import { pgEnum } from 'drizzle-orm/pg-core';
import {
    pgTable,
    bigserial,
    bigint,
    text,
    timestamp,
    decimal,
} from 'drizzle-orm/pg-core';

// Enum for costing sheet status (shared with tender_costing_details)
export const costingSheetStatusEnum = pgEnum('costing_sheet_status', [
    'Pending',
    'Submitted',
    'Approved',
    'Rejected/Redo',
]);

export const tenderCostingDetails = pgTable('tender_costing_details', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenderCostingSheetId: bigint('tender_costing_sheets_id', { mode: 'number' }).notNull(),

    // Submitted Values (by Tender Executive)
    submittedFinalPrice: decimal('submitted_final_price', { precision: 15, scale: 2 }),
    submittedReceiptPrice: decimal('submitted_receipt_price', { precision: 15, scale: 2 }),
    submittedBudgetPrice: decimal('submitted_budget_price', { precision: 15, scale: 2 }),
    submittedGrossMargin: decimal('submitted_gross_margin', { precision: 8, scale: 4 }),
    teRemarks: text('te_remarks'),
    submittedBy: bigint('submitted_by', { mode: 'number' }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }),

    // Approved Values (by Team Leader)
    finalPrice: decimal('final_price', { precision: 15, scale: 2 }),
    receiptPrice: decimal('receipt_price', { precision: 15, scale: 2 }),
    budgetPrice: decimal('budget_price', { precision: 15, scale: 2 }),
    grossMargin: decimal('gross_margin', { precision: 8, scale: 4 }),
    tlRemarks: text('tl_remarks'),
    rejectionReason: text('rejection_reason'),
    approvedBy: bigint('approved_by', { mode: 'number' }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),

    // Workflow
    status: costingSheetStatusEnum('status').default('Pending'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TenderCostingDetail = typeof tenderCostingDetails.$inferSelect;
export type InsertTenderCostingDetail = typeof tenderCostingDetails.$inferInsert;
