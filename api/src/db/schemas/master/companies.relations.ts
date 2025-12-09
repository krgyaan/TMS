import { relations } from 'drizzle-orm';
import { companies } from '@db/schemas/master/companies.schema';
import { companyDocuments } from '@db/schemas/master/company-documents.schema';

export const companiesRelations = relations(companies, ({ many }) => ({
  companyDocuments: many(companyDocuments),
}));
