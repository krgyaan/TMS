import { pgTable, bigserial, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

export const tqTypes = pgTable('tq_types', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  status: boolean('status').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TqType = typeof tqTypes.$inferSelect;
export type NewTqType = typeof tqTypes.$inferInsert;

