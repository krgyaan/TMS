import {
  pgTable,
  bigserial,
  varchar,
  text,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const loanParties = pgTable('loan_parties', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  status: boolean('status').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type LoanParty = typeof loanParties.$inferSelect;
export type NewLoanParty = typeof loanParties.$inferInsert;
