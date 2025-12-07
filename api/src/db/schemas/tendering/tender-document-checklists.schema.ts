import {
    pgTable,
    bigserial,
    integer,
    jsonb,
    bigint,
    timestamp,
} from 'drizzle-orm/pg-core';
import { tenderInfos } from '@db/schemas/tendering/tenders.schema';
import { users } from '@db/schemas/auth/users.schema';

export const tenderDocumentChecklists = pgTable('tender_document_checklists', {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    tenderId: integer('tender_id').notNull().unique().references(() => tenderInfos.id, { onDelete: 'cascade' }),
    selectedDocuments: jsonb('selected_documents').$type<string[]>(), // ["PAN & GST", "MSME", "Cancelled Cheque"]
    extraDocuments: jsonb('extra_documents').$type<{ name: string; path: string }[]>(), // [{ name: "file1.pdf", path: "/uploads/..." }]
    submittedBy: bigint('submitted_by', { mode: 'number' }).references(() => users.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type TenderDocumentChecklist = typeof tenderDocumentChecklists.$inferSelect;
export type InsertTenderDocumentChecklist = typeof tenderDocumentChecklists.$inferInsert;

// TypeScript types for JSON fields
export type SelectedDocuments = string[];
export type ExtraDocument = {
    name: string;
    path: string;
};
export type ExtraDocuments = ExtraDocument[];
