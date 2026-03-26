import {
  pgTable, bigserial, bigint, varchar,
  integer, numeric, boolean, date, timestamp
} from 'drizzle-orm/pg-core';

export const employeeProfiles = pgTable('hrms_employee_profiles', {
  id:                    bigserial('id', { mode: 'number' }).primaryKey(),
  userId:                bigint('user_id', { mode: 'number' }).notNull().unique(),
  employeeType:          varchar('employee_type', { length: 50 }).notNull().default('full_time'),
  employeeStatus:        varchar('employee_status', { length: 50 }).notNull().default('active'),
  workLocation:          varchar('work_location', { length: 255 }),
  officialEmail:         varchar('official_email', { length: 255 }),
  reportingManagerId:    bigint('reporting_manager_id', { mode: 'number' }),
  probationMonths:       integer('probation_months'),
  probationEndDate:      date('probation_end_date'),
  salaryType:            varchar('salary_type', { length: 20 }),
  basicSalary:           numeric('basic_salary', { precision: 12, scale: 2 }),
  bankName:              varchar('bank_name', { length: 255 }),
  accountHolderName:     varchar('account_holder_name', { length: 255 }),
  accountNumber:         varchar('account_number', { length: 50 }),
  ifscCode:              varchar('ifsc_code', { length: 20 }),
  branchName:            varchar('branch_name', { length: 255 }),
  uanNumber:             varchar('uan_number', { length: 50 }),
  pfNumber:              varchar('pf_number', { length: 50 }),
  esicNumber:            varchar('esic_number', { length: 50 }),
  offerLetterDate:       date('offer_letter_date'),
  joiningLetterIssued:   boolean('joining_letter_issued').default(false),
  inductionCompleted:    boolean('induction_completed').default(false),
  inductionDate:         date('induction_date'),
  idCardIssued:          boolean('id_card_issued').default(false),
  idCardIssuedDate:      date('id_card_issued_date'),
  createdAt:             timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt:             timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type EmployeeProfile = typeof employeeProfiles.$inferSelect;
export type NewEmployeeProfile = typeof employeeProfiles.$inferInsert;
