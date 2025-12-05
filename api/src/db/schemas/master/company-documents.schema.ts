import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';
import { companies } from '@db/schemas/master/companies.schema';

export const companyDocuments = pgTable('company_documents', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  companyId: bigint('company_id', { mode: 'number' })
    .notNull()
    .references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  size: bigint('size', { mode: 'number' }).default(0),
  isFolder: boolean('is_folder').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type CompanyDocument = typeof companyDocuments.$inferSelect;
export type NewCompanyDocument = typeof companyDocuments.$inferInsert;
