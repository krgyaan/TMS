import { relations } from 'drizzle-orm';
import { vendorGsts } from './vendor-gsts.schema';
import { vendorOrganizations } from './vendor-organizations.schema';

export const vendorGstsRelations = relations(vendorGsts, ({ one }) => ({
  organization: one(vendorOrganizations, {
    fields: [vendorGsts.org],
    references: [vendorOrganizations.id],
  }),
}));
