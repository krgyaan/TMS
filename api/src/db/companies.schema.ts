import { pgTable, bigserial, varchar, text, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const companies = pgTable('companies', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  entityType: varchar('entity_type', { length: 100 }).notNull(),
  registeredAddress: text('registered_address').notNull(),
  branchAddresses: jsonb('branch_addresses').$type<string[]>().notNull(),
  about: text('about'),
  website: varchar('website', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  fax: varchar('fax', { length: 50 }),
  signatoryName: varchar('signatory_name', { length: 255 }),
  designation: varchar('designation', { length: 255 }),
  tenderKeywords: jsonb('tender_keywords').$type<string[]>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type Company = typeof companies.$inferSelect;
export type NewCompany = typeof companies.$inferInsert;
