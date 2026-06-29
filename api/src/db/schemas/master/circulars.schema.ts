import {
  pgTable,
  bigserial,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const circulars = pgTable('circulars', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  file: varchar('file', { length: 255 }).notNull(),
  status: boolean('status').notNull().default(true),
  valid_from: timestamp('valid_from', { withTimezone: true }).notNull(),
  expires_on: timestamp('expires_on', { withTimezone: true }).notNull(),
  uploaded_by: varchar('uploaded_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Circular = typeof circulars.$inferSelect;
export type NewCircular = typeof circulars.$inferInsert;
