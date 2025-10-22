import {
  pgTable,
  bigserial,
  varchar,
  bigint,
  timestamp,
} from 'drizzle-orm/pg-core';

export const teams = pgTable('teams', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  parentId: bigint('parent_id', { mode: 'number' }).references(() => teams.id),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
