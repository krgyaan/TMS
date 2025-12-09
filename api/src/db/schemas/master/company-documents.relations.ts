import { relations } from 'drizzle-orm';
import { companyDocuments } from '@db/schemas/master/company-documents.schema';
import { companies } from '@db/schemas/master/companies.schema';

export const companyDocumentsRelations = relations(companyDocuments, ({ one }) => ({
  company: one(companies, {
    fields: [companyDocuments.companyId],
    references: [companies.id],
  }),
}));
