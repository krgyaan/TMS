import {
    pgTable,
    bigserial,
    varchar,
    boolean,
    timestamp,
} from 'drizzle-orm/pg-core';

export const websites = pgTable('websites', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    url: varchar('url', { length: 255 }),
    status: boolean('status').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type Website = typeof websites.$inferSelect;
export type NewWebsite = typeof websites.$inferInsert;
