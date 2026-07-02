import { pgTable, bigserial, varchar, timestamp, bigint, date, boolean, text } from 'drizzle-orm/pg-core';
import { users } from '../auth/users.schema';

export const employeeExperience = pgTable('hrms_employee_experience', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),

  companyName: varchar('company_name', { length: 255 }),
  designation: varchar('designation', { length: 255 }),
  fromDate: date('from_date'),
  toDate: date('to_date'),
  currentlyWorking: boolean('currently_working').default(false),
  responsibilities: text('responsibilities'),

  status: varchar('status', { length: 50 }).default('verified'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type EmployeeExperience = typeof employeeExperience.$inferSelect;
export type NewEmployeeExperience = typeof employeeExperience.$inferInsert;
