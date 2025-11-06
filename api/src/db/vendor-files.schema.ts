import {
    pgTable,
    bigserial,
    varchar,
    boolean,
    timestamp,
    bigint
  } from 'drizzle-orm/pg-core';
import { vendors } from './vendors.schema';

  export const vendorFiles = pgTable('vendor_files', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    vendorId: bigint('vendor_id', { mode: 'number' }).notNull().references(()=>vendors.id),
    name: varchar('name', { length: 255 }).notNull(),
    filePath: varchar('file_path', { length: 255 }).notNull(),
    status: boolean('status').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  });

  export type VendorFile = typeof vendorFiles.$inferSelect;
  export type NewVendorFile = typeof vendorFiles.$inferInsert;
