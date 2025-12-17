import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    text,
    timestamp,
    decimal,
    pgEnum,
    jsonb,
} from 'drizzle-orm/pg-core';

// Enum for costing sheet status
export const costingSheetStatusEnum = pgEnum('costing_sheet_status', [
    'Pending',
    'Submitted',
    'Approved',
    'Rejected/Redo',
]);

export const tenderCostingSheets = pgTable('tender_costing_sheets', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenderId: bigint('tender_id', { mode: 'number' }).notNull(),
    submittedBy: bigint('submitted_by', { mode: 'number' }),
    approvedBy: bigint('approved_by', { mode: 'number' }),

    // Google Sheet
    googleSheetUrl: varchar('google_sheet_url', { length: 500 }),
    googleSheetId: varchar('google_sheet_id', { length: 255 }),
    driveFolderId: varchar('drive_folder_id', { length: 255 }),
    sheetCreatedBy: varchar('sheet_created_by', { length: 255 }),
    sheetCreatedAt: timestamp('sheet_created_at', { withTimezone: true }),
    sheetTitle: varchar('sheet_title', { length: 255 }),

    // Submitted Values (by Tender Executive)
    submittedFinalPrice: decimal('submitted_final_price', { precision: 15, scale: 2 }),
    submittedReceiptPrice: decimal('submitted_receipt_price', { precision: 15, scale: 2 }),
    submittedBudgetPrice: decimal('submitted_budget_price', { precision: 15, scale: 2 }),
    submittedGrossMargin: decimal('submitted_gross_margin', { precision: 8, scale: 4 }),
    teRemarks: text('te_remarks'),

    // Approved Values (can overwrite submitted values)
    finalPrice: decimal('final_price', { precision: 15, scale: 2 }),
    receiptPrice: decimal('receipt_price', { precision: 15, scale: 2 }),
    budgetPrice: decimal('budget_price', { precision: 15, scale: 2 }),
    grossMargin: decimal('gross_margin', { precision: 8, scale: 4 }),
    oemVendorIds: jsonb('oem_vendor_ids').$type<number[]>(),

    // Approval Workflow
    status: costingSheetStatusEnum('status').default('Pending'),
    tlRemarks: text('tl_remarks'),
    rejectionReason: text('rejection_reason'),

    // Timestamps
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TenderCostingSheet = typeof tenderCostingSheets.$inferSelect;
export type InsertTenderCostingSheet = typeof tenderCostingSheets.$inferInsert;
