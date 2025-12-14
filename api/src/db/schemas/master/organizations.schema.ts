import {
    pgTable,
    bigserial,
    varchar,
    boolean,
    timestamp,
    bigint,
} from 'drizzle-orm/pg-core';
import { industries } from '@db/schemas/master/industries.schema';

export const organizations = pgTable('organizations', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull().unique(),
    acronym: varchar('acronym', { length: 50 }),
    industryId: bigint('industry_id', { mode: 'number' }),
    status: boolean('status').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
