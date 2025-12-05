import { relations } from 'drizzle-orm';
import { vendors } from '@db/schemas/vendors/vendors.schema';
import { vendorOrganizations } from '@db/schemas/vendors/vendor-organizations.schema';
import { vendorFiles } from '@db/schemas/vendors/vendor-files.schema';
import { rfqResponses } from '@db/schemas/tendering/rfqs.schema';

export const vendorsRelations = relations(vendors, ({ one, many }) => ({
    organization: one(vendorOrganizations, {
        fields: [vendors.organizationId],
        references: [vendorOrganizations.id],
    }),
    vendorFiles: many(vendorFiles),
    rfqResponses: many(rfqResponses),
}));
