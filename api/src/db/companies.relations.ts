import { relations } from 'drizzle-orm';
import { companies } from './companies.schema';
import { companyDocuments } from './company-documents.schema';

export const companiesRelations = relations(companies, ({ many }) => ({
  companyDocuments: many(companyDocuments),
}));
