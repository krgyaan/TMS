import {
    pgTable,
    bigserial,
    varchar,
    boolean,
    timestamp,
    bigint,
} from 'drizzle-orm/pg-core';
import { teams } from '@db/schemas/master/teams.schema';

export const itemHeadings = pgTable('item_headings', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 100 }).notNull().unique(),
    teamId: bigint('team_id', { mode: 'number' }),
    status: boolean('status').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export type ItemHeading = typeof itemHeadings.$inferSelect;
export type NewItemHeading = typeof itemHeadings.$inferInsert;
