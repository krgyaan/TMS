import { pgTable, bigserial, bigint, text, timestamp, varchar, jsonb } from 'drizzle-orm/pg-core';

export const submitQueries = pgTable('submit_queries', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  tenderId: bigint('tender_id', { mode: 'number' }).notNull(),
  clientContacts: jsonb('client_contacts'),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

export const submitQueriesLists = pgTable('submit_queries_lists', {
  id: bigserial('id', { mode: 'bigint' }).primaryKey(),
  submitQueriesId: bigint('submit_queries_id', { mode: 'bigint' })
    .notNull()
    .references(() => submitQueries.id),
  pageNo: varchar('page_no', { length: 20 }).notNull(),
  clauseNo: varchar('clause_no', { length: 20 }).notNull(),
  queryType: varchar('query_type', { length: 100 }).notNull(),
  currentStatement: text('current_statement').notNull(),
  requestedStatement: text('requested_statement').notNull(),
  createdAt: timestamp('created_at'),
  updatedAt: timestamp('updated_at'),
});

export type SubmitQuery = typeof submitQueries.$inferSelect;
export type NewSubmitQuery = typeof submitQueries.$inferInsert;
export type SubmitQueryList = typeof submitQueriesLists.$inferSelect;
export type NewSubmitQueryList = typeof submitQueriesLists.$inferInsert;
