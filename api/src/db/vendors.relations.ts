import { relations } from 'drizzle-orm';
import { vendors } from './vendors.schema';
import { vendorOrganizations } from './vendor-organizations.schema';
import { vendorFiles } from './vendor-files.schema';
import { rfqResponses } from './rfqs.schema';

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
  organization: one(vendorOrganizations, {
    fields: [vendors.organizationId],
    references: [vendorOrganizations.id],
  }),
  vendorFiles: many(vendorFiles),
  rfqResponses: many(rfqResponses),
}));
