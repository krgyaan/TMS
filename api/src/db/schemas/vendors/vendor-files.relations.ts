import { relations } from 'drizzle-orm';
import { vendorFiles } from './vendor-files.schema';
import { vendors } from './vendors.schema';

export const vendorFilesRelations = relations(vendorFiles, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorFiles.vendorId],
    references: [vendors.id],
  }),
}));
