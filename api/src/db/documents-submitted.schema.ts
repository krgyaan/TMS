import {
  pgTable,
  bigserial,
  varchar,
  boolean,
  timestamp,
} from 'drizzle-orm/pg-core';

export const documentsSubmitted = pgTable('documents_submitted', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
  status: boolean('status').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type DocumentSubmitted = typeof documentsSubmitted.$inferSelect;
export type NewDocumentSubmitted = typeof documentsSubmitted.$inferInsert;
