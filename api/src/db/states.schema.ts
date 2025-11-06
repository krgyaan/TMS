import {
    pgTable,
    bigserial,
    varchar,
    boolean,
    timestamp,
  } from 'drizzle-orm/pg-core';

  export const states = pgTable('states', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 255 }),
    status: boolean('status').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  });

  export type State = typeof states.$inferSelect;
  export type NewState = typeof states.$inferInsert;
