import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  integer,
  numeric,
  boolean,
  date,
  timestamp,
  text,
  jsonb,
} from 'drizzle-orm/pg-core';

//
// ==============================
// 1. ONBOARDING REQUESTS
// ==============================
//

export const onboardingRequests = pgTable('hrms_onboarding_requests', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),

  status: varchar('status', { length: 50 }).notNull().default('pending'),

  profileStatus: varchar('profile_status', { length: 50 }).default('pending'),
  documentStatus: varchar('document_status', { length: 50 }).default('pending'),
  inductionStatus: varchar('induction_status', { length: 50 }).default('pending'),

  progress: integer('progress').default(0),

  approvedBy: bigint('approved_by', { mode: 'number' }),
  approvedAt: timestamp('approved_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OnboardingRequest = typeof onboardingRequests.$inferSelect;
export type NewOnboardingRequest = typeof onboardingRequests.$inferInsert;

//
// ==============================
// 2. ONBOARDING PROFILES
// ==============================
//

export const onboardingProfiles = pgTable('hrms_onboarding_profiles', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  onboardingId: bigint('onboarding_id', { mode: 'number' }).notNull(),

  // PERSONAL DETAILS
  firstName: varchar('first_name', { length: 255 }),
  middleName: varchar('middle_name', { length: 255 }),
  lastName: varchar('last_name', { length: 255 }),
  dob: date('dob'),
  gender: varchar('gender', { length: 20 }),
  maritalStatus: varchar('marital_status', { length: 20 }),
  nationality: varchar('nationality', { length: 100 }),

  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 20 }),

  aadharNumber: varchar('aadhar_number', { length: 20 }),
  panNumber: varchar('pan_number', { length: 20 }),

  currentAddress: jsonb('current_address').default({}),
  permanentAddress: jsonb('permanent_address').default({}),
  emergencyContact: jsonb('emergency_contact').default({}),

  // HR DETAILS
  employeeType: varchar('employee_type', { length: 50 }),
  designationId: bigint('designation_id', { mode: 'number' }),
  departmentId: bigint('department_id', { mode: 'number' }),
  reportingManagerId: bigint('reporting_manager_id', { mode: 'number' }),

  workLocation: varchar('work_location', { length: 255 }),
  dateOfJoining: date('date_of_joining'),

  probationMonths: integer('probation_months'),
  probationEndDate: date('probation_end_date'),

  // COMPENSATION
  salaryType: varchar('salary_type', { length: 20 }),
  basicSalary: numeric('basic_salary', { precision: 12, scale: 2 }),

  // BANK DETAILS
  bankName: varchar('bank_name', { length: 255 }),
  accountNumber: varchar('account_number', { length: 50 }),
  ifscCode: varchar('ifsc_code', { length: 20 }),

  // COMPLETION FLAGS
  hrCompleted: boolean('hr_completed').default(false),
  employeeCompleted: boolean('employee_completed').default(false),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OnboardingProfile = typeof onboardingProfiles.$inferSelect;
export type NewOnboardingProfile = typeof onboardingProfiles.$inferInsert;

//
// ==============================
// 3. ONBOARDING DOCUMENTS
// ==============================
//

export const onboardingDocuments = pgTable('hrms_onboarding_documents', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  onboardingId: bigint('onboarding_id', { mode: 'number' }).notNull(),

  docCategory: varchar('doc_category', { length: 50 }),
  docType: varchar('doc_type', { length: 100 }),

  docNumber: varchar('doc_number', { length: 100 }),
  fileUrl: varchar('file_url', { length: 500 }).notNull(),

  issueDate: date('issue_date'),
  expiryDate: date('expiry_date'),

  status: varchar('status', { length: 50 }).default('pending'),

  verifiedBy: bigint('verified_by', { mode: 'number' }),
  verificationDate: date('verification_date'),
  remarks: text('remarks'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OnboardingDocument = typeof onboardingDocuments.$inferSelect;
export type NewOnboardingDocument = typeof onboardingDocuments.$inferInsert;

//
// ==============================
// 4. ONBOARDING INDUCTION
// ==============================
//

export const onboardingInduction = pgTable('hrms_onboarding_induction', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  onboardingId: bigint('onboarding_id', { mode: 'number' }).notNull(),

  taskName: varchar('task_name', { length: 255 }),
  taskType: varchar('task_type', { length: 50 }), // BEFORE / AFTER

  assignedTo: bigint('assigned_to', { mode: 'number' }),

  status: varchar('status', { length: 50 }).default('pending'),

  completedAt: timestamp('completed_at', { withTimezone: true }),
  remarks: text('remarks'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OnboardingInduction = typeof onboardingInduction.$inferSelect;
export type NewOnboardingInduction = typeof onboardingInduction.$inferInsert;

//
// ==============================
// 5. ONBOARDING ACTIVITY LOGS
// ==============================
//

export const onboardingActivityLogs = pgTable('hrms_onboarding_logs', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),

  onboardingId: bigint('onboarding_id', { mode: 'number' }).notNull(),

  action: varchar('action', { length: 100 }).notNull(),
  performedBy: bigint('performed_by', { mode: 'number' }),

  metadata: jsonb('metadata').default({}),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export type OnboardingActivityLog = typeof onboardingActivityLogs.$inferSelect;
export type NewOnboardingActivityLog = typeof onboardingActivityLogs.$inferInsert;