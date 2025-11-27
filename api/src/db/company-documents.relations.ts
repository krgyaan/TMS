import { relations } from 'drizzle-orm';
import { companyDocuments } from './company-documents.schema';
import { companies } from './companies.schema';

export const companyDocumentsRelations = relations(companyDocuments, ({ one }) => ({
  company: one(companies, {
    fields: [companyDocuments.companyId],
    references: [companies.id],
  }),
}));
