import {
    pgTable,
    bigserial,
    integer,
    varchar,
    bigint,
    timestamp,
} from 'drizzle-orm/pg-core';
export const physicalDocs = pgTable('physical_docs', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenderId: integer("tender_id").notNull(),
    courierNo: integer("courier_no").notNull(),
    submittedDocs: varchar("submitted_docs", { length: 2000 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const physicalDocsPersons = pgTable('physical_docs_persons', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    physicalDocId: bigint('physical_doc_id', { mode: 'number' }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export type PhysicalDocs = typeof physicalDocs.$inferSelect;
export type NewPhysicalDocs = typeof physicalDocs.$inferInsert;

export type PhysicalDocsPersons = typeof physicalDocsPersons.$inferSelect;
export type NewPhysicalDocsPersons = typeof physicalDocsPersons.$inferInsert;
