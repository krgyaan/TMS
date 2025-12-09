import {
  pgTable,
  bigserial,
  varchar,
  boolean,
  timestamp,
  bigint,
} from 'drizzle-orm/pg-core';
import { teams } from '@db/schemas/master/teams.schema';
import { itemHeadings } from '@db/schemas/master/item-headings.schema';

export const items = pgTable('items', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  teamId: bigint('team_id', { mode: 'number' }).references(() => teams.id),
  headingId: bigint('heading_id', { mode: 'number' }).references(
    () => itemHeadings.id,
  ),
  status: boolean('status').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Item = typeof items.$inferSelect;
export type NewItem = typeof items.$inferInsert;
