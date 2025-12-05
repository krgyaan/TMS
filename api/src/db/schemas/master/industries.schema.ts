import {
  pgTable,
  bigserial,
  varchar,
  text,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const industries = pgTable('industries', {
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

export type Industry = typeof industries.$inferSelect;
export type NewIndustry = typeof industries.$inferInsert;
