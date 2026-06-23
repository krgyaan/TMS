import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    timestamp,
    pgEnum,
    jsonb,
} from 'drizzle-orm/pg-core';

export const tenderCostingSheets = pgTable('tender_costing_sheets', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenderId: bigint('tender_id', { mode: 'number' }).notNull(),

    // Google Sheet
    googleSheetUrl: varchar('google_sheet_url', { length: 500 }),
    googleSheetId: varchar('google_sheet_id', { length: 255 }),
    driveFolderId: varchar('drive_folder_id', { length: 255 }),
    sheetCreatedBy: varchar('sheet_created_by', { length: 255 }),
    sheetCreatedAt: timestamp('sheet_created_at', { withTimezone: true }),
    sheetTitle: varchar('sheet_title', { length: 255 }),

    // Tender-level TL selections
    oemVendorIds: jsonb('oem_vendor_ids').$type<number[]>(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TenderCostingSheet = typeof tenderCostingSheets.$inferSelect;
export type InsertTenderCostingSheet = typeof tenderCostingSheets.$inferInsert;
