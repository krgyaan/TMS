import {
  pgTable, bigserial, bigint, varchar,
  date, timestamp, text
} from 'drizzle-orm/pg-core';

export const employeeDocuments = pgTable('hrms_employee_documents', {
  id:                 bigserial('id', { mode: 'number' }).primaryKey(),
  userId:             bigint('user_id', { mode: 'number' }).notNull(),
  docCategory:        varchar('doc_category', { length: 50 }).notNull(),
  docType:            varchar('doc_type', { length: 100 }).notNull(),
  docNumber:          varchar('doc_number', { length: 100 }),
  fileUrl:            varchar('file_url', { length: 500 }).notNull(),
  issueDate:          date('issue_date'),
  expiryDate:         date('expiry_date'),
  verificationStatus: varchar('verification_status', { length: 50 }).notNull().default('pending'),
  verifiedBy:         bigint('verified_by', { mode: 'number' }),
  verificationDate:   date('verification_date'),
  remarks:            text('remarks'),
  createdAt:          timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:          timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type EmployeeDocument = typeof employeeDocuments.$inferSelect;
export type NewEmployeeDocument = typeof employeeDocuments.$inferInsert;
