import {
  pgTable, bigserial, bigint, varchar,
  numeric, date, timestamp, jsonb, text
} from 'drizzle-orm/pg-core';

export const employeeAssets = pgTable('hrms_employee_assets', {
  id:                  bigserial('id', { mode: 'number' }).primaryKey(),
  userId:              bigint('user_id', { mode: 'number' }).notNull(),
  assetCode:           varchar('asset_code', { length: 100 }).notNull().unique(),
  assetType:           varchar('asset_type', { length: 50 }).notNull(),
  assetCategory:       varchar('asset_category', { length: 50 }),
  brand:               varchar('brand', { length: 255 }),
  model:               varchar('model', { length: 255 }),
  specifications:      text('specifications'),
  serialNumber:        varchar('serial_number', { length: 255 }),
  imeiNumber:          varchar('imei_number', { length: 50 }),
  licenseKey:          varchar('license_key', { length: 500 }),
  assetValue:          numeric('asset_value', { precision: 12, scale: 2 }),
  assetCondition:      varchar('asset_condition', { length: 20 }).default('1'),
  purchaseDate:        date('purchase_date'),
  purchasePrice:       numeric('purchase_price', { precision: 12, scale: 2 }),
  purchaseFrom:        varchar('purchase_from', { length: 255 }),
  assignedDate:        date('assigned_date').notNull(),
  assignedBy:          bigint('assigned_by', { mode: 'number' }),
  expectedReturnDate:  date('expected_return_date'),
  purpose:             text('purpose'),
  assetLocation:       varchar('asset_location', { length: 255 }),
  warrantyFrom:        date('warranty_from'),
  warrantyTo:          date('warranty_to'),
  insuranceDetails:    text('insurance_details'),
  accessories:         jsonb('accessories').default([]),
  assetPhotos:         jsonb('asset_photos').default([]),
  purchaseInvoiceUrl:  varchar('purchase_invoice_url', { length: 500 }),
  warrantyCardUrl:     varchar('warranty_card_url', { length: 500 }),
  assignmentFormUrl:   varchar('assignment_form_url', { length: 500 }),
  assetStatus:         varchar('asset_status', { length: 50 }).notNull().default('1'),
  returnDate:          date('return_date'),
  returnCondition:     varchar('return_condition', { length: 20 }),
  damageRemarks:       text('damage_remarks'),
  deductionAmount:     numeric('deduction_amount', { precision: 12, scale: 2 }),
  remarks:             text('remarks'),
  createdAt:           timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:           timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type EmployeeAsset = typeof employeeAssets.$inferSelect;
export type NewEmployeeAsset = typeof employeeAssets.$inferInsert;
