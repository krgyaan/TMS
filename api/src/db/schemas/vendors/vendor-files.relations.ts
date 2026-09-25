import { relations } from 'drizzle-orm';
import { vendorFiles } from './vendor-files.schema';
import { vendorOrganizations } from './vendor-organizations.schema';

export const vendorFilesRelations = relations(vendorFiles, ({ one }) => ({
  organization: one(vendorOrganizations, {
    fields: [vendorFiles.orgId],
    references: [vendorOrganizations.id],
  }),
}));
