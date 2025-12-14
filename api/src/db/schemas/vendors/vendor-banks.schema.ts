import {
    pgTable,
    bigserial,
    varchar,
    boolean,
    timestamp,
    bigint
  } from 'drizzle-orm/pg-core';
import { vendorOrganizations } from './vendor-organizations.schema';

  export const vendorAccs = pgTable('vendor_accs', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    org: bigint('org', { mode: 'number' }).notNull(),
    accountName: varchar('account_name', { length: 255 }).notNull(),
    accountNum: varchar('account_num', { length: 255 }).notNull(),
    accountIfsc: varchar('account_ifsc', { length: 255 }).notNull(),
    status: boolean('status').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  });

  export type VendorAcc = typeof vendorAccs.$inferSelect;
  export type NewVendorAcc = typeof vendorAccs.$inferInsert;
