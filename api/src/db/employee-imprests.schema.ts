// api/src/db/schema/employee-imprest.ts

import {
  pgTable,
  serial,
  varchar,
  integer,
  text,
  jsonb,
  timestamp,
} from 'drizzle-orm/pg-core';

import { InferSelectModel, InferInsertModel } from 'drizzle-orm';

export const employee_imprests = pgTable('employee_imprests', {
  id: serial('id').primaryKey(),

  name_id: integer('name_id').notNull(),

  party_name: varchar('party_name', { length: 255 }),
  project_name: varchar('project_name', { length: 255 }),

  amount: integer('amount').notNull(),

  category: varchar('category', { length: 255 }),

  team_id: integer('team_id'),

  remark: text('remark'),

  invoice_proof: jsonb('invoice_proof').notNull().default([]),

  approval_status: integer('approval_status').notNull().default(0),
  tally_status: integer('tally_status').notNull().default(0),
  proof_status: integer('proof_status').notNull().default(0),

  status: integer('status').notNull().default(1),

  approved_date: timestamp('approved_date', { withTimezone: true }),

  ip: varchar('ip', { length: 100 }),

  strtotime: integer('strtotime'),

  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),

  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type EmployeeImprest = InferSelectModel<typeof employee_imprests>;
export type NewEmployeeImprest = InferInsertModel<typeof employee_imprests>;
