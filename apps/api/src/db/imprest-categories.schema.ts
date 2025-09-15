import { pgTable, bigserial, varchar, boolean, timestamp } from 'drizzle-orm/pg-core';

export const imprestCategories = pgTable('imprest_categories', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  heading: varchar('heading', { length: 100 }),
  status: boolean('status').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type ImprestCategory = typeof imprestCategories.$inferSelect;
export type NewImprestCategory = typeof imprestCategories.$inferInsert;

