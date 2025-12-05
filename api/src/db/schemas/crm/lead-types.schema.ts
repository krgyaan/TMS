import {
    pgTable,
    bigserial,
    varchar,
    boolean,
    timestamp,
  } from 'drizzle-orm/pg-core';

  export const leadTypes = pgTable('lead_types', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 255 }),
    status: boolean('status').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  });

  export type LeadType = typeof leadTypes.$inferSelect;
  export type NewLeadType = typeof leadTypes.$inferInsert;
