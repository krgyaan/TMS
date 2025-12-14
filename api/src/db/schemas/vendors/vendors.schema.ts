import {
  pgTable,
  bigserial,
  varchar,
  boolean,
  timestamp,
  text,
  bigint,
} from 'drizzle-orm/pg-core';
import { vendorOrganizations } from './vendor-organizations.schema';

export const vendors = pgTable('vendors', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  organizationId: bigint('organization_id', { mode: 'number' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  status: boolean('status').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type Vendor = typeof vendors.$inferSelect;
export type NewVendor = typeof vendors.$inferInsert;
