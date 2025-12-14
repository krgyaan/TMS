import {
    pgTable,
    bigserial,
    varchar,
    boolean,
    timestamp,
    bigint
  } from 'drizzle-orm/pg-core';
import { vendorOrganizations } from './vendor-organizations.schema';

  export const vendorGsts = pgTable('vendor_gsts', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    org: bigint('org', { mode: 'number' }).notNull(),
    gstState: varchar('gst_state', { length: 255 }).notNull(),
    gstNum: varchar('gst_num', { length: 255 }).notNull(),
    status: boolean('status').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  });

  export type VendorGst = typeof vendorGsts.$inferSelect;
  export type NewVendorGst = typeof vendorGsts.$inferInsert;
