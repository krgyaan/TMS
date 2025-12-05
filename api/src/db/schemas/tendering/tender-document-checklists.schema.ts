import {
    pgTable,
    bigserial,
    bigint,
    varchar,
    timestamp,
} from 'drizzle-orm/pg-core';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';

export const tenderDocumentChecklists = pgTable('tender_document_checklists', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenderId: bigint('tender_id', { mode: 'number' }).notNull().references(() => tenderInfos.id, { onDelete: 'cascade' }),
    documentName: varchar('document_name', { length: 255 }),
    documentPath: varchar('document_path', { length: 500 }),
    submittedBy: bigint('submitted_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TenderDocumentChecklist = typeof tenderDocumentChecklists.$inferSelect;
export type InsertTenderDocumentChecklist = typeof tenderDocumentChecklists.$inferInsert;
