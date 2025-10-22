import {
  pgTable,
  bigserial,
  varchar,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const designations = pgTable('designations', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Designation = typeof designations.$inferSelect;
export type NewDesignation = typeof designations.$inferInsert;
