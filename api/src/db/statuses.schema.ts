import {
  pgTable,
  bigserial,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const statuses = pgTable('statuses', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  tenderCategory: varchar('tender_category', { length: 100 }),
  status: boolean('status').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Status = typeof statuses.$inferSelect;
export type NewStatus = typeof statuses.$inferInsert;
