// src/db/schemas/hrms/asset-tracking-history.schema.ts
import {
  pgTable, bigserial, bigint, varchar,
  numeric, date, timestamp, text
} from 'drizzle-orm/pg-core';
import { employeeAssets } from './employee-assets.schema';

export const assetTrackingHistory = pgTable('hrms_asset_tracking_history', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  assetId: bigint('asset_id', { mode: 'number' }).notNull().references(() => employeeAssets.id, { onDelete: 'cascade' }),
  
  // Status tracking
  previousStatus: varchar('previous_status', { length: 50 }),
  newStatus: varchar('new_status', { length: 50 }).notNull(),
  actionType: varchar('action_type', { length: 50 }).notNull(),
  
  // Assignment details
  assignedToUserId: bigint('assigned_to_user_id', { mode: 'number' }),
  assignedByUserId: bigint('assigned_by_user_id', { mode: 'number' }),
  assignedDate: date('assigned_date'),
  expectedReturnDate: date('expected_return_date'),
  purpose: text('purpose'),
  assetLocation: varchar('asset_location', { length: 255 }),
  
  // Return details
  returnDate: date('return_date'),
  returnCondition: varchar('return_condition', { length: 20 }),
  
  // Damage details
  damageDate: date('damage_date'),
  damageType: varchar('damage_type', { length: 100 }),
  damageDescription: text('damage_description'),
  isRepairable: varchar('is_repairable', { length: 10 }),
  
  // Loss details
  lostDate: date('lost_date'),
  lostLocation: varchar('lost_location', { length: 255 }),
  lostCircumstances: text('lost_circumstances'),
  policeReportNumber: varchar('police_report_number', { length: 100 }),
  policeReportDate: date('police_report_date'),
  
  // Repair details
  repairStartDate: date('repair_start_date'),
  repairEndDate: date('repair_end_date'),
  repairEstimatedCost: numeric('repair_estimated_cost', { precision: 12, scale: 2 }),
  repairActualCost: numeric('repair_actual_cost', { precision: 12, scale: 2 }),
  repairVendor: varchar('repair_vendor', { length: 255 }),
  repairDescription: text('repair_description'),
  
  // Financial
  deductionAmount: numeric('deduction_amount', { precision: 12, scale: 2 }),
  deductionReason: text('deduction_reason'),
  assetConditionAfter: varchar('asset_condition_after', { length: 20 }),
  
  // General
  remarks: text('remarks'),
  changedByUserId: bigint('changed_by_user_id', { mode: 'number' }),
  
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type AssetTrackingHistory = typeof assetTrackingHistory.$inferSelect;
export type NewAssetTrackingHistory = typeof assetTrackingHistory.$inferInsert;