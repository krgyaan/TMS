import { pgTable, bigserial, varchar, integer, timestamp, bigint } from 'drizzle-orm/pg-core';
import { users } from '../auth/users.schema';

export const employeeEducation = pgTable('hrms_employee_education', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  userId: bigint('user_id', { mode: 'number' }).notNull().references(() => users.id),

  degree: varchar('degree', { length: 255 }).notNull(),
  institution: varchar('institution', { length: 255 }).notNull(),
  fieldOfStudy: varchar('field_of_study', { length: 255 }),
  yearOfCompletion: integer('year_of_completion').notNull(),
  grade: varchar('grade', { length: 50 }),
  
  status: varchar('status', { length: 50 }).default('verified'),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type EmployeeEducation = typeof employeeEducation.$inferSelect;
export type NewEmployeeEducation = typeof employeeEducation.$inferInsert;
