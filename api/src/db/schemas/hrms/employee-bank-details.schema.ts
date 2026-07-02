import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  boolean,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const employeeBankDetails = pgTable('hrms_employee_bank_details', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull(),

  bankName: varchar('bank_name', { length: 255 }).notNull(),
  accountHolderName: varchar('account_holder_name', { length: 255 }).notNull(),
  accountNumber: varchar('account_number', { length: 50 }).notNull(),
  ifscCode: varchar('ifsc_code', { length: 20 }).notNull(),
  branchName: varchar('branch_name', { length: 255 }),
  branchAddress: text('branch_address'),
  upiId: varchar('upi_id', { length: 100 }),
  isPrimary: boolean('is_primary').default(false),

  status: varchar('status', { length: 50 }).default('active'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type EmployeeBankDetail = typeof employeeBankDetails.$inferSelect;
export type NewEmployeeBankDetail = typeof employeeBankDetails.$inferInsert;
